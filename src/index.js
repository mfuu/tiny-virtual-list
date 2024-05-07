import { on, off, debounce, throttle } from './utils';

const observeConfig = { attributes: false, childList: true, subtree: false };

const DIRECTION = {
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
    size: 0,
    count: 0,
    buffer: 1,
    scroller: undefined,
    direction: 'vertical',
    debounceTime: 0,
    throttleTime: 0,
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

  this.refresh();
  this.updateRange();
  this.addScrollEventListener();
}

Virtual.prototype = {
  constructor: Virtual,

  destroy() {
    this.removeScrollEventListener();
    this.observer?.disconnect();
  },

  option(key, value) {
    if (value === void 0) return this.options[key];

    const oldValue = this.options[key];
    this.options[key] = value;

    if (key === 'count') {
      this._updateAfterEndSizes();
    } else if (key === 'scroller') {
      oldValue && off(oldValue, 'scroll', this._onScroll);

      this._updateScrollElement();
      this.addScrollEventListener();
    } else if (key === 'throttleTime' || key === 'debounceTime') {
      this._updateOnScrollFunction();
    }
  },

  refresh() {
    if (this._invisible()) return;

    const elements = Array.prototype.slice.call(this.el.children);
    if (!elements.length) return;

    const firstElement = elements[0];

    // size difference
    if (this.isFront()) {
      const realSize = this._getElementSize(firstElement);
      const diffSize = realSize - this.getSize(this.range.start);
      this.scrollToOffset(this.offset + diffSize);
    }

    this._updateSizes(elements);
    this._updateAfterEndSizes();
  },

  updateRange(start) {
    start = start === void 0 ? this.range.start : start;

    const end = this._getEndByStart(start);
    const total = this._getTotalSize();
    const front = this._getPosition(start, DIRECTION.FRONT);
    const behind = total - this._getPosition(end, DIRECTION.BEHIND);

    if (behind === this.range.behind) return;

    this.range.start = start;
    this.range.end = end;
    this.range.total = total;
    this.range.front = front;
    this.range.behind = behind;
    this._dispatchEvent('onUpdate', Object.assign({}, this.range));
  },

  isFront() {
    return this.scrollDirection === DIRECTION.FRONT;
  },

  isBehind() {
    return this.scrollDirection === DIRECTION.BEHIND;
  },

  getSize(index) {
    return this.sizes[index]?.size || this.options.size || this.averageSize;
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
      const offset = this._getPosition(index, DIRECTION.FRONT);
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

  addScrollEventListener() {
    this.options.scroller && on(this.options.scroller, 'scroll', this._onScroll);
  },

  removeScrollEventListener() {
    this.options.scroller && off(this.options.scroller, 'scroll', this._onScroll);
  },

  _installObserve() {
    const MutationObserver =
      window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;

    if (MutationObserver) {
      this.observer = new MutationObserver(() => this.refresh());
      this.observer.observe(this.el, observeConfig);
    }
  },

  _updateScrollElement() {
    const { scroller } = this.options;
    if ((scroller instanceof Document && scroller.nodeType === 9) || scroller instanceof Window) {
      this.scrollEl = document.scrollingElement || document.documentElement || document.body;
    } else {
      this.scrollEl = scroller;
    }
  },

  _updateOnScrollFunction() {
    const { debounceTime, throttleTime } = this.options;
    if (debounceTime) {
      this._onScroll = debounce(() => this._handleScroll(), debounceTime);
    } else if (throttleTime) {
      this._onScroll = throttle(() => this._handleScroll(), throttleTime);
    } else {
      this._onScroll = () => this._handleScroll();
    }
  },

  _handleScroll() {
    const offset = this.getOffset();
    const clientSize = this.getClientSize();
    const scrollSize = this.getScrollSize();
    const reachTop = !!this.options.count && offset <= 0;
    const reachBottom = clientSize + offset + 1 >= scrollSize;
    const direction =
      offset < this.offset ? DIRECTION.FRONT : offset > this.offset ? DIRECTION.BEHIND : '';

    this.offset = offset;
    this.scrollDirection = direction;

    this._dispatchEvent('onScroll', { top: reachTop, bottom: reachBottom, offset, direction });

    if (!direction || this._invisible() || this.options.count <= 0) return;

    // stop the calculation when scrolling front and start is `0`
    // or when scrolling behind and end is maximum length
    if (
      (this.isFront() && this.range.start === 0) ||
      (this.isBehind() && this.range.end === this._getLastIndex())
    ) {
      return;
    }

    !this.sizes.length && this.refresh();

    const realOffset = this.offset - this._getScrollStartOffset();
    let start = this._getIndexByOffset(realOffset);
    start = Math.max(0, start - this.options.buffer);

    if (
      (this.isFront() && start > this.range.start) ||
      (this.isBehind() && start < this.range.start)
    ) {
      return;
    }

    this.updateRange(start);
  },

  _updateSizes(elements) {
    let renderSize = 0;
    let end = this.range.start;
    for (let i = 0; i < elements.length; i++) {
      const size = this._getElementSize(elements[i]);

      if (!size) continue;

      const front = this._getPosition(end - 1, DIRECTION.BEHIND);
      const behind = front + size;

      this.sizes[end] = { size, front, behind };

      renderSize += size;
      end += 1;
    }

    const averageSize = renderSize / (end - this.range.start);
    this.averageSize = Math.round(
      this.averageSize ? (averageSize + this.averageSize) / 2 : averageSize
    );
  },

  _updateAfterEndSizes() {
    this.sizes.length = this.options.count;

    if (this.range.end >= this.options.count) return;

    for (let i = this.range.end + 1; i < this.options.count; i++) {
      const size = this.getSize(i);
      const front = this._getPosition(i - 1, DIRECTION.BEHIND);
      const behind = front + size;

      this.sizes[i] = { size, front, behind };
    }
  },

  _getPosition(index, type) {
    const item = this.sizes[index];
    return item ? item[type] : 0;
  },

  _getTotalSize() {
    return this._getPosition(this._getLastIndex(), DIRECTION.BEHIND);
  },

  _getLastIndex() {
    return Math.max(0, this.options.count - 1);
  },

  _getElementSize(element) {
    return Math.round(element[offsetSize[this.options.direction]]);
  },

  _getEndByStart(start) {
    const clientSize = this.getClientSize();

    let end = start;
    let offset = 0;

    const { count, buffer } = this.options;
    while (end < count) {
      offset += this.getSize(end);
      end += 1;
      if (offset > clientSize) break;
    }

    end = Math.min(this._getLastIndex(), end + buffer);

    return end;
  },

  _getIndexByOffset(offset) {
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
    return high > 0 ? high : 0;
  },

  _getScrollStartOffset() {
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

  _dispatchEvent(event, params) {
    const callback = this.options[event];
    typeof callback === 'function' && callback(params);
  },

  _invisible() {
    return this.el.offsetWidth === 0 || this.el.offsetHeight === 0;
  },
};

Virtual.utils = {
  debounce,
  throttle,
};

export default Virtual;
