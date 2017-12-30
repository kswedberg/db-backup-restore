// Deep merge two or more objects in turn, with right overriding left
// Heavily influenced by/mostly ripped off from jQuery.extend

module.exports = function extend(target) {
  target = Object(target);
  let arg, prop, targetProp, copyProp;
  const hasOwn = Object.prototype.hasOwnProperty;
  const isArray = Array.isArray || function(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  };
  var isObject = function isObject(obj) {
    const isWindow = typeof window !== 'undefined' && obj === window;

    return typeof obj === 'object' && obj !== null && !obj.nodeType && !isWindow;
  };

  // Set i = 1 to start merging with the 2nd argument into target;
  let i = 1;

  // If there is only one argument, merge it into `this` (starting with  1st argument)
  if (arguments.length === 1) {
    target = this;
    i--;
  }

  // No need to define i (already done above), so use empty statement
  for (; i < arguments.length; i++) {
    arg = arguments[i];

    if (isObject(arg)) {
      for (prop in arg) {
        targetProp = target[prop];
        copyProp = arg[prop];

        if (targetProp === copyProp) {
          continue;
        }

        if (isObject(copyProp) && hasOwn.call(arg, prop)) {
          if (isArray(copyProp)) {
            targetProp = isArray(targetProp) ? targetProp : [];
          } else {
            targetProp = isObject(targetProp) ? targetProp : {};
          }

          target[prop] = extend(targetProp, copyProp);
        } else if (typeof copyProp !== 'undefined') {
          target[prop] = copyProp;
        }
      }
    }
  }

  return target;
};
