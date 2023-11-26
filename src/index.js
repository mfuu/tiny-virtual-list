import { on, off, debounce, throttle } from './utils';

const SCROLL_DIRECTION = {
  FORWARD: 'forward',
  BACKWARD: 'backward',
};

const DIRECTION = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
};

const offsetSize = {
  [DIRECTION.VERTICAL]: 'scrollTop',
  [DIRECTION.HORIZONTAL]: 'scrollLeft',
};

const scrollSize = {
  [DIRECTION.VERTICAL]: 'scrollHeight',
  [DIRECTION.HORIZONTAL]: 'scrollWidth',
};

const elementSize = {
  [DIRECTION.VERTICAL]: 'offsetHeight',
  [DIRECTION.HORIZONTAL]: 'offsetWidth',
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
  this.range = { start: 0, end: 0, front: 0, behind: 0, total: 0 };
  this.offset = 0;
  this.lastStart = 0;
  this.averageSize = 0;
  this.scrollDirection = '';

  this._updateOnScrollFunction();

  // Bind all private methods
  for (let fn in this) {
    if (fn.charAt(0) === '_' && typeof this[fn] === 'function') {
      this[fn] = this[fn].bind(this);
    }
  }

  this.scrollEl = this._getScrollElement(this.options.scroller);
  on(this.options.scroller, 'scroll', this._onScroll);

  this._onCreate();
}

Virtual.prototype = {
  constructor: Virtual,

  // ========================================= Public Methods =========================================
  destroy() {
    off(this.options.scroller, 'scroll', this._onScroll);

    this.sizes = this.range = this.offset = this.lastStart = this.averageSize = null;
  },

  refresh() {
    this.averageSize > 1 ? this._onRefresh() : this._onCreate();
  },

  option(key, value) {
    if (value === void 0) return this.options[key];

    let oldValue = this.options[key];
    this.options[key] = value;

    if (key === 'itemCount') {
      this._onCreate();
    } else if (key === 'scroller') {
      off(oldValue, 'scroll', this._onScroll);
      this.scrollEl = this._getScrollElement(value);
      on(value, 'scroll', this._onScroll);
    } else if (key === 'throttleTime' || key === 'debounceTime') {
      this._updateOnScrollFunction();
    }
  },

  getSize(index) {
    return this.sizes[index] || this.averageSize;
  },

  getOffset() {
    return this.scrollEl[offsetSize[this.options.direction]];
  },

  getScrollSize() {
    return this.scrollEl[scrollSize[this.options.direction]];
  },

  getClientSize() {
    return this.scrollEl[elementSize[this.options.direction]];
  },

  scrollToOffset(offset) {
    this.scrollEl[offsetSize[this.options.direction]] = offset;
  },

  scrollToIndex(index) {
    if (index > this._getLength()) {
      this.scrollToBottom();
    } else {
      const offset = this._getOffsetByRange(0, index);
      this.scrollToOffset(offset + this.options.ignoreSize);
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
    if (this.options.debounceTime) {
      this._onScroll = debounce(() => this._onRefresh(), this.options.debounceTime);
    } else if (this.options.throttleTime) {
      this._onScroll = throttle(() => this._onRefresh(), this.options.throttleTime);
    } else {
      this._onScroll = () => this._onRefresh();
    }
  },

  _onCreate: function () {
    // not available in the case of `display: none` in window scroll
    if (!this._contentVisible()) return;

    const items = this._getRenderingItems();
    if (!items.length) return;

    const clientSize = this.getClientSize();
    const scrollOffset = this.getOffset();
    const realScrollOffset = Math.abs(scrollOffset - this.options.ignoreSize);

    let end = this.range.start;
    let renderingSize = Math.max(0, this.range.front - realScrollOffset);

    while (renderingSize < clientSize && end < this.options.itemCount) {
      const item = items[end - this.range.start];

      // jump out of the loop when the number of first renderings cannot fill the container
      if (!item) break;

      const dataIndex = this._getItemIndex(item);
      const itemSize = this._getItemSize(item);

      this.sizes[dataIndex] = itemSize;
      renderingSize += itemSize;
      end += 1;
    }

    this.averageSize = Math.round((this.range.front + renderingSize) / end);
    this.sizes.length = this.options.itemCount;
    end = Math.min(this._getLength(), end + 1);

    this._updateRange({ ...this.range, end });
  },

  _onRefresh: function () {
    if (this.averageSize < 1) {
      this._onCreate();
      return;
    }

    // not available in the case of `display: none` in window scroll
    if (!this._contentVisible()) return;

    const scrollOffset = this.getOffset();
    const clientSize = this.getClientSize();
    const scrollSize = this.getScrollSize();

    if (scrollOffset < this.offset - 1) {
      this.scrollDirection = SCROLL_DIRECTION.FORWARD;
    } else if (scrollOffset > this.offset + 1) {
      this.scrollDirection = SCROLL_DIRECTION.BACKWARD;
    } else {
      this.scrollDirection = '';
    }

    this.offset = scrollOffset;

    this._dispatchEvent('onScroll', {
      top: !!this.options.itemCount && scrollOffset <= 0,
      bottom: clientSize + scrollOffset + 1 >= scrollSize,
      offset: scrollOffset,
      direction: this.scrollDirection,
    });

    // stop the calculation when scrolling front and start is `0`
    // or when scrolling behind and end is maximum length
    if (
      !this.scrollDirection ||
      (this.scrollDirection === SCROLL_DIRECTION.FORWARD && this.range.start === 0) ||
      (this.scrollDirection === SCROLL_DIRECTION.BACKWARD && this.range.end === this._getLength())
    ) {
      return;
    }

    this._onUpdate();
  },

  _onUpdate: function () {
    const items = this._getRenderingItems();

    for (let i = 0; i < items.length; i += 1) {
      const index = this._getItemIndex(items[i]);
      if (index) this.sizes[index] = this._getItemSize(items[i]);
    }

    this.lastStart = this.range.start;

    let { start, front, end } = this._getRangeByOffset();

    if (start === this.range.start && end === this.range.end) return;

    this._updateRange({ start, end, front });
  },

  _updateRange: function ({ start, end, front }) {
    const behind = (this._getLength() - end) * this.averageSize;
    const renderingSize = this._getOffsetByRange(start, end);

    this.range.start = start;
    this.range.front = front;
    this.range.end = end;
    this.range.behind = behind;
    this.range.total = Math.max(this.range.total, front + renderingSize + behind);

    this._dispatchEvent('onUpdate', { ...this.range });
  },

  _getRangeByOffset: function () {
    const { itemCount, ignoreSize } = this.options;
    const clientSize = this.getClientSize();
    const realScrollOffset = this.offset - ignoreSize;

    let start = 0;
    let front = 0;
    let end = 0;
    let offset = 0;

    while (end < itemCount) {
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
    while (end < itemCount) {
      offset += this.getSize(end);
      end += 1;
      if (offset - front > clientSize) break;
    }

    this.averageSize = Math.round(offset / end);
    end = Math.min(this._getLength(), end + 1);

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

  _getLength: function () {
    return Math.max(0, this.options.itemCount - 1);
  },

  _getItemSize: function (element) {
    return element ? element[elementSize[this.options.direction]] : this.averageSize;
  },

  _getItemIndex: function (element) {
    return element?.getAttribute(this.options.dataIndex) || null;
  },

  _getScrollElement: function (scroller) {
    return (scroller instanceof Document && scroller.nodeType === 9) || scroller instanceof Window
      ? document.scrollingElement || document.documentElement || document.body
      : scroller;
  },

  _getRenderingItems: function () {
    return Array.prototype.slice.call(this.el.children);
  },

  _contentVisible: function () {
    return this.el.offsetHeight > 0 && this.el.offsetWidth > 0;
  },

  _dispatchEvent: function (event, params) {
    const callback = this.options[event];
    if (typeof callback === 'function') {
      callback(params);
    }
  },
};

export default Virtual;
