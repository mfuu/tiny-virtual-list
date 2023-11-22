export function on(el, event, fn) {
  if (window.addEventListener) {
    el.addEventListener(event, fn, false);
  } else if (window.attachEvent) {
    el.attachEvent('on' + event, fn);
  } else {
    el['on' + event] = fn;
  }
}

export function off(el, event, fn) {
  if (window.removeEventListener) {
    el.removeEventListener(event, fn, false);
  } else if (window.detachEvent) {
    el.detachEvent('on' + event, fn);
  } else {
    el['on' + event] = null;
  }
}

export function throttle(fn, wait) {
  let timeout = undefined;
  let _arguments = arguments;
  const result = function () {
    const _this = this;
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

export function debounce(fn, wait) {
  const throttled = throttle(fn, wait);
  const result = function () {
    throttled['cancel']();
    throttled.apply(this, arguments);
  };
  result['cancel'] = function () {
    throttled['cancel']();
  };

  return result;
}
