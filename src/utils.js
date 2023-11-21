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
  let timer = null;

  const result = function (...args) {
    if (timer) return;

    if (wait <= 0) {
      fn.apply(this, args);
    } else {
      timer = setTimeout(() => {
        timer = undefined;
        fn.apply(this, args);
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
