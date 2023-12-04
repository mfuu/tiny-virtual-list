import { on, off, debounce, throttle } from './utils';

const SCROLL_DIRECTION = {
  FORWARD: 'forward',
  BACKWARD: 'backward',
};

const DIRECTION = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
};

const scrollType = {
  [DIRECTION.VERTICAL]: 'scrollTop',
  [DIRECTION.HORIZONTAL]: 'scrollLeft',
};

const scrollSize = {
  [DIRECTION.VERTICAL]: 'scrollHeight',
  [DIRECTION.HORIZONTAL]: 'scrollWidth',
};

const offsetSize = {
  [DIRECTION.VERTICAL]: 'offsetHeight',
  [DIRECTION.HORIZONTAL]: 'offsetWidth',
};

const offsetType = {
  [DIRECTION.VERTICAL]: 'offsetTop',
  [DIRECTION.HORIZONTAL]: 'offsetLeft',
};

/**
 * @class Virtual
 * @param {HTMLElement} el container
 * @param {Object} options
 */
function Virtual(el, options) {
  if (!(el && el.nodeType && el.nodeType === 1)) {
    throw `Virtual: \`el\` must be an HTMLElement, not ${{}.toString.call(el)}`;
  }

  this.el = el;
  this.options = options = Object.assign({}, options);

  const defaults = {
    scroller: null,
    itemCount: 0,
    direction: 'vertical',
    dataIndex: 'data-index',
    ignoreSize: 0,
    debounceTime: null,
    throttleTime: null,
  };

  // Set default options
  for (const name in defaults) {
    !(name in this.options) && (this.options[name] = defaults[name]);
  }

  this.sizes = [];
  this.range = { start: 0, end: 0, front: 0, behind: 0 };
  this.offset = 0;
  this.averageSize = 0;
  this.scrollDirection = '';
  this.useWindowScroll = null;

  this._updateOnScrollFunction();
  this._addScrollEventListener();
  this._updateWithoutScrolling();
}

Virtual.prototype = {
  constructor: Virtual,

  // ========================================= Public Methods =========================================
  destroy() {
    off(this.options.scroller, 'scroll', this._onScroll);

    this.sizes = this.range = this.offset = this.averageSize = this.scrollDirection = null;
  },

  refresh() {
    this._handleScroll();
  },

  option(key, value) {
    if (value === void 0) return this.options[key];

    let oldValue = this.options[key];
    this.options[key] = value;

    if (key === 'itemCount') {
      this._updateWithoutScrolling();
    } else if (key === 'scroller') {
      off(oldValue, 'scroll', this._onScroll);
      this._addScrollEventListener();
    } else if (key === 'throttleTime' || key === 'debounceTime') {
      this._updateOnScrollFunction();
    }
  },

  getSize(index) {
    return this.sizes[index] || this.averageSize;
  },

  getOffset() {
    return this.scrollEl[scrollType[this.options.direction]];
  },

  getScrollSize() {
    return this.scrollEl[scrollSize[this.options.direction]];
  },

  getClientSize() {
    return this.scrollEl[offsetSize[this.options.direction]];
  },

  scrollToOffset(offset) {
    this.scrollEl[scrollType[this.options.direction]] = offset;
  },

  scrollToIndex(index) {
    if (index > this._getLastIndex()) {
      this.scrollToBottom();
    } else {
      const offset = this._getOffsetByRange(0, index);
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

  // ========================================= Properties =========================================
  _updateOnScrollFunction: function () {
    const { debounceTime, throttleTime } = this.options;
    if (debounceTime) {
      this._onScroll = debounce(() => this._handleScroll(), debounceTime);
    } else if (throttleTime) {
      this._onScroll = throttle(() => this._handleScroll(), throttleTime);
    } else {
      this._onScroll = () => this._handleScroll();
    }

    this._onScroll = this._onScroll.bind(this);
  },

  _addScrollEventListener: function () {
    this.scrollEl = this._getScrollElement(this.options.scroller);
    on(this.options.scroller, 'scroll', this._onScroll);
  },

  _updateWithoutScrolling: function () {
    // not available in the case of `display: none` in window scroll
    if (!this._containerVisible()) return;

    const items = this._getChildren();
    if (!items.length) return;

    const clientSize = this.getClientSize();
    const realScrollOffset = Math.abs(this._getScrollOffset());

    let end = this.range.start;
    let renderingSize = Math.max(0, this.range.front - realScrollOffset);

    while (renderingSize < clientSize && end < this.options.itemCount) {
      const item = items[end - this.range.start];

      // jump out of the loop when the number of first renderings cannot fill the container
      if (!item) break;

      const index = this._getElementIndex(item);
      const size = this._getElementSize(item);

      this.sizes[index] = size;
      renderingSize += size;
      end += 1;
    }

    this.averageSize = Math.round((this.range.front + renderingSize) / end);
    this.sizes.length = this.options.itemCount;
    end = Math.min(this._getLastIndex(), end + 1);

    this._updateRange({ ...this.range, end });
  },

  _handleScroll: function () {
    // not available in the case of `display: none` in window scroll
    if (!this._containerVisible()) return;

    if (this.averageSize < 1) {
      this._updateWithoutScrolling();
      return;
    }

    const params = this._getScrollParams();

    this.scrollDirection = params.direction;

    this._dispatchEvent('onScroll', params);

    // stop the calculation when scrolling front and start is `0`
    // or when scrolling behind and end is maximum length
    if (
      !params.direction ||
      (params.direction === SCROLL_DIRECTION.FORWARD && this.range.start === 0) ||
      (params.direction === SCROLL_DIRECTION.BACKWARD && this.range.end === this._getLastIndex())
    ) {
      return;
    }

    this._onUpdate();
  },

  _getScrollParams: function () {
    const offset = this.getOffset();
    const clientSize = this.getClientSize();
    const scrollSize = this.getScrollSize();

    const isTop = !!this.options.itemCount && offset <= 0;
    const isBottom = clientSize + offset + 1 >= scrollSize;
    const direction =
      offset < this.offset - 1
        ? SCROLL_DIRECTION.FORWARD
        : offset > this.offset + 1
        ? SCROLL_DIRECTION.BACKWARD
        : '';

    this.offset = offset;

    return { top: isTop, bottom: isBottom, offset, direction };
  },

  _onUpdate: function () {
    const items = this._getChildren();

    for (let i = 0; i < items.length; i += 1) {
      const index = this._getElementIndex(items[i]);
      if (index) this.sizes[index] = this._getElementSize(items[i]);
    }

    let { start, front, end } = this._getRangeByOffset();

    if (start === this.range.start && end === this.range.end) return;

    this._updateRange({ start, end, front });
  },

  _updateRange: function ({ start, end, front }) {
    this.range.start = start;
    this.range.front = front;
    this.range.end = end;
    this.range.behind = (this._getLastIndex() - end) * this.averageSize;

    this._dispatchEvent('onUpdate', { ...this.range });
  },

  _getRangeByOffset: function () {
    const clientSize = this.getClientSize();
    const realScrollOffset = this._getScrollOffset();

    let start = 0;
    let front = 0;
    let end = 0;
    let offset = 0;

    while (end < this.options.itemCount) {
      const size = this.getSize(end);
      if (offset + size >= realScrollOffset) {
        start = end;
        front = offset;
        break;
      }
      offset += size;
      end += 1;
    }

    // calculate the end value based on the size of the visible area
    while (end < this.options.itemCount) {
      offset += this.getSize(end);
      end += 1;
      if (offset - front > clientSize) break;
    }

    this.averageSize = Math.round(offset / end);
    end = Math.min(this._getLastIndex(), end + 1);

    // when the scroller above viewable area
    if (offset < realScrollOffset) {
      start = end - Math.round(clientSize / this.averageSize);
      front = this._getOffsetByRange(0, start);
    }

    return { start, front, end };
  },

  _getOffsetByRange: function (start, end) {
    let offset = 0;
    for (let i = start; i < end; i += 1) {
      offset += this.getSize(i);
    }
    return offset;
  },

  _getChildren: function () {
    return Array.prototype.slice.call(this.el.children);
  },

  _getLastIndex: function () {
    return Math.max(0, this.options.itemCount - 1);
  },

  _getElementSize: function (element) {
    return element ? element[offsetSize[this.options.direction]] : this.averageSize;
  },

  _getElementIndex: function (element) {
    return element?.getAttribute(this.options.dataIndex) || null;
  },

  _getScrollElement: function (scroller) {
    if ((scroller instanceof Document && scroller.nodeType === 9) || scroller instanceof Window) {
      this.useWindowScroll = true;
      return document.scrollingElement || document.documentElement || document.body;
    }

    this.useWindowScroll = false;

    return scroller;
  },

  _getScrollOffset: function() {
    return this.getOffset() - this._getScrollStartOffset();
  },

  _getScrollStartOffset: function () {
    let offset = this.options.ignoreSize;
    if (this.useWindowScroll) {
      let el = this.el;
      do {
        offset += el[offsetType[this.options.direction]];
      } while ((el = el.parentNode) && el !== this.el.ownerDocument);
    }

    return offset;
  },

  _containerVisible: function () {
    return this.el.offsetHeight > 0 && this.el.offsetWidth > 0;
  },

  _dispatchEvent: function (event, params) {
    const callback = this.options[event];
    typeof callback === 'function' && callback(params);
  },
};

Virtual.utils = {
  debounce,
  throttle,
};

export default Virtual;
