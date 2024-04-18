/*!
 * tiny-virtual-list v0.0.1
 * open source under the MIT license
 * https://github.com/mfuu/tiny-virtual-list#readme
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Virtual = factory());
})(this, (function () { 'use strict';

  function _extends() {
    _extends = Object.assign ? Object.assign.bind() : function (target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
      return target;
    };
    return _extends.apply(this, arguments);
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
    var timer = null;
    var result = function result() {
      var _this = this;
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      if (timer) return;
      if (wait <= 0) {
        fn.apply(this, args);
      } else {
        timer = setTimeout(function () {
          timer = null;
          fn.apply(_this, args);
        }, wait);
      }
    };
    result['cancel'] = function () {
      if (timer) {
        clearTimeout(timer);
        timer = null;
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
    FRONT: 'front',
    BEHIND: 'behind'
  };
  var rectDir = {
    vertical: 'top',
    horizontal: 'left'
  };
  var scrollDir = {
    vertical: 'scrollTop',
    horizontal: 'scrollLeft'
  };
  var scrollSize = {
    vertical: 'scrollHeight',
    horizontal: 'scrollWidth'
  };
  var offsetSize = {
    vertical: 'offsetHeight',
    horizontal: 'offsetWidth'
  };
  function Virtual(el, options) {
    if (!(el && el.nodeType && el.nodeType === 1)) {
      throw "tiny-virtual-list: `el` must be an HTMLElement, not ".concat({}.toString.call(el));
    }
    this.el = el;
    this.options = options = _extends({}, options);
    var defaults = {
      size: 0,
      count: 0,
      buffer: 1,
      scroller: undefined,
      direction: 'vertical',
      debounceTime: 0,
      throttleTime: 0
    };

    // Set default options
    for (var name in defaults) {
      !(name in this.options) && (this.options[name] = defaults[name]);
    }
    this.sizes = [];
    this.range = {
      start: 0,
      end: 0,
      total: 0,
      front: 0,
      behind: 0
    };
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
    option: function option(key, value) {
      if (value === void 0) return this.options[key];
      var oldValue = this.options[key];
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
    refresh: function refresh() {
      if (this._invisible()) return;
      var elements = Array.prototype.slice.call(this.el.children);
      if (!elements.length) return;
      var firstElement = elements[0];

      // size difference
      if (this.isFront()) {
        var realSize = this._getElementSize(firstElement);
        var diffSize = realSize - this.getSize(this.range.start);
        this.scrollToOffset(this.offset + diffSize);
      }
      this._updateSizes(elements);
      this._updateRange();
    },
    isFront: function isFront() {
      return this.scrollDirection === SCROLL_DIRECTION.FRONT;
    },
    isBehind: function isBehind() {
      return this.scrollDirection === SCROLL_DIRECTION.BEHIND;
    },
    getSize: function getSize(index) {
      var _this$sizes$index;
      return ((_this$sizes$index = this.sizes[index]) === null || _this$sizes$index === void 0 ? void 0 : _this$sizes$index.size) || this.options.size || this.averageSize;
    },
    getOffset: function getOffset() {
      return this.scrollEl[scrollDir[this.options.direction]];
    },
    getScrollSize: function getScrollSize() {
      return this.scrollEl[scrollSize[this.options.direction]];
    },
    getClientSize: function getClientSize() {
      return this._getElementSize(this.scrollEl);
    },
    scrollToOffset: function scrollToOffset(offset) {
      this.scrollEl[scrollDir[this.options.direction]] = offset;
    },
    scrollToIndex: function scrollToIndex(index) {
      if (index > this._getLastIndex()) {
        this.scrollToBottom();
      } else {
        var offset = this.sizes[index].front;
        var startOffset = this._getScrollStartOffset();
        this.scrollToOffset(offset + startOffset);
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
    _updateScrollElement: function _updateScrollElement() {
      var scroller = this.options.scroller;
      if (scroller instanceof Document && scroller.nodeType === 9 || scroller instanceof Window) {
        this.scrollEl = document.scrollingElement || document.documentElement || document.body;
      } else {
        this.scrollEl = scroller;
      }
    },
    _updateOnScrollFunction: function _updateOnScrollFunction() {
      var _this2 = this;
      var _this$options = this.options,
        debounceTime = _this$options.debounceTime,
        throttleTime = _this$options.throttleTime;
      if (debounceTime) {
        this._onScroll = debounce(function () {
          return _this2._handleScroll();
        }, debounceTime);
      } else if (throttleTime) {
        this._onScroll = throttle(function () {
          return _this2._handleScroll();
        }, throttleTime);
      } else {
        this._onScroll = function () {
          return _this2._handleScroll();
        };
      }
    },
    _addScrollEventListener: function _addScrollEventListener() {
      this.options.scroller && on(this.options.scroller, 'scroll', this._onScroll);
    },
    _handleScroll: function _handleScroll() {
      var offset = this.getOffset();
      var clientSize = this.getClientSize();
      var scrollSize = this.getScrollSize();
      var reachTop = !!this.options.count && offset <= 0;
      var reachBottom = clientSize + offset + 1 >= scrollSize;
      var direction = offset < this.offset ? SCROLL_DIRECTION.FRONT : offset > this.offset ? SCROLL_DIRECTION.BEHIND : '';
      this.offset = offset;
      this.scrollDirection = direction;
      this._dispatchEvent('onScroll', {
        top: reachTop,
        bottom: reachBottom,
        offset: offset,
        direction: direction
      });

      // stop the calculation when scrolling front and start is `0`
      // or when scrolling behind and end is maximum length
      if (!direction || this.isFront() && this.range.start === 0 || this.isBehind() && this.range.end === this._getLastIndex()) {
        return;
      }
      this._updateRange();
    },
    _updateRange: function _updateRange() {
      if (this.options.count === 0 || this._invisible()) return;
      !this.sizes.length && this.refresh();
      var _this$_getRangeByOffs = this._getRangeByOffset(),
        start = _this$_getRangeByOffs.start,
        end = _this$_getRangeByOffs.end;
      if (start === this.range.start && end === this.range.end || this.isFront() && start > this.range.start || this.isBehind() && start < this.range.start) {
        return;
      }
      var total = this._getTotalSize();
      var front = this.sizes[start].front;
      var behind = total - this.sizes[end].behind;
      this.range.start = start;
      this.range.end = end;
      this.range.total = total;
      this.range.front = front;
      this.range.behind = behind;
      this._dispatchEvent('onUpdate', this.range);
    },
    _updateSizes: function _updateSizes(elements) {
      var renderSize = 0;
      var index = this.range.start;
      for (var i = 0; i < elements.length; i++) {
        var _this$sizes;
        var size = this._getElementSize(elements[i]);
        if (!size) continue;
        var front = ((_this$sizes = this.sizes[index - 1]) === null || _this$sizes === void 0 ? void 0 : _this$sizes.behind) || 0;
        var behind = front + size;
        this.sizes[index] = {
          size: size,
          front: front,
          behind: behind
        };
        renderSize += size;
        index += 1;
      }
      var averageSize = renderSize / (index - this.range.start);
      this.averageSize = Math.round(this.averageSize ? (averageSize + this.averageSize) / 2 : averageSize);
      this.sizes.length = this.options.count;
      for (var _i = this.range.end + 1; _i < this.options.count; _i++) {
        var _this$sizes2;
        var _size = this.getSize(_i);
        var _front = ((_this$sizes2 = this.sizes[_i - 1]) === null || _this$sizes2 === void 0 ? void 0 : _this$sizes2.behind) || 0;
        var _behind = _front + _size;
        this.sizes[_i] = {
          size: _size,
          front: _front,
          behind: _behind
        };
      }
    },
    _getTotalSize: function _getTotalSize() {
      var _this$sizes$this$_get;
      return ((_this$sizes$this$_get = this.sizes[this._getLastIndex()]) === null || _this$sizes$this$_get === void 0 ? void 0 : _this$sizes$this$_get.behind) || 0;
    },
    _getLastIndex: function _getLastIndex() {
      return Math.max(0, this.options.count - 1);
    },
    _getElementSize: function _getElementSize(element) {
      return Math.round(element[offsetSize[this.options.direction]]);
    },
    _getRangeByOffset: function _getRangeByOffset() {
      var clientSize = this.getClientSize();
      var realOffset = this.offset - this._getScrollStartOffset();
      var start = this._getIndexByOffset(realOffset);
      var end = start;
      var offset = 0;
      var _this$options2 = this.options,
        count = _this$options2.count,
        buffer = _this$options2.buffer;
      while (end < count) {
        offset += this.sizes[end].size;
        end += 1;
        if (offset > clientSize) break;
      }
      start = Math.max(0, start - buffer);
      end = Math.min(this._getLastIndex(), end + buffer);
      return {
        start: start,
        end: end
      };
    },
    _getIndexByOffset: function _getIndexByOffset(offset) {
      var low = 0;
      var high = this.sizes.length - 1;
      while (low <= high) {
        var middle = Math.floor((low + high) / 2);
        var _this$sizes$middle = this.sizes[middle],
          front = _this$sizes$middle.front,
          behind = _this$sizes$middle.behind;
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
    _getScrollStartOffset: function _getScrollStartOffset() {
      var offset = 0;
      var _this$options3 = this.options,
        scroller = _this$options3.scroller,
        direction = _this$options3.direction;
      if (scroller && this.el) {
        var rectKey = rectDir[direction];
        var wrapperRect = this.el.getBoundingClientRect();
        var scrollerRect = scroller === window ? {} : scroller.getBoundingClientRect();
        offset = this.offset + wrapperRect[rectKey] - (scrollerRect[rectKey] || 0);
      }
      return offset;
    },
    _dispatchEvent: function _dispatchEvent(event, params) {
      var callback = this.options[event];
      typeof callback === 'function' && callback(params);
    },
    _invisible: function _invisible() {
      return this.el.offsetWidth === 0 || this.el.offsetHeight === 0;
    }
  };
  Virtual.utils = {
    debounce: debounce,
    throttle: throttle
  };

  return Virtual;

}));
