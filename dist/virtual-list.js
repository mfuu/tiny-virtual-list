/*!
 * virtual-list v0.0.1
 * open source under the MIT license
 * https://github.com/mfuu/virtual-list-core#readme
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.Virtual = factory());
}(this, (function () { 'use strict';

  function ownKeys(e, r) {
    var t = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
      var o = Object.getOwnPropertySymbols(e);
      r && (o = o.filter(function (r) {
        return Object.getOwnPropertyDescriptor(e, r).enumerable;
      })), t.push.apply(t, o);
    }
    return t;
  }
  function _objectSpread2(e) {
    for (var r = 1; r < arguments.length; r++) {
      var t = null != arguments[r] ? arguments[r] : {};
      r % 2 ? ownKeys(Object(t), !0).forEach(function (r) {
        _defineProperty(e, r, t[r]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) {
        Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
      });
    }
    return e;
  }
  function _defineProperty(obj, key, value) {
    key = _toPropertyKey(key);
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }
    return obj;
  }
  function _toPrimitive(input, hint) {
    if (typeof input !== "object" || input === null) return input;
    var prim = input[Symbol.toPrimitive];
    if (prim !== undefined) {
      var res = prim.call(input, hint || "default");
      if (typeof res !== "object") return res;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return (hint === "string" ? String : Number)(input);
  }
  function _toPropertyKey(arg) {
    var key = _toPrimitive(arg, "string");
    return typeof key === "symbol" ? key : String(key);
  }

  function on(el, event, fn) {
    if (window.addEventListener) {
      el.addEventListener(event, fn, false);
    } else if (window.attachEvent) {
      el.attachEvent('on' + event, fn);
    } else {
      el['on' + event] = fn;
    }
  }
  function off(el, event, fn) {
    if (window.removeEventListener) {
      el.removeEventListener(event, fn, false);
    } else if (window.detachEvent) {
      el.detachEvent('on' + event, fn);
    } else {
      el['on' + event] = null;
    }
  }
  function throttle(fn, wait) {
    var timeout = undefined;
    var _arguments = arguments;
    var result = function result() {
      var _this = this;
      _arguments = arguments;
      if (timeout) {
        return;
      }
      if (wait <= 0) {
        fn.apply(_this, _arguments);
      } else {
        timeout = setTimeout(function () {
          timeout = undefined;
          fn.apply(_this, _arguments);
        }, wait);
      }
    };
    result['cancel'] = function () {
      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }
    };
    return result;
  }
  function debounce(fn, wait) {
    var throttled = throttle(fn, wait);
    var result = function result() {
      throttled['cancel']();
      throttled.apply(this, arguments);
    };
    result['cancel'] = function () {
      throttled['cancel']();
    };
    return result;
  }

  var SCROLL_DIRECTION = {
    FORWARD: 'forward',
    BACKWARD: 'backward'
  };
  var DIRECTION = {
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical'
  };
  var offsetSize = _defineProperty(_defineProperty({}, DIRECTION.VERTICAL, 'scrollTop'), DIRECTION.HORIZONTAL, 'scrollLeft');
  var scrollSize = _defineProperty(_defineProperty({}, DIRECTION.VERTICAL, 'scrollHeight'), DIRECTION.HORIZONTAL, 'scrollWidth');
  var elementSize = _defineProperty(_defineProperty({}, DIRECTION.VERTICAL, 'offsetHeight'), DIRECTION.HORIZONTAL, 'offsetWidth');

  /**
   * @class Virtual
   * @param {HTMLElement} el container
   * @param {Object} options
   */
  function Virtual(el, options) {
    if (!(el && el.nodeType && el.nodeType === 1)) {
      throw "Virtual: `el` must be an HTMLElement, not ".concat({}.toString.call(el));
    }
    this.el = el;
    this.options = options = Object.assign({}, options);
    var defaults = {
      scroller: null,
      itemCount: 0,
      direction: 'vertical',
      dataIndex: 'data-index',
      ignoreSize: 0,
      debounceTime: null,
      throttleTime: null
    };

    // Set default options
    for (var name in defaults) {
      !(name in this.options) && (this.options[name] = defaults[name]);
    }
    this.sizes = [];
    this.range = {
      start: 0,
      end: 0,
      front: 0,
      behind: 0,
      total: 0
    };
    this.offset = 0;
    this.lastStart = 0;
    this.averageSize = 0;
    this.scrollDirection = '';
    this._updateOnScrollFunction();

    // Bind all private methods
    for (var fn in this) {
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
    destroy: function destroy() {
      off(this.options.scroller, 'scroll', this._onScroll);
      this.sizes = this.range = this.offset = this.lastStart = this.averageSize = null;
    },
    refresh: function refresh() {
      this.averageSize > 1 ? this._onRefresh() : this._onCreate();
    },
    option: function option(key, value) {
      if (value === void 0) return this.options[key];
      var oldValue = this.options[key];
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
    getSize: function getSize(index) {
      return this.sizes[index] || this.averageSize;
    },
    getOffset: function getOffset() {
      return this.scrollEl[offsetSize[this.options.direction]];
    },
    getScrollSize: function getScrollSize() {
      return this.scrollEl[scrollSize[this.options.direction]];
    },
    getClientSize: function getClientSize() {
      return this.scrollEl[elementSize[this.options.direction]];
    },
    scrollToOffset: function scrollToOffset(offset) {
      this.scrollEl[offsetSize[this.options.direction]] = offset;
    },
    scrollToIndex: function scrollToIndex(index) {
      if (index > this._getLength()) {
        this.scrollToBottom();
      } else {
        var offset = this._getOffsetByRange(0, index);
        this.scrollToOffset(offset + this.options.ignoreSize);
      }
    },
    scrollToBottom: function scrollToBottom() {
      var _this = this;
      var offset = this.getScrollSize();
      this.scrollToOffset(offset);

      // if the bottom is not reached, execute the scroll method again
      setTimeout(function () {
        var clientSize = _this.getClientSize();
        var scrollSize = _this.getScrollSize();
        var scrollOffset = _this.getOffset();
        if (scrollOffset + clientSize + 1 < scrollSize) {
          _this.scrollToBottom();
        }
      }, 5);
    },
    // ========================================= Properties =========================================
    _updateOnScrollFunction: function _updateOnScrollFunction() {
      var _this2 = this;
      if (this.options.debounceTime) {
        this._onScroll = debounce(function () {
          return _this2._onRefresh();
        }, this.options.debounceTime);
      } else if (this.options.throttleTime) {
        this._onScroll = throttle(function () {
          return _this2._onRefresh();
        }, this.options.throttleTime);
      } else {
        this._onScroll = function () {
          return _this2._onRefresh();
        };
      }
    },
    _onCreate: function _onCreate() {
      // not available in the case of `display: none` in window scroll
      if (!this._contentVisible()) return;
      var items = this._getRenderingItems();
      if (!items.length) return;
      var clientSize = this.getClientSize();
      var scrollOffset = this.getOffset();
      var realScrollOffset = Math.abs(scrollOffset - this.options.ignoreSize);
      var end = this.range.start;
      var renderingSize = Math.max(0, this.range.front - realScrollOffset);
      while (renderingSize < clientSize && end < this.options.itemCount) {
        var item = items[end - this.range.start];

        // jump out of the loop when the number of first renderings cannot fill the container
        if (!item) break;
        var dataIndex = this._getItemIndex(item);
        var itemSize = this._getItemSize(item);
        this.sizes[dataIndex] = itemSize;
        renderingSize += itemSize;
        end += 1;
      }
      this.averageSize = Math.round((this.range.front + renderingSize) / end);
      this.sizes.length = this.options.itemCount;
      end = Math.min(this._getLength(), end + 1);
      this._updateRange(_objectSpread2(_objectSpread2({}, this.range), {}, {
        end: end
      }));
    },
    _onRefresh: function _onRefresh() {
      if (this.averageSize < 1) {
        this._onInit();
        return;
      }

      // not available in the case of `display: none` in window scroll
      if (!this._contentVisible()) return;
      var scrollOffset = this.getOffset();
      var clientSize = this.getClientSize();
      var scrollSize = this.getScrollSize();
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
        direction: this.scrollDirection
      });

      // stop the calculation when scrolling front and start is `0`
      // or when scrolling behind and end is maximum length
      if (!this.scrollDirection || this.scrollDirection === SCROLL_DIRECTION.FORWARD && this.range.start === 0 || this.scrollDirection === SCROLL_DIRECTION.BACKWARD && this.range.end === this._getLength()) {
        return;
      }
      this._onUpdate();
    },
    _onUpdate: function _onUpdate() {
      var items = this._getRenderingItems();
      for (var i = 0; i < items.length; i += 1) {
        var index = this._getItemIndex(items[i]);
        if (index) this.sizes[index] = this._getItemSize(items[i]);
      }
      this.lastStart = this.range.start;
      var _this$_getRangeByOffs = this._getRangeByOffset(),
        start = _this$_getRangeByOffs.start,
        front = _this$_getRangeByOffs.front,
        end = _this$_getRangeByOffs.end;
      if (start === this.range.start && end === this.range.end) return;
      this._updateRange({
        start: start,
        end: end,
        front: front
      });
    },
    _updateRange: function _updateRange(_ref) {
      var start = _ref.start,
        end = _ref.end,
        front = _ref.front;
      var behind = (this._getLength() - end) * this.averageSize;
      var renderingSize = this._getOffsetByRange(start, end);
      this.range.start = start;
      this.range.front = front;
      this.range.end = end;
      this.range.behind = behind;
      this.range.total = Math.max(this.range.total, front + renderingSize + behind);
      this._dispatchEvent('onUpdate', _objectSpread2({}, this.range));
    },
    _getRangeByOffset: function _getRangeByOffset() {
      var _this$options = this.options,
        itemCount = _this$options.itemCount,
        ignoreSize = _this$options.ignoreSize;
      var clientSize = this.getClientSize();
      var realScrollOffset = this.offset - ignoreSize;
      var start = 0;
      var front = 0;
      var end = 0;
      var offset = 0;
      while (end < itemCount) {
        var size = this.getSize(end);
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
      return {
        start: start,
        front: front,
        end: end
      };
    },
    _getOffsetByRange: function _getOffsetByRange(start, end) {
      var offset = 0;
      for (var i = start; i < end; i += 1) {
        offset += this.getSize(i);
      }
      return offset;
    },
    _getLength: function _getLength() {
      return Math.max(0, this.options.itemCount - 1);
    },
    _getItemSize: function _getItemSize(element) {
      return element ? element[elementSize[this.options.direction]] : this.averageSize;
    },
    _getItemIndex: function _getItemIndex(element) {
      return (element === null || element === void 0 ? void 0 : element.getAttribute(this.options.dataIndex)) || null;
    },
    _getScrollElement: function _getScrollElement(scroller) {
      return scroller instanceof Document && scroller.nodeType === 9 || scroller instanceof Window ? document.scrollingElement || document.documentElement || document.body : scroller;
    },
    _getRenderingItems: function _getRenderingItems() {
      return Array.prototype.slice.call(this.el.children);
    },
    _contentVisible: function _contentVisible() {
      return this.el.offsetHeight > 0 && this.el.offsetWidth > 0;
    },
    _dispatchEvent: function _dispatchEvent(event, params) {
      var callback = this.options[event];
      if (typeof callback === 'function') {
        callback(params);
      }
    }
  };

  return Virtual;

})));
