/*!
 * tiny-virtual-list v0.0.3
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

  var observeConfig = {
    attributes: false,
    childList: true,
    subtree: false
  };
  var DIRECTION = {
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
    this.refresh();
    this.updateRange();
    this.addScrollEventListener();
  }
  Virtual.prototype = {
    constructor: Virtual,
    destroy: function destroy() {
      var _this$observer;
      this.removeScrollEventListener();
      (_this$observer = this.observer) === null || _this$observer === void 0 || _this$observer.disconnect();
    },
    option: function option(key, value) {
      if (value === void 0) return this.options[key];
      var oldValue = this.options[key];
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
      this._updateAfterEndSizes();
    },
    updateRange: function updateRange(start) {
      start = start === void 0 ? this.range.start : start;
      var end = this._getEndByStart(start);
      var total = this._getTotalSize();
      var front = this._getPosition(start, DIRECTION.FRONT);
      var behind = total - this._getPosition(end, DIRECTION.BEHIND);
      if (behind === this.range.behind) return;
      this.range.start = start;
      this.range.end = end;
      this.range.total = total;
      this.range.front = front;
      this.range.behind = behind;
      this._dispatchEvent('onUpdate', _extends({}, this.range));
    },
    isFront: function isFront() {
      return this.scrollDirection === DIRECTION.FRONT;
    },
    isBehind: function isBehind() {
      return this.scrollDirection === DIRECTION.BEHIND;
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
        var offset = this._getPosition(index, DIRECTION.FRONT);
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
    addScrollEventListener: function addScrollEventListener() {
      this.options.scroller && on(this.options.scroller, 'scroll', this._onScroll);
    },
    removeScrollEventListener: function removeScrollEventListener() {
      this.options.scroller && off(this.options.scroller, 'scroll', this._onScroll);
    },
    _installObserve: function _installObserve() {
      var _this2 = this;
      var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
      if (MutationObserver) {
        this.observer = new MutationObserver(function () {
          return _this2.refresh();
        });
        this.observer.observe(this.el, observeConfig);
      }
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
      var _this3 = this;
      var _this$options = this.options,
        debounceTime = _this$options.debounceTime,
        throttleTime = _this$options.throttleTime;
      if (debounceTime) {
        this._onScroll = debounce(function () {
          return _this3._handleScroll();
        }, debounceTime);
      } else if (throttleTime) {
        this._onScroll = throttle(function () {
          return _this3._handleScroll();
        }, throttleTime);
      } else {
        this._onScroll = function () {
          return _this3._handleScroll();
        };
      }
    },
    _handleScroll: function _handleScroll() {
      var offset = this.getOffset();
      var clientSize = this.getClientSize();
      var scrollSize = this.getScrollSize();
      var reachTop = !!this.options.count && offset <= 0;
      var reachBottom = clientSize + offset + 1 >= scrollSize;
      var direction = offset < this.offset ? DIRECTION.FRONT : offset > this.offset ? DIRECTION.BEHIND : '';
      this.offset = offset;
      this.scrollDirection = direction;
      this._dispatchEvent('onScroll', {
        top: reachTop,
        bottom: reachBottom,
        offset: offset,
        direction: direction
      });
      if (!direction || this._invisible() || this.options.count <= 0) return;

      // stop the calculation when scrolling front and start is `0`
      // or when scrolling behind and end is maximum length
      if (this.isFront() && this.range.start === 0 || this.isBehind() && this.range.end === this._getLastIndex()) {
        return;
      }
      !this.sizes.length && this.refresh();
      var realOffset = this.offset - this._getScrollStartOffset();
      var start = this._getIndexByOffset(realOffset);
      start = Math.max(0, start - this.options.buffer);
      if (this.isFront() && start > this.range.start || this.isBehind() && start < this.range.start) {
        return;
      }
      this.updateRange(start);
    },
    _updateSizes: function _updateSizes(elements) {
      var renderSize = 0;
      var end = this.range.start;
      for (var i = 0; i < elements.length; i++) {
        var size = this._getElementSize(elements[i]);
        if (!size) continue;
        var front = this._getPosition(end - 1, DIRECTION.BEHIND);
        var behind = front + size;
        this.sizes[end] = {
          size: size,
          front: front,
          behind: behind
        };
        renderSize += size;
        end += 1;
      }
      var averageSize = renderSize / (end - this.range.start);
      this.averageSize = Math.round(this.averageSize ? (averageSize + this.averageSize) / 2 : averageSize);
    },
    _updateAfterEndSizes: function _updateAfterEndSizes() {
      this.sizes.length = this.options.count;
      if (this.range.end >= this.options.count) return;
      for (var i = this.range.end + 1; i < this.options.count; i++) {
        var size = this.getSize(i);
        var front = this._getPosition(i - 1, DIRECTION.BEHIND);
        var behind = front + size;
        this.sizes[i] = {
          size: size,
          front: front,
          behind: behind
        };
      }
    },
    _getPosition: function _getPosition(index, type) {
      var item = this.sizes[index];
      return item ? item[type] : 0;
    },
    _getTotalSize: function _getTotalSize() {
      return this._getPosition(this._getLastIndex(), DIRECTION.BEHIND);
    },
    _getLastIndex: function _getLastIndex() {
      return Math.max(0, this.options.count - 1);
    },
    _getElementSize: function _getElementSize(element) {
      return Math.round(element[offsetSize[this.options.direction]]);
    },
    _getEndByStart: function _getEndByStart(start) {
      var clientSize = this.getClientSize();
      var end = start;
      var offset = 0;
      var _this$options2 = this.options,
        count = _this$options2.count,
        buffer = _this$options2.buffer;
      while (end < count) {
        offset += this.getSize(end);
        end += 1;
        if (offset > clientSize) break;
      }
      end = Math.min(this._getLastIndex(), end + buffer);
      return end;
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
