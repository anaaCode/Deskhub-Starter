/**
 * Returns a debounced version of fn that delays invoking it until
 * `wait` ms have elapsed since the last call.
 */
export function debounce(fn, wait = 300) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, wait);
  };
}