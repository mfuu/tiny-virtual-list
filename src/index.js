import { on, off, debounce, throttle } from './utils';

const SCROLL_DIRECTION = {
  FRONT: 'front',
  BEHIND: 'behind',
};

const rectDir = {
  vertical: 'top',
  horizontal: 'left',
};

const scrollDir = {
  vertical: 'scrollTop',
  horizontal: 'scrollLeft',
};

const scrollSize = {
  vertical: 'scrollHeight',
  horizontal: 'scrollWidth',
};

const offsetSize = {
  vertical: 'offsetHeight',
  horizontal: 'offsetWidth',
};

function Virtual(el, options) {
  if (!(el && el.nodeType && el.nodeType === 1)) {
    throw `tiny-virtual-list: \`el\` must be an HTMLElement, not ${{}.toString.call(el)}`;
  }

  this.el = el;
  this.options = options = Object.assign({}, options);

  const defaults = {
    count: 0,
    buffer: 1,
    scroller: null,
    direction: 'vertical',
    debounceTime: null,
    throttleTime: null,
  };

  // Set default options
  for (const name in defaults) {
    !(name in this.options) && (this.options[name] = defaults[name]);
  }

  this.sizes = [];
  this.range = { start: 0, end: 0, total: 0, front: 0, behind: 0 };
  this.offset = 0;
  this.averageSize = 0;
  this.scrollDirection = '';

  this._updateScrollElement();
  this._updateOnScrollFunction();
  this._addScrollEventListener();

  this.refresh();
}

Virtual.prototype = {
  constructor: Virtual,

  option(key, value) {
    if (value === void 0) return this.options[key];

    const oldValue = this.options[key];
    this.options[key] = value;

    if (key === 'count') {
      this.refresh();
    } else if (key === 'scroller') {
      oldValue && off(oldValue, 'scroll', this._onScroll);

      this._updateScrollElement();
      this._addScrollEventListener();
    } else if (key === 'throttleTime' || key === 'debounceTime') {
      this._updateOnScrollFunction();
    }
  },

  refresh() {
    if (this.el.offsetHeight === 0 || this.el.offsetWidth === 0) return;

    const elements = Array.prototype.slice.call(this.el.children);
    if (!elements.length) return;

    const firstElement = elements[0];

    // size difference
    if (this.scrollDirection === SCROLL_DIRECTION.FRONT) {
      const realSize = this._getElementSize(firstElement);
      const diffSize = realSize - this.getSize(this.range.start);
      this.scrollToOffset(this.offset + diffSize);
    }

    let renderSize = 0;
    let index = this.range.start;
    for (let i = 0; i < elements.length; i++) {
      const size = this._getElementSize(elements[i]);

      if (!size) continue;

      const prev = this.sizes[index - 1];
      const front = prev ? prev.behind : 0;
      const behind = front + size;

      this.sizes[index] = { size, front, behind };

      renderSize += size;
      index += 1;
    }

    const averageSize = renderSize / (index - this.range.start);
    this.averageSize = Math.round(
      this.averageSize ? (averageSize + this.averageSize) / 2 : averageSize
    );

    this._updateSizes();
    this._updateRange(true);
  },

  getSize(index) {
    return this.sizes[index]?.size || this.averageSize;
  },

  getOffset() {
    return this.scrollEl[scrollDir[this.options.direction]];
  },

  getScrollSize() {
    return this.scrollEl[scrollSize[this.options.direction]];
  },

  getClientSize() {
    return this._getElementSize(this.scrollEl);
  },

  scrollToOffset(offset) {
    this.scrollEl[scrollDir[this.options.direction]] = offset;
  },

  scrollToIndex(index) {
    if (index > this._getLastIndex()) {
      this.scrollToBottom();
    } else {
      const offset = this.sizes[index]?.front || 0;
      const startOffset = this._getScrollStartOffset();
      this.scrollToOffset(offset + startOffset);
    }
  },

  scrollToBottom() {
    const offset = this.getScrollSize();
    this.scrollToOffset(offset);

    // if the bottom is not reached, execute the scroll method again
    setTimeout(() => {
      const clientSize = this.getClientSize();
      const scrollSize = this.getScrollSize();
      const scrollOffset = this.getOffset();
      if (scrollOffset + clientSize + 1 < scrollSize) {
        this.scrollToBottom();
      }
    }, 5);
  },

  _updateScrollElement: function () {
    const { scroller } = this.options;
    if ((scroller instanceof Document && scroller.nodeType === 9) || scroller instanceof Window) {
      this.scrollEl = document.scrollingElement || document.documentElement || document.body;
    } else {
      this.scrollEl = scroller;
    }
  },

  _updateOnScrollFunction: function () {
    const { debounceTime, throttleTime } = this.options;
    if (debounceTime) {
      this._onScroll = debounce(() => this._handleScroll(), debounceTime);
    } else if (throttleTime) {
      this._onScroll = throttle(() => this._handleScroll(), throttleTime);
    } else {
      this._onScroll = () => this._handleScroll();
    }
  },

  _addScrollEventListener: function () {
    this.options.scroller && on(this.options.scroller, 'scroll', this._onScroll);
  },

  _handleScroll: function () {
    const offset = this.getOffset();
    const clientSize = this.getClientSize();
    const scrollSize = this.getScrollSize();
    const reachTop = !!this.options.count && offset <= 0;
    const reachBottom = clientSize + offset + 1 >= scrollSize;
    const direction =
      offset < this.offset
        ? SCROLL_DIRECTION.FRONT
        : offset > this.offset
        ? SCROLL_DIRECTION.BEHIND
        : '';

    this.offset = offset;
    this.scrollDirection = direction;

    this._dispatchEvent('onScroll', { top: reachTop, bottom: reachBottom, offset, direction });

    // stop the calculation when scrolling front and start is `0`
    // or when scrolling behind and end is maximum length
    if (
      !direction ||
      (direction === SCROLL_DIRECTION.FRONT && this.range.start === 0) ||
      (direction === SCROLL_DIRECTION.BEHIND && this.range.end === this._getLastIndex())
    ) {
      return;
    }

    this._updateRange();
  },

  _updateRange: function (forceUpdate) {
    const clientSize = this.getClientSize();
    const realOffset = this.offset - this._getScrollStartOffset();

    let start = this._getIndexByOffset(realOffset);
    let end = start;
    let offset = 0;

    while (end < this.options.count) {
      offset += this.sizes[end].size;
      end += 1;
      if (offset > clientSize) break;
    }

    start = Math.max(0, start - this.options.buffer);
    end = Math.min(this._getLastIndex(), end + this.options.buffer);

    if (start !== this.range.start || end !== this.range.end) {
      const total = this._getTotalSize();
      const front = this.sizes[start].front;
      const behind = total - this.sizes[end].behind;

      this.range.start = start;
      this.range.end = end;
      this.range.total = total;
      this.range.front = front;
      this.range.behind = behind;
      this._dispatchEvent('onUpdate', this.range);
    }
  },

  _updateSizes: function () {
    this.sizes.length = this.options.count;

    for (let i = this.range.end + 1; i < this.options.count; i++) {
      const size = this.getSize(i);
      const prev = this.sizes[i - 1];
      const front = prev ? prev.behind : 0;
      const behind = front + size;

      this.sizes[i] = { size, front, behind };
    }
  },

  _getTotalSize: function () {
    return this.sizes[this._getLastIndex()]?.behind || 0;
  },

  _getLastIndex: function () {
    return Math.max(0, this.options.count - 1);
  },

  _getElementSize: function (element) {
    return Math.round(element[offsetSize[this.options.direction]]);
  },

  _getIndexByOffset: function (offset) {
    let low = 0;
    let high = this.sizes.length - 1;

    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const { front, behind } = this.sizes[middle];

      if (offset >= front && offset <= behind) {
        high = middle;
        break;
      } else if (offset > behind) {
        low = middle + 1;
      } else if (offset < front) {
        high = middle - 1;
      }
    }
    return Math.max(high, 0);
  },

  _getScrollStartOffset: function () {
    let offset = 0;

    const { scroller, direction } = this.options;
    if (scroller && this.el) {
      const rectKey = rectDir[direction];
      const wrapperRect = this.el.getBoundingClientRect();
      const scrollerRect = scroller === window ? {} : scroller.getBoundingClientRect();

      offset = this.offset + wrapperRect[rectKey] - (scrollerRect[rectKey] || 0);
    }

    return offset;
  },

  _dispatchEvent: function (event, params) {
    const callback = this.options[event];
    typeof callback === 'function' && callback(params);
  },
};

export default Virtual;
