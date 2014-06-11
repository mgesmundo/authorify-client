(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":3}],2:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],3:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require("Vyf5Vp"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":2,"Vyf5Vp":8,"inherits":7}],4:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++)
        buf[i] = subject.readUInt8(i)
    } else {
      for (i = 0; i < length; i++)
        buf[i] = ((subject[i] % 256) + 256) % 256
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str.toString()
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list[, length])')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (totalLength === undefined) {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

Buffer.compare = function (a, b) {
  assert(Buffer.isBuffer(a) && Buffer.isBuffer(b), 'Arguments must be Buffers')
  var x = a.length
  var y = b.length
  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
  if (i !== len) {
    x = a[i]
    y = b[i]
  }
  if (x < y) {
    return -1
  }
  if (y < x) {
    return 1
  }
  return 0
}

// BUFFER INSTANCE METHODS
// =======================

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function asciiWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function utf16leWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end === undefined) ? self.length : Number(end)

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = asciiSlice(self, start, end)
      break
    case 'binary':
      ret = binarySlice(self, start, end)
      break
    case 'base64':
      ret = base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

Buffer.prototype.equals = function (b) {
  assert(Buffer.isBuffer(b), 'Argument must be a Buffer')
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.compare = function (b) {
  assert(Buffer.isBuffer(b), 'Argument must be a Buffer')
  return Buffer.compare(this, b)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++) {
      target[i + target_start] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function binarySlice (buf, start, end) {
  return asciiSlice(buf, start, end)
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return readUInt16(this, offset, false, noAssert)
}

function readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return readInt16(this, offset, false, noAssert)
}

function readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return readInt32(this, offset, false, noAssert)
}

function readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return readFloat(this, offset, false, noAssert)
}

function readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
  return offset + 1
}

function writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
  return offset + 2
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  return writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  return writeUInt16(this, value, offset, false, noAssert)
}

function writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
  return offset + 4
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  return writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  return writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
  return offset + 1
}

function writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
  return offset + 2
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  return writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  return writeInt16(this, value, offset, false, noAssert)
}

function writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
  return offset + 4
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  return writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  return writeInt32(this, value, offset, false, noAssert)
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F) {
      byteArray.push(b)
    } else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++) {
        byteArray.push(parseInt(h[j], 16))
      }
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":5,"ieee754":6}],5:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var ZERO   = '0'.charCodeAt(0)
	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	module.exports.toByteArray = b64ToByteArray
	module.exports.fromByteArray = uint8ToBase64
}())

},{}],6:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],7:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],8:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],9:[function(require,module,exports){
module.exports=require(2)
},{}],10:[function(require,module,exports){
module.exports=require(3)
},{"./support/isBuffer":9,"Vyf5Vp":8,"inherits":7}],11:[function(require,module,exports){
/**
 * @ignore
 *
 * @author Marcello Gesmundo
 *
 * # License
 *
 * Copyright (c) 2012-2014 Yoovant by Marcello Gesmundo. All rights reserved.
 *
 * This program is released under a GNU Affero General Public License version 3 or above, which in summary means:
 *
 * - You __can use__ this program for __no cost__.
 * - You __can use__ this program for __both personal and commercial reasons__.
 * - You __do not have to share your own program's code__ which uses this program.
 * - You __have to share modifications__ (e.g bug-fixes) you've made to this program.
 * - For more convoluted language, see the LICENSE file.
 *
 */
module.exports = (function() {
  'use strict';

  var config = {};

  config.class = {};
  config.class.Store = require('./lib/class/Store')();
  config.config = {};
  config.config.crypto = window.forge;

  var app = require('./lib/config/browser')(config);

  // common
  app.jsface = window.jsface;
  app.errors = window.loggedErrors;

  app.helper = {};
  app.helper.dateHex = require('./lib/helper/dateExt')(app);
  app.helper.regExp = require('./lib/helper/regExp')(app);
  app.helper.stringExt = require('./lib/helper/stringExt')(app);

  app.mixin = {};
  app.mixin.WithContent = require('./lib/mixin/WithContent')(app);
  app.mixin.WithCrypto = require('./lib/mixin/WithCrypto')(app);
  app.mixin.WithPayload = require('./lib/mixin/WithPayload')(app);

  app.class = {};
  app.class.Store = require('./lib/class/Store')();
  app.class.Header = require('./lib/class/Header')(app);
  app.class.Authentication = require('./lib/class/Authentication')(app);
  app.class.Authorization = require('./lib/class/Authorization')(app);
  app.class.Handshake = require('./lib/class/Handshake')(app);

  var client = require('./lib/client')(app);
  app.plugin = client.plugin;

  window.authorify = client;

}());

},{"./lib/class/Authentication":12,"./lib/class/Authorization":13,"./lib/class/Handshake":14,"./lib/class/Header":15,"./lib/class/Store":16,"./lib/client":17,"./lib/config/browser":18,"./lib/helper/dateExt":20,"./lib/helper/regExp":21,"./lib/helper/stringExt":22,"./lib/mixin/WithContent":23,"./lib/mixin/WithCrypto":24,"./lib/mixin/WithPayload":25}],12:[function(require,module,exports){
/**
 * The authentication header.
 *
 * @class node_modules.authorify_client.class.Authentication
 * @extends node_modules.authorify_client.class.Header
 *
 * @author Marcello Gesmundo
 *
 * # License
 *
 * Copyright (c) 2012-2014 Yoovant by Marcello Gesmundo. All rights reserved.
 *
 * This program is released under a GNU Affero General Public License version 3 or above, which in summary means:
 *
 * - You __can use__ this program for __no cost__.
 * - You __can use__ this program for __both personal and commercial reasons__.
 * - You __do not have to share your own program's code__ which uses this program.
 * - You __have to share modifications__ (e.g bug-fixes) you've made to this program.
 *
 * For more convoluted language, see the LICENSE file.
 *
 */
module.exports = function(app) {
  'use strict';

  var Header        = app.class.Header,
      Class         = app.jsface.Class,
      forge         = app.config.crypto,
      SECRET        = app.config.SECRET,
      SECRET_CLIENT = app.config.SECRET_CLIENT,
      SECRET_SERVER = app.config.SECRET_SERVER,
      errors        = app.errors;

  var CError = errors.InternalError,
      mode = 'auth-init';

  return Class(Header, {
    /**
     * The constructor
     *
     * @param {Object} config The config options
     * @param {Boolean} [config.reply = false] True if the header if of a server reply
     * @param {String} config.sid The session identifier
     * @param {Date} config.date The date
     * @param {String} config.key The private RSA key
     * @param {String} config.cert The public X.509 cert
     * @param {String} config.encoderCert The public X.509 cert of the encoder and signer of the header
     * @param {String} config.secret The secret AES shared key in Base64 format
     * @param {String} config.id The id (uuid) assigned to the client
     * @param {String} config.app The app (uuid) assigned to the application that the client want to use
     * @param {String} config.username The username for the browser login
     * @param {String} config.password The password for the browser login
     * @constructor
     */
    constructor: function(config) {
      config = config || {};
      config.mode = mode;
      this.setSecret(config.secret);
      this.setId(config.id);
      this.setApp(config.app);
      this.setUsername(config.username);
      this.setPassword(config.password);
      Header.call(this, config);
    },
    /**
     * Generate a new token
     *
     * @returns {String} The generated token
     */
    generateToken: function() {
      var cert;
      try {
        cert = this.keychain.getCertPem();
      } catch (e) {
        throw new CError({
          body: {
            code: 'ImATeapot',
            message: 'missing certificate',
            cause: e
          }
        }).log('body');
      }
      if (!cert) {
        throw new CError('missing certificate').log();
      }
      if (!this.getDate()) {
        throw new CError('missing date').log();
      }
      if (!this.getSid()) {
        throw new CError('missing session identifier').log();
      }
      if (!this.getId()) {
        throw new CError('missing id').log();
      }
      if (!this.getApp()) {
        throw new CError('missing app').log();
      }
      var tmp = this.getDate() + '::' + cert +'::' + this.getSid() + '::' + this.getId() + '::' + this.getApp() + '::';
      if (this._reply) {
        // NOTE: username is not mandatory in non browser environment
        // NOTE: SECRET_SERVER is present only when the client is used inside the authorify module
        var username = this.getUsername();
        if (!username) {
          username = 'anonymous';
        }
        var password = this.getPassword();
        if (!password) {
          password = forge.util.encode64(forge.random.getBytesSync(16));
        }
        tmp += username + '::' + password + '::' + SECRET_SERVER;
      } else {
        tmp += SECRET_CLIENT;
      }
      var hmac = forge.hmac.create();
      hmac.start('sha256', SECRET);
      hmac.update(tmp);
      return hmac.digest().toHex();
    },
    /**
     * Get the payload property of the header.
     *
     * @return {Object} The payload property of the header
     */
    getPayload: function() {
      var secret;
      if (!this.getSecret()) {
        throw new CError('missing secret').log();
      }
      try {
        secret = this.encoder.encryptRsa(this.getSecret());
      } catch (e) {
        throw new CError({
          body: {
            code: 'ImATeapot',
            message: 'unable to encrypt secret',
            cause: e
          }
        }).log('body');
      }
      if (this.getMode() !== mode) {
        throw new CError('unexpected mode').log();
      }
      if (!this.getSid()) {
        throw new CError('missing sid').log();
      }
      return {
        mode: this.getMode(),
        secret: secret,
        sid: this.getSid()
      };
    },
    /**
     * Get the content property of the header
     *
     * @return {Object} The content property of the header
     */
    getContent: function() {
      var out = {
        date: this.getDate(),
        token: this.getToken(),
        id: this.getId(),
        app: this.getApp()
      };
      if (!out.date) {
        throw new CError('missing date').log();
      }
      if (!out.token) {
        throw new CError('missing token').log();
      }
      if (!out.id) {
        throw new CError('missing id').log();
      }
      if (!out.app) {
        throw new CError('missing app').log();
      }
      if (!this._reply) {
        out.username = this.getUsername();
        out.password = this.getPassword();
      }

      return out;
    },
    /**
     * Encrypt data or content
     *
     * @param {Object} [data] The data to encrypt or content if missing
     * @return {String} The encrypted result in Base64 format
     */
    cryptContent: function(data) {
      if (!data) {
        data = this.getContent();
      }
      return this.encoder.encryptAes(JSON.stringify(data), this.getSecret());
    },
    /**
     * Decrypt content.
     *
     * @param {String} The data to decrypt
     * @return {Object} The decrypted result
     */
    decryptContent: function(data) {
      if (!(data && 'function' === typeof data.isBase64 && data.isBase64())) {
        throw new CError('wrong data format to decrypt').log();
      }
      return JSON.parse(this.encoder.decryptAes(data, this.getSecret()));
    }
  });
};
},{}],13:[function(require,module,exports){
/**
 * The authorization header.
 *
 * @class node_modules.authorify_client.class.Authorization
 * @extends node_modules.authorify_client.class.Header
 *
 * @author Marcello Gesmundo
 *
 * # License
 *
 * Copyright (c) 2012-2014 Yoovant by Marcello Gesmundo. All rights reserved.
 *
 * This program is released under a GNU Affero General Public License version 3 or above, which in summary means:
 *
 * - You __can use__ this program for __no cost__.
 * - You __can use__ this program for __both personal and commercial reasons__.
 * - You __do not have to share your own program's code__ which uses this program.
 * - You __have to share modifications__ (e.g bug-fixes) you've made to this program.
 *
 * For more convoluted language, see the LICENSE file.
 *
 */
module.exports = function(app) {
  'use strict';

  var Header = app.class.Header,
      Class  = app.jsface.Class,
      errors = app.errors;

  var CError = errors.InternalError,
      mode1 = 'auth',
      mode2 = 'auth-plain'; // use auth-plain if you want body in plain text

  return Class(Header, {
    /**
     * The constructor
     *
     * @param {Object} config The config options
     * @param {Boolean} [config.reply = false] True if the header if of a server reply
     * @param {String} [config.mode = 'auth'] The mode of the header.
     *
     * Values:
     * - 'auth': encrypt body if present
     * - 'auth-plain': the body (if present) is in plaintext
     * @param {String} config.sid The session identifier
     * @param {Date} config.date The date
     * @param {String} config.key The private RSA key
     * @param {String} config.cert The public X.509 cert
     * @param {String} config.encoderCert The public X.509 cert of the encoder and signer of the header
     * @param {String} config.secret The secret AES shared key in Base64 format
     * @param {String} config.token The authentication token
     * @constructor
     */
    constructor: function(config) {
      config = config || {};
      config.mode = config.mode || mode1;
      this.setSecret(config.secret);
      this.setToken(config.token);
      Header.call(this, config);
    },
    /**
     * Set the token
     *
     * @param {String} token The token
     */
    setToken: function(token) {
      this._token = token;
    },
    /**
     * Get the token
     *
     * @return {String} The token
     */
    getToken: function() {
      return this._token;
    },
    /**
     * Get the payload property of the header.
     *
     * @return {Object} The payload property of the header
     */
    getPayload: function() {
      var secret;
      if (!this.getSecret()) {
        throw new CError('missing secret').log();
      }
      try {
        secret = this.encoder.encryptRsa(this.getSecret());
      } catch (e) {
        throw new CError({
          body: {
            code: 'ImATeapot',
            message: 'unable to encrypt secret',
            cause: e
          }
        }).log('body');
      }
      if (this.getMode() !== mode1 && this.getMode() !== mode2) {
        throw new CError('unexpected mode').log();
      }
      if (!this.getSid()) {
        throw new CError('missing sid').log();
      }
      return {
        mode: this.getMode(),
        secret: secret,
        sid: this.getSid()
      };
    },
    /**
     * Get the content property of the header
     *
     * @return {Object} The content property of the header
     */
    getContent: function() {
      var out = {
        date: this.getDate(),
        token: this.getToken()
      };
      if (!out.date) {
        throw new CError('missing date').log();
      }
      if (!out.token) {
        throw new CError('missing token').log();
      }

      return out;
    },
    /**
     * Encrypt data or content
     *
     * @param {Object} [data] The data to encrypt or content if missing
     * @return {String} The encrypted result in Base64 format
     */
    cryptContent: function(data) {
      if (!data) {
        data = this.getContent();
      }
      return this.encoder.encryptAes(JSON.stringify(data), this.getSecret());
    },
    /**
     * Decrypt content.
     *
     * @param {String} The data to decrypt
     * @return {Object} The decrypted result
     */
    decryptContent: function(data) {
      if (!(data && 'function' === typeof data.isBase64 && data.isBase64())) {
        throw new CError('wrong data format to decrypt').log();
      }
      return JSON.parse(this.keychain.decryptAes(data, this.getSecret()));
    }
  });
};
},{}],14:[function(require,module,exports){
/**
 * The handshake header.
 *
 * @class node_modules.authorify_client.class.Handshake
 * @extends node_modules.authorify_client.class.Header
 *
 * @author Marcello Gesmundo
 *
 * # License
 *
 * Copyright (c) 2012-2014 Yoovant by Marcello Gesmundo. All rights reserved.
 *
 * This program is released under a GNU Affero General Public License version 3 or above, which in summary means:
 *
 * - You __can use__ this program for __no cost__.
 * - You __can use__ this program for __both personal and commercial reasons__.
 * - You __do not have to share your own program's code__ which uses this program.
 * - You __have to share modifications__ (e.g bug-fixes) you've made to this program.
 *
 * For more convoluted language, see the LICENSE file.
 *
 */
module.exports = function(app) {
  'use strict';

  var Header        = app.class.Header,
      forge         = app.config.crypto,
      Class         = app.jsface.Class,
      SECRET        = app.config.SECRET,
      SECRET_CLIENT = app.config.SECRET_CLIENT,
      errors        = app.errors;

  var CError = errors.InternalError;

  var mode = 'handshake';

  return Class(Header, {
    /**
     * The constructor
     *
     * @param {Object} config The config options
     * @param {Boolean} [config.reply = false] True if the header if of a server reply
     * @param {String} config.sid The session identifier
     * @param {Date} config.date The date
     * @param {String} config.key The private RSA key
     * @param {String} config.cert The public X.509 cert
     * @param {String} config.encoderCert The public X.509 cert of the encoder and signer of the header
     * @constructor
     */
    constructor: function(config) {
      config = config || {};
      config.mode = mode;
      Header.call(this, config);
    },
    /**
     * Generate a valid token
     *
     * @returns {String} The token
     */
    generateToken: function() {
      var cert = this.keychain.getCertPem();
      if (!cert) {
        throw new CError('missing certificate').log();
      }
      var tmp = this.getDate() + '::' + cert + '::' + SECRET_CLIENT;
      var hmac = forge.hmac.create();
      hmac.start('sha256', SECRET);
      hmac.update(tmp);
      return hmac.digest().toHex();
    },
    /**
     * Get the payload property of the header
     *
     * @return {Object} The payload property of the header
     */
    getPayload: function() {
      if (this.getMode() !== mode) {
        throw new CError('unexpected mode').log();
      }
      var cert;
      try {
        cert = this.keychain.getCertPem();
      } catch (e) {
        throw new CError({
          body: {
            code: 'ImATeapot',
            message: 'missing certificate',
            cause: e
          }
        }).log('body');
      }
      if (!cert) {
        throw new CError('missing certificate').log();
      }
      var out = {
        mode: this.getMode(),
        cert: cert
      };
      if (this.getSid()) {
        out.sid = this.getSid();
      }
      return out;
    },
    /**
     * Get the content property of the header
     *
     * @return {Object} The content property of the header
     */
    getContent: function() {
      if (!this.getDate()) {
        throw new CError('missing date').log();
      }
      return {
        date: this.getDate(),
        token: this.getToken()
      };
    },
    /**
     * Encrypt data or content.
     *
     * @param {Object} [data] The data to encrypt or content if missing
     * @return {String} The encrypted result in Base64 format
     */
    cryptContent: function(data) {
      if (!data) {
        data = this.getContent();
      }
      return data;
    },
    /**
     * Decrypt data.
     *
     * @param {String} The data to decrypt and assign to content
     * @return {Object} The decrypted content
     */
    decryptContent: function(data) {
      return data;
    }
  });
};
},{}],15:[function(require,module,exports){
/**
 * The base class for all headers
 *
 * @class node_modules.authorify_client.class.Header
 * @mixins node_modules.authorify_client.mixin.WithPayload
 * @mixins node_modules.authorify_client.mixin.WithContent
 * @inheritable
 *
 * @author Marcello Gesmundo
 *
 * # License
 *
 * Copyright (c) 2012-2014 Yoovant by Marcello Gesmundo. All rights reserved.
 *
 * This program is released under a GNU Affero General Public License version 3 or above, which in summary means:
 *
 * - You __can use__ this program for __no cost__.
 * - You __can use__ this program for __both personal and commercial reasons__.
 * - You __do not have to share your own program's code__ which uses this program.
 * - You __have to share modifications__ (e.g bug-fixes) you've made to this program.
 *
 * For more convoluted language, see the LICENSE file.
 *
 */
module.exports = function(app) {
  'use strict';

  var mixin  = app.mixin,
      Class  = app.jsface.Class,
      forge  = app.config.crypto,
      config = app.config,
      log    = app.logger,
      errors = app.errors,
      debug  = app.config.debug;

  var CError = errors.InternalError;

  var Crypter = Class([mixin.WithCrypto], {
    constructor: function(opts) {
      opts = opts || {};
      this.setKey(opts.key);
      this.setCert(opts.cert);
    }
  });

  return Class([mixin.WithPayload, mixin.WithContent], {
    $statics: {
      /**
       * Parse the Authorization header
       *
       * @param {String} header The Authorization header in Base64 format
       * @param {String} key The private RSA key
       * @param {String} cert The public X.509 certificate
       * @return {Object} The parsed header
       * @static
       */
      parse: function(header, key, cert) {
        var parsedHeader;
        if (header) {
          if (!header.isBase64()) {
            throw new CError('missing header or wrong format').log();
          } else {
            parsedHeader = JSON.parse(forge.util.decode64(header));
            this.isModeAllowed.call(this, parsedHeader.payload.mode);
          }
          var Handshake      = app.class.Handshake,
              Authentication = app.class.Authentication,
              Authorization  = app.class.Authorization,
              mode           = parsedHeader.payload.mode,
              sid            = parsedHeader.payload.sid,
              result         = {};

          var options = {
            sid: sid,
            key: key || config.key,
            cert: cert || config.cert
          };
          switch (mode) {
            case 'handshake':
              result.header = new Handshake(options);
              break;
            case 'auth-init':
              result.header = new Authentication(options);
              break;
            default :
              result.header = new Authorization(options);
              break;
          }
          try {
            var ecryptedSecret = parsedHeader.payload.secret;
            if (ecryptedSecret) {
              var secret = result.header.keychain.decryptRsa(ecryptedSecret);
              result.header.setSecret(secret);
            }
            parsedHeader.content = result.header.decryptContent(parsedHeader.content);
          } catch (e) {
            throw new CError({
              body: {
                code: 'ImATeapot',
                message: 'unable to decrypt content',
                cause: e
              }
            }).log('body');
          }

          delete result.header;

          if (debug) {
            log.debug('%s parsed header', app.name);
            log.debug(parsedHeader);
          }
        }
        return parsedHeader;
      }
    },
    /**
     * The constructor
     *
     * @param {Object} config The config options
     * @param {Boolean} [config.reply = false] True if the header if of a server reply
     * @param {String} [config.mode = 'auth'] The mode of the header. See {@link node_modules.authorify_client.mixin.WithPayload#MODES allowed modes}.
     * @param {String} config.sid The session identifier
     * @param {Date} config.date The date
     * @param {String} config.key The private RSA key
     * @param {String} config.cert The public X.509 cert
     * @param {String} config.encoderCert The public X.509 cert of the encoder and signer of the header
     * @constructor
     */
    constructor: function(config) {
      config = config || {};
      this._reply = config.reply || false;
      this.setMode(config.mode || 'auth');
      this.setSid(config.sid);
      this.setDate(config.date || new Date());
      this.keychain = new Crypter({
        key : config.key,
        cert: config.cert
      });
      this.encoder = new Crypter({
        cert: config.encoderCert
      });
    },
    /**
     * Set the secret shared key for AES encryption/decryption
     *
     * @param {String} secret The secret shared key in Base64 format
     */
    setSecret: function(secret) {
      if (secret) {
        this._secret = Crypter.getBytesFromSecret(secret);
      }
    },
    /**
     * Get the secret shared key for AES encryption/decryption
     *
     * @return {Bytes} The secret shared AES key
     */
    getSecret: function() {
      return this._secret;
    },
    /**
     * Get the payload property of the header. You MUST override into subclasses.
     *
     * @return {Object} The payload property of the header
     */
    getPayload: function() {
      throw new CError('you must override getPayload method').log();
    },
    /**
     * Get the content property of the header. You MUST override into subclasses.
     *
     * @return {Object} The content property of the header
     */
    getContent: function() {
      throw new CError('you must override getContent method').log();
    },
    /**
     * Generate a signature for for data or content property
     *
     * @param {String/Object} data The data to sign or content if missing
     * @return {String} The signature in Base64 format
     */
    generateSignature: function(data) {
      try {
        data = data || this.getContent();
        return this.keychain.sign(JSON.stringify(data));
      } catch(e) {
        throw new CError({
          body: {
            code: 'ImATeapot',
            message: 'unable to sign content',
            cause: e
          }
        }).log('body');
      }
    },
    /**
     * Encrypt data or content. You MUST override into subclasses.
     *
     * @param {Object} [data] The data to encrypt or content if missing
     * @return {String} The encrypted result in Base64 format
     */
    cryptContent: function(data) {
      throw new CError('you must override cryptContent method').log();
    },
    /**
     * Decrypt content. You MUST override into subclasses.
     *
     * @param {String} The data to decrypt and assign to content
     * @return {Object} The decrypted result
     */
    decryptContent: function(data) {
      throw new CError('you must override decryptContent method').log();
    },
    /**
     * Encode the header including payload, content and signature
     *
     * @return {String} The encoded header in Base64 format
     */
    encode: function() {
      var content = this.getContent();
      var out = {
        payload: this.getPayload(),
        content: this.cryptContent(content),
        signature: this.generateSignature()
      };
      if (debug) {
        log.debug('%s encode with sid %s', app.name, out.payload.sid);
        log.debug('%s encode with token %s', app.name, content.token);
      }

      return forge.util.encode64(JSON.stringify(out));
    }
  });
};
},{}],16:[function(require,module,exports){
/**
 * A class for node and web storage management.
 *
 * @class node_modules.authorify_client.class.Store
 *
 * @author Marcello Gesmundo
 *
 * # License
 *
 * Copyright (c) 2012-2014 Yoovant by Marcello Gesmundo. All rights reserved.
 *
 * This program is released under a GNU Affero General Public License version 3 or above, which in summary means:
 *
 * - You __can use__ this program for __no cost__.
 * - You __can use__ this program for __both personal and commercial reasons__.
 * - You __do not have to share your own program's code__ which uses this program.
 * - You __have to share modifications__ (e.g bug-fixes) you've made to this program.
 *
 * For more convoluted language, see the LICENSE file.
 *
 */
module.exports = function() {
  // dependencies
  var Class = require('jsface').Class,
      store = require('cargo');

  return Class({
    /**
     * The constructor
     *
     * @param {String} [name = 'authorify'] The name of the store
     * @param {Boolean} [persistent = false] When true the store is local (persistent), otherwise it is per session (volatile)
     * @constructor
     */
    constructor: function(name, persistent) {
      this.prefix = (name || 'authorify') + '::';
      this.store = store;
      if (persistent) {
        this.store.proxy = store.local;
      } else {
        this.store.proxy = store.session;
      }
    },
    /**
     * Destroy a stored item
     *
     * @param {String} key The key of the item
     * @param {Function} callback Function called when the operation is done
     * @return {callback(err, key)} The callback to execute as result
     * @param {String} callback.err Error if occurred
     * @param {String} callback.key The key of the destroyed item
     */
    destroy: function(key, callback) {
      if (key) {
        this.store.proxy.remove(this.prefix + key);
        if (callback) {
          callback(null, key);
        }
      } else {
        if (callback) {
          callback('missing key');
        }
      }
    },
    /**
     * Load stored item
     *
     * @param {String} key The key of the item
     * @param {Function} callback Function called when the item is loaded
     * @return {callback(err, data)} The callback to execute as result
     * @param {String} callback.err Error if occurred
     * @param {Object} callback.data The loaded item
     */
    load: function(key, callback) {
      if (key) {
        var _data = this.store.proxy.get(this.prefix + key),
            data;
        if ('undefined' !== typeof window) {
          // browser
          try {
            data = JSON.parse(_data);
          } catch (e) {
            data = _data;
          }
        } else {
          data = _data;
        }
        callback(null, data);
      } else {
        callback('missing key');
      }
    },
    /**
     * Save an item
     *
     * @param {String} key The key of the item
     * @param {Object} data The item
     * @param {Function} callback Function called when the session is saved
     * @return {callback(err)} The callback to execute as result
     * @param {String} callback.status Result from Redis query
     */
    save: function(key, data, callback) {
      if (key) {
        if (data) {
          var _data = data;
          if ('undefined' !== typeof window && 'object' === typeof data) {
            _data = JSON.stringify(_data);
          }
          this.store.proxy.set(this.prefix + key, _data);
          callback(null);
        } else {
          callback('missing data');
        }
      } else {
        callback('missing key');
      }
    },
    /**
     * Check if an item exists
     *
     * @param {String} key The key of the item
     * @param {Function} callback Function called when the item is verified
     * @return {callback(err, exists)} The callback to execute as result
     * @param {String} callback.err Error if occurred
     * @param {Boolean} callback.exists Return true if the item exists
     */
    exists: function(key, callback) {
      this.load(key, function(err, data) {
        callback(err, (data));
      });
    }
  });
};

},{"cargo":28,"jsface":30}],17:[function(require,module,exports){
/**
 * A client (for node and browser) for {@link https://www.npmjs.org/package/authorify Authorify}
 * authorization and authentication system for REST server.
 *
 *
 * @class node_modules.authorify_client
 *
 * @author Marcello Gesmundo
 * 
 * ## Usage
 * 
 * You can use `authorify-client` both in node and in browser environment. 
 * 
 * #### Node
 * 
 * This client has the same approach of [superagent][1] and you can use it as shown below:
 * 
 *      // dependencies
 *      var fs = require('fs'),
 *          authorify = require('authorify-client')({
 *            host: 'localhost',
 *            debug: true,
 *            key: fs.readFileSync('clientCert.key'), 'utf8'),
 *            cert: fs.readFileSync('clientCert.cer'), 'utf8'),
 *            ca: fs.readFileSync('serverCA.cer'), 'utf8')
 *          }),
 *          uuid = require('node-uuid'),
 *          id = uuid.v4(),
 *          app = uuid.v4();
 *      
 *      // use a configuration
 *      authorify.set({
 *        host: 'localhost',    // host of your server
 *        port: 3000,           // port of your server
 *        id: id,               // a valid uuid
 *        app: app              // another valid uuid
 *      });
 *      
 *      // login
 *      authorify.login('username', 'password', function(err, res) {
 *        authorify.post('/test')
 *          // send a message into the body
 *          .send({ name: 'alex', surname: 'smith' })
 *          .end(function(err, res) {
 *            if (!err) {
 *              // your logic here
 *            }
 *          });
 *      });
 * 
 * #### Browser
 * 
 * To create a single file to use in browser environment use a simple script that uses `browserify`:
 * 
 *      $ ./build.sh
 * 
 * and add the obtained file to your `html` file:
 * 
 *      <!DOCTYPE html>
 *      <html>
 *          <head>
 *              <meta charset="utf-8">
 *              <title>authorify-client example</title>
 *          </head>
 *          <body>
 *              <script src="authorify.js"></script>
 *              <script src="example.js"></script>
 *          </body>
 *      </html>
 * 
 * The script `example.js` contanins your example code:
 *     
 *      // you have a global authorify variable 
 *      authorify.set({
 *        host: 'localhost',                            // host of your server
 *        port: 3000,                                   // port of your server
 *        id: 'ae92d22b-a9ab-458a-9850-0025dbf11fad',   // a valid uuid
 *        app: 'c983659a-9572-4471-a3a2-7d45b591d315'   // another valid uuid
 *      });
 *      
 *      // login
 *      authorify.login('username', 'password', function(err, res) {
 *        authorify.post('/test')
 *          // send a message into the body
 *          .send({ name: 'alex', surname: 'smith' }))
 *          .end(function(err, res) {
 *            if (!err) {
 *              // your logic here
 *            }
 *          });
 *      });
 *     
 * See [Authorify][2] `test/browser` folder to see more examples.
 * 
 * [1]: https://www.npmjs.org/package/superagent
 * [2]: https://www.npmjs.org/package/authorify
 *
 * # License
 *
 * Copyright (c) 2012-2014 Yoovant by Marcello Gesmundo. All rights reserved.
 *
 * This program is released under a GNU Affero General Public License version 3 or above, which in summary means:
 *
 * - You __can use__ this program for __no cost__.
 * - You __can use__ this program for __both personal and commercial reasons__.
 * - You __do not have to share your own program's code__ which uses this program.
 * - You __have to share modifications__ (e.g bug-fixes) you've made to this program.
 *
 * For more convoluted language, see the LICENSE file.
 *
 */
module.exports = function(app) {
  'use strict';

  //TODO: create a plugin to ban the IP with an high number of failing requests (add as last middleware)

  // dependencies
  var _              = app._,
      mixin          = app.mixin,
      agent          = app.superagent,
      Class          = app.jsface.Class,
      Store          = app.class.Store,
      Header         = app.class.Header,
      Handshake      = app.class.Handshake,
      Authentication = app.class.Authentication,
      Authorization  = app.class.Authorization,
      util           = app.util,
      async          = app.async,
      log            = app.logger,
      sessionStore   = app.sessionStore,
      config         = app.config,
      debug          = config.debug,
      authHeaderKey  = config.authHeader,
      errors         = app.errors;

  var CError = errors.InternalError,
      wsPlugin;

  errors.set({
    format: function(e, mode) {
      mode = mode || 'msg';
      if (mode === 'msg') {
        return util.format('%s %s', app.name, e.message);
      }
      return util.format('%s %s', app.name, e.body);
    }
  });

  // namespace
  var my = {
    'class'  : app.class,
    'helper' : app.helper,
    'mixin'  : app.mixin,
    'config' : {},          // the active configuration
    'configs': {},          // all available configurations
    'plugin' : {}           // all loaded plugins
  };

  var defaultConfigName = 'config';

  /**
   * Add a name field if missing and if opts is an object.
   * Make a new object with name field (set to opts) if opts is a string.
   *
   * @param {Object/String} opts The options object or string with the required name
   * @returns {Object} The configuration
   * @private
   * @ignore
   */
  function formatOptions(opts) {
    if (opts) {
      if (_.isObject(opts)) {
        opts.name = opts.name || defaultConfigName;
      } else if ('string' === typeof opts) {
        opts = {
          name: opts
        };
      }
    } else {
      opts = {
        name: defaultConfigName
      };
    }
    return opts;
  }

  /**
   * Get all options with default values if empty
   *
   * @param {Object/String} opts The options object or string with the required name
   * @returns {Object} The configuration with default values
   * @private
   * @ignore
   */
  function getConfigOptions(opts) {
    opts = formatOptions(opts);
    _.forEach(config, function(value, key) {
      opts[key] = opts[key] || value;
    });
    opts.headers = opts.headers || {};

    return opts;
  }

  /**
   * Make an object with all params
   *
   * @param {String} method The required method
   * @param {String} path The required path
   * @param {String} [transport = 'http'] The transport protocol ('http' or 'ws')
   * @param {Boolean} [plain = false] The required plain
   * @param {Function} callback The required callback
   * @return {Object} An object with all params as properties
   * @private
   * @ignore
   */
  function fixRequestOptions(method, path, transport, plain, callback) {
    var opts = {
      method: method,
      path: path
    };
    if (_.isFunction(transport)) {
      opts.callback = transport;
      opts.plain = false;
      opts.transport = 'http';
    } else {
      if (_.isString(transport)) {
        opts.transport = transport;
      } else if (_.isBoolean(transport)) {
        opts.plain = transport;
      }
      if (_.isFunction(plain)) {
        opts.callback = plain;
        opts.plain = opts.plain || false;
      } else if (_.isBoolean(plain)) {
        opts.callback = callback;
        opts.plain = plain;
      }
    }
    return opts;
  }

  /**
   * Get the authorify-websocket plugin instance if loaded
   * @return {Object}
   * @private
   * @ignore
   */
  function getWebsocketPlugin() {
    if (!wsPlugin) {
      wsPlugin = _.findWhere(app.plugin, { name: 'authorify-websocket' });
    }
    return wsPlugin;
  }

  /**
   * Log the response
   *
   * @param {Object} err The error if occurred
   * @param {Object} res The response
   * @private
   * @ignore
   */
  function logResponse(err, res) {
    if (err || (res && !res.ok)) {
      if (err) {
        log.warn('%s on response -> read plaintext body due an error (%s)', app.name, err.message);
      } else {
        log.warn('%s on response -> read plaintext body due an error (%s)', app.name, res.error);
      }
    } else if (res && !_.isEmpty(res.body)) {
      if  (res.body[my.config.encryptedBodyName]) {
        log.info('%s on response -> read encrypted body', app.name);
      } else {
        log.info('%s on response -> read plaintext body', app.name);
      }
    }
  }

  /**
   *  Formats the name of the module loaded into the browser
   *
   *  @param module {String} The original module name
   *  @return {String} Name of the module
   *  @private
   *  @ignore
   */
  function getModuleName(module) {
    var script = module.replace(/[^a-zA-Z0-9]/g, '.'),
        parts = script.split('.'),
        name = parts.shift();

    if (parts.length) {
      for (var p in parts) {
        name += parts[p].charAt(0).toUpperCase() + parts[p].substr(1, parts[p].length);
      }
    }
    return name;
  }

  var Crypter = Class(mixin.WithCrypto, {
    constructor: function(opts) {
      opts = opts || {};
      this.setKey(opts.key);
      this.setCert(opts.cert);
      this.setCa(opts.ca);
    }
  });

  var Config = Class({
    constructor: function(initConfig) {
      var self = this;
      initConfig = getConfigOptions(initConfig);
      _.forEach(initConfig, function(value, key) {
        self[key] = value;
      });
      this.urlBase = util.format('%s://%s:%s', this.protocol, this.host, this.port);
      this.crypter = new Crypter({
        key : this.key,
        cert: this.cert,
        ca  : this.ca
      });
    }
  });

  // TODO: add option to use the last successful protocol used. Add also a timer to restore the default order; if the default first protocol fails again, set a new long timer (like primus reconnection strategy)
  var Client = Class({
    /**
     * The constructor
     *
     * @param {Object} [opts] The construction options
     * @param {Object} opts.name The name of the required configuration
     * @param {Object} opts.request The request object
     * @param {String} opts.path The required route
     * @param {String} opts.method = 'GET' The http verb
     * @param {Boolean} opts.plain = false True if the request body is in plaintext
     * @param {String} opts.transport = 'http' The transport protocol ('http' or 'ws')
     * @constructor
     * @ignore
     */
    constructor: function(opts) {
      opts = formatOptions(opts);
      my.setConfig(opts.name);
      var cfg = my.config,
          self = this;
      _.forEach(cfg, function(value, key) {
        self[key] = value;
      });
      if (opts.path) {
        opts.path = opts.path.urlSanify();
      }
      this.request   = opts.request;
      this.path      = opts.path;
      this.method    = opts.method || 'GET';
      this.plain     = opts.plain  || false;
    },
    /**
     * Create a new request
     *
     * @param {Header} header The header instance
     * @param {String} path The required route
     * @param {String} [method = 'GET'] The http verb
     * @param {String} [transport = 'http'] The transport protocol ('http' or 'ws')
     * @private
     */
    composeRequest: function(header, path, method, transport) {
      transport = transport || 'http';
      if (transport !== 'http' && transport !== 'ws') {
        throw new CError('unknown transport').log();
      }
      var plain = true,
          self = this;
      method = method || 'GET';
      // prepare request
      if (!this.request || this.path !== path || this.method !== method) {
        var url = util.format('%s%s', this.urlBase, path);
        if (transport === 'http') {
          this.request = agent(method, url);
          // set timeout for request
          if (this.requestTimeout && this.requestTimeout > 0) {
            this.request.timeout(this.requestTimeout);
          }
          // set content type
          this.request.type('json');
        } else {
          var ws = getWebsocketPlugin();
          if (!ws) {
            throw new CError('websocket plugin not loaded');
          }
          this.request = ws.wsclient.primusagent(method, url, {
            timeout: this.requestTimeout
          });
        }
      }
      if (!this.request) {
        throw new CError('no request available').log();
      }
      // set headers
      if (header) {
        this.headers[authHeaderKey] = header.encode();
        _.each(this.headers, function(value, key) {
          self.request.set(key, value);
        });
        plain = (header.getMode() === 'auth-plain');
      }
      // compose query if required
      if (this._pendingQuery) {
        _.forEach(this._pendingQuery, function(value) {
          if (plain || self._noAuthHeader) {
            if (!_.isObject(value)) {
              throw new CError('wrong query format').log();
            }
            self.request.query(value);
          } else {
            // encrypt query in Base64url
            if (!_.isObject(value)) {
              throw new CError('wrong query format').log();
            }
            _.forEach(value, function(item, property) {
              value[property] = header.encoder.encryptAes(item.toString(), header.getSecret(), 'url');
            });
            self.request.query(value);
          }
        });
      }
      // compose body if required
      if (this._pendingContent) {
        var content = {},
            _content = {};
        if (plain || this._noAuthHeader) {
          _.forEach(this._pendingContent, function(value) {
            if (!_.isObject(value)) {
              throw new CError('wrong body format').log();
            }
            self.request.send(value);
          });
          log.info('%s on request -> write plaintext body', app.name);
        } else {
          if (!header) {
            throw new CError('missing header').log();
          }
          _.forEach(this._pendingContent, function(value) {
            if (!_.isObject(value)) {
              throw new CError('wrong body format').log();
            }
            _.extend(_content, value);
          });
          content[my.config.encryptedBodyName] = header.cryptContent(_content);
          // sign the body
          if (my.config.signBody) {
            content[my.config.encryptedSignatureName] = header.generateSignature(_content);
          }
          log.info('%s on request -> write encrypted body', app.name);
          self.request.send(content);
        }
      }
    },
    /**
     * @inheritdoc #handshake
     */
    handshake: function(callback) {
      var handshake = new Handshake({
            key: my.config.key,
            cert: my.config.cert,
            encoderCert: my.config.cert
          });
      handshake.setToken(handshake.generateToken());
      this.composeRequest(handshake, this.handshakePath, 'GET', 'http');
      // perform request and process response
      this.request.end(function(err, res) {
        logResponse(err, res);
        if (err) {
          callback(err, res);
        } else if (!res.ok) {
          callback(null, res);
        } else {
          my.processHeader(res, function(err, result) {
            // save the received certificate
            if (!err) {
              var session = {
                sid: result.parsedHeader.payload.sid,
                cert: result.parsedHeader.payload.cert
              };
              sessionStore.save(my.config.urlBase, session, function(err) {
                if (!err) {
                  log.debug('%s saved session', app.name);
                  log.debug(session);
                  callback(null, result);
                } else {
                  log.error('%s %s', app.name, err);
                  callback(err, result);
                }
              });
            } else {
              log.error('%s %s', app.name, err);
              callback(err, result);
            }
          });
        }
      });
      return this;
    },
    /**
     * @inheritdoc #authenticate
     */
    authenticate: function(username, password, callback) {
      var self = this,
          err;
      if (!this.id || !this.app || !username || !password) {
        err = 'missing required fields for authentication';
        log.error('%s %s', app.name, err);
        callback(err);
      } else {
        sessionStore.load(my.config.urlBase, function(loadErr, session) {
          if (loadErr) {
            log.error('%s %s', app.name, loadErr);
            callback(loadErr);
          } else if (session){
            var authentication = new Authentication({
              key: my.config.key,
              cert: my.config.cert,
              encoderCert: session.cert,
              sid: session.sid,
              secret: my.generateSecret(),
              id: self.id,
              app: self.app,
              username: username,
              password: password
            });
            authentication.setToken(authentication.generateToken());
            self.composeRequest(authentication, self.authPath, 'GET', 'http');
            // perform request and process response
            self.request.end(function(err, res) {
              logResponse(err, res);
              if (err) {
                callback(err, res);
              } else if (!res.ok) {
                callback(null, res);
              } else {
                my.processHeader(res, function(procErr, result) {
                  if (!procErr) {
                    // save token into the session
                    // NOTE: the sid is changed
                    session.sid = result.parsedHeader.payload.sid;
                    session.token = result.parsedHeader.content.token;
                    sessionStore.save(my.config.urlBase, session, function(saveErr) {
                      if (!saveErr) {
                        log.debug('%s saved session', app.name);
                        log.debug(session);
                        callback(err, result);
                      } else {
                        err = 'save session error';
                        log.error('%s %s', app.name, err);
                        callback(err);
                      }
                    });
                  } else {
                    callback(procErr);
                  }
                });
              }
            });
          } else {
            err = 'session not found';
            log.error('%s %s', app.name, err);
            callback(err);
          }
        });
      }
      return this;
    },
    /**
     * Perform a request
     *
     * @param {String} transport = 'http' The transport protocol ('http' or 'ws')
     * @param {String} method = 'GET' The http verb
     * @param {String} path The required route
     * @param {Function} callback The callback: next(err, res)
     * @param {Error/String} callback.err The error if occurred
     * @param {Object} callback.res The response received from the server
     * @private
     */
    doConnect: function (transport, method, path, callback) {
      if (transport === 'http' || transport === 'ws') {
        log.debug('%s perform a %s request', app.name, (transport === 'ws' ? 'websocket' : 'http'));
        this.composeRequest(null, path, method, transport);
        // perform request and process response
        this.request.end(function (err, res) {
          logResponse(err, res);
          callback(err, res);
//          if (err) {
//            callback(err, res);
//          } else if (!res.ok) {
//            callback(res.error, res);
//          } else {
//            callback(null, res);
//          }
        });
      } else {
        var err = 'unknown transport';
        log.error('%s %s %s', app.name, err, transport);
        callback(err);
      }
    },
    /**
     * A request without Authorization header
     *
     * @inheritdoc #authorize
     * @private
     */
    connect: function(opts) {
      opts = opts || {};
      var path = opts.path || this.path,
          callback = opts.callback,
          method = opts.method || this.method,
          ws = getWebsocketPlugin(),
          transports = app.config.transports,
          self = this,
          i = 0,
          error,
          response;

      if (ws) {
        if (transports && transports.length > 0) {
          async.whilst(
            function () {
              return (i < transports.length);
            },
            function (done) {
              self.doConnect(transports[i], method, path, function (err, res) {
                error = err;
                response = res;
                if (!err && res) {
                  i = transports.length;
                } else {
                  i++;
                  if (i < transports.length) {
                    delete self.request;
                  }
                }
                done();
              });
            },
            function (err) {
              callback(err || error, response);
            }
          );
        } else {
          error = 'no transport available';
          log.error('%s %s', app.name, error);
          callback(error);
        }
      } else {
        this.doConnect('http', method, path, callback);
      }
      return this;
    },
    /**
     * Perform a request
     *
     * @param {String} transport = 'http' The transport protocol ('http' or 'ws')
     * @param {String} method The required method
     * @param {String} path The required path
     * @param {Boolean} plain = false The required plain
     * @param {Object} header The header for the request
     * @param {Object} session The session
     * @param {Function} callback The callback: next(err, res)
     * @param {Error/String} callback.err The error if occurred
     * @param {Object} callback.res The response received from the server
     * @private
     */
    doRequest:function (transport, method, path, plain, header, session, callback){
      var self = this,
          err;
      if (transport === 'http' || transport === 'ws') {
        log.debug('%s perform a %s request', app.name, (transport === 'ws' ? 'websocket' : 'http'));
        // compose request
        this.composeRequest(header, path, method, transport);
        // perform request and process response
        this.request.end(function(err, res) {
          logResponse(err, res);
          if (err) {
            callback(err, res);
//          } else if (!res.ok) {
//            callback(null, res);
          } else if (path === my.config.logoutPath) {
            // destroy local session
            sessionStore.destroy.call(sessionStore, my.config.urlBase);
            // the logout response does not have header
            callback(null, res);
          } else {
            my.processHeader(res, function(procErr, result) {
              // save the token
              if (!procErr) {
                // save token into the session
                session.token = result.parsedHeader.content.token;
                sessionStore.save(my.config.urlBase, session, function(saveErr) {
                  if (!saveErr) {
                    log.debug('%s saved session', app.name);
                    log.debug(session);
                    if (!(plain || self._noAuthHeader || path === my.config.logoutPath)) {
                      // decrypt body if present
                      res.body = my.decryptBody(result, header);
                    }
                    callback(err, result);
                  } else {
                    err = 'save session error';
                    log.error('%s %s', app.name, err);
                    callback(err);
                  }
                });
              } else {
                callback(procErr);
              }
            });
          }
        });
      } else {
        err = 'unknown transport';
        log.error('%s %s %s', app.name, err, transport);
        callback(err);
      }
    },
    /**
     * Perform a request
     *
     * @param {String} method The required method
     * @param {String} path The required path
     * @param {Boolean} plain = false The required plain
     * @param {Object} header The header for the request
     * @param {Object} session The session
     * @param {Function} callback The callback: next(err, res)
     * @param {Error/String} callback.err The error if occurred
     * @param {Object} callback.res The response received from the server
     * @private
     */
    doAuthorize: function (method, path, plain, header, session, callback) {
      var ws = getWebsocketPlugin(),
          self = this,
          transports = app.config.transports,
          i = 0,
          error,
          response;

      if (ws) {
        if (transports && transports.length > 0) {
          async.whilst(
            function() {
              return (i < transports.length);
            },
            function (done) {
              self.doRequest(transports[i], method, path, plain, header, session, function (err, res) {
                error = err;
                response = res;
                if (!err && res && res.ok) {
                  i = transports.length;
                } else {
                  i++;
                  if (i < transports.length) {
                    delete self.request;
                  }
                }
                done();
              });
            },
            function (err) {
              callback(err || error, response);
            }
          );
        } else {
          error = 'no transport available';
          log.error('%s %s', app.name, error);
          callback(error);
        }
      } else {
        this.doRequest('http', method, path, plain, header, session, callback);
      }
    },
    /**
     * @inheritdoc #authorize
     */
    authorize: function(opts) {
      if (this._noAuthHeader) {
        this.connect(opts);
      } else {
        opts = opts || {};
        var path = opts.path || this.path,
            callback = opts.callback,
            plain = (opts.plain || this.plain),
            mode = (plain ? 'auth-plain' : 'auth'),
            method = opts.method || this.method,
            self = this;
        sessionStore.load(my.config.urlBase, function(err, session) {
          if (err) {
            log.error('%s %s', app.name, err);
            callback(err);
          } else if (session){
            // if the client handle a wrong session the request is made without header because
            // the server was unable to destroy the relative session
            if (path === my.config.logoutPath && (!session.token || !session.sid)) {
              // destroy local session
              sessionStore.destroy.call(sessionStore, my.config.urlBase);
              // make a new request without authorization header
              self._noAuthHeader = true;
              self.connect(opts);
            } else if (!session.token) {
              err = 'missing authentication token';
              log.error('%s %s', app.name, err);
              callback(err);
            } else if (!session.sid) {
              err = 'missing sid';
              log.error('%s %s', app.name, err);
              callback(err);
            } else {
              var authorization = new Authorization({
                mode: mode,
                key: my.config.key,
                cert: my.config.cert,
                encoderCert: session.cert,
                sid: session.sid,
                secret: my.generateSecret(),
                token: session.token
              });
              self.doAuthorize(method, path, plain, authorization, session, callback);
            }
          } else {
            err = 'session not found';
            log.error('%s %s', app.name, err);
            callback(err);
          }
        });
      }
      return this;
    },
    /**
     * Complete a request and get the response from the server
     *
     * @chainable
     * @param {Function} callback The function executed after the server reply: callback(err, res)
     * @param {String} callback.err The error if occurred
     * @param {ServerResponse} callback.res The server response
     * @return {Client} The client instance
     */
    end: function(callback) {
      this.authorize({ callback: callback });
      return this;
    },
    /**
     * Compose a query-string
     *
     * ## Example
     *
     * To compose a query-string like "?format=json&data=here" in a GET request:
     *
     *        var client = require('authorify-client')({
     *          // set your options
     *        });
     *        client
     *          .get('/someroute')
     *          .query({ format: 'json' })
     *          .query({ data: 'here' })
     *          .end(function(err, res){
     *            // your logic
     *          });
     *
     * @chainable
     * @param {Object} value The object to compose the query
     * @return {Client} The client instance
     */
    query: function(value) {
      if (value) {
        if (config.encryptQuery) {
          this._pendingQuery = this._pendingQuery || [];
          this._pendingQuery.push(value);
        } else {
          this.request.query(value);
        }
      }
      return this;
    },
    /**
     * Add a body in a POST/PUT request
     *
     * ## Example
     *
     *        var client = require('authorify-client')({
     *          // set your options
     *        });
     *        client
     *          .post('/user')
     *          .send({ name: 'alex', surname: 'smith' })
     *          .end(function(err, res){
     *            // your logic
     *          });
     *
     * @param {Object} value The object to compose the body
     * @return {Client} The client instance
     */
    send: function(value) {
      if (value) {
        this._pendingContent = this._pendingContent || [];
        this._pendingContent.push(value);
      }
      return this;
    },
    /**
     * Abort the current request
     *
     * @chainable
     * @return {Client} The client instance
     */
    abort: function() {
      if (this.request) {
        this.request.abort();
      }
      return this;
    },
    /**
     * Do not add the Authorization header (for free routes)
     *
     * @chainable
     * @return {Client} The client instance
     */
    pass: function() {
      this._noAuthHeader = true;
      return this;
    }
  });

  /**
   * @inheritdoc node_modules.authorify_client.mixin.WithCrypto#generateSecret
   * @private
   */
  my.generateSecret = function() {
    return Crypter.generateSecret();
  };

  /**
   * Decrypt the body
   *
   * @param {ServerResponse} res The server response
   * @param {Header} header The header
   * @returns {Object} The decrypted body
   * @private
   */
  my.decryptBody = function(res, header) {
    var _body;
    if (res && res.body) {
      if (res.parsedHeader && header) {
        switch (res.parsedHeader.payload.mode) {
          case 'auth':
            if (_.isObject(res.body)) {
              if (res.body[my.config.encryptedBodyName]) {
                var _secretBackup = header.getSecret();
                var secret = header.keychain.decryptRsa(res.parsedHeader.payload.secret);
                // set secret of the server
                header.setSecret(secret);
                // decrypt the body
                _body = header.decryptContent(res.body[my.config.encryptedBodyName]);
                // verify the signature
                if (my.config.signBody) {
                  var signature = res.body[my.config.encryptedSignatureName];
                  if (!signature) {
                    throw new CError('missing signature').log();
                  }
                  var signVerifier = new Crypter({
                    cert: res.session.cert
                  });
                  if (!signVerifier.verifySignature(JSON.stringify(_body), signature)) {
                    throw new CError('forgery message').log();
                  }
                }
                header.setSecret(_secretBackup);
              } else {
                _body = res.body;
              }
            } else {
              throw new CError('wrong body format').log();
            }
            break;
          default:
            _body = res.body;
            break;
        }
      } else {
        throw new CError('missing response header').log();
      }
    }

    return _body;
  };

  /**
   * Parse the Authorization header and verify it
   *
   * @param {ServerResponse} res The server response
   * @param {Function} next The callback: next(err, res)
   * @param {String} next.err The error if occurred
   * @param {ServerResponse} next.res The server response
   * @private
   */
  my.processHeader = function(res, next) {
    var authHeader = res.headers[authHeaderKey.toLowerCase()] || '',
        senderCert,
        reqSid,
        reqToken;
    async.series([
      // parse header
      function(callback) {
        if (authHeader.length === 0) {
          callback('missing header');
        } else {
          res.parsedHeader = Header.parse(authHeader, my.config.key, my.config.cert);
          senderCert = res.parsedHeader.payload.cert;  // get the certificate in handshake
          reqSid = res.parsedHeader.payload.sid;
          reqToken = res.parsedHeader.content.token;
          callback(null);
        }
      },
      // get sender certificate using payload cert (in handshake phase) or payload sid
      function(callback) {
        if (res.parsedHeader.payload.mode === 'handshake') {
          res.session = {
            sid: reqSid,
            cert: senderCert,
            token: reqToken
          };
          callback(null);
        } else {
          var querySid;
          if (sessionStore instanceof Store || 'undefined' !== typeof window) {
            querySid = my.config.urlBase;
          } else {
            querySid = reqSid;
          }
          // load the session if exists
          sessionStore.load(querySid, function(err, session){
            if (err) {
              callback(err);
            } else if (session) {
              log.debug('%s loaded session', app.name);
              log.debug(session);
              res.session = session;
              callback(null);
            } else {
              callback('session expired');
            }
          });
        }
      },
      // verify certificate authenticity
      function(callback) {
        if (res.session && res.session.cert) {
          if (res.parsedHeader.payload.mode === 'handshake') {
            if (my.config.crypter.verifyCertificate(res.session.cert)) {
              callback(null);
            } else {
              callback('unknown certificate');
            }
          } else {
            callback(null);
          }
        } else {
          callback('wrong session');
        }
      },
      // verify signature using sender certificate
      function(callback) {
        if (!res.parsedHeader.signature) {
          callback('unsigned');
        } else {
          var signVerifier = new Crypter({
            cert: res.session.cert
          });
          if (signVerifier.verifySignature(JSON.stringify(res.parsedHeader.content), res.parsedHeader.signature)) {
            callback(null);
          } else {
            callback('forgery');
          }
        }
      },
      // verify the date
      function(callback) {
        if (parseInt(config.clockSkew, 10) > 0) {
          var now = new Date().toSerialNumber(),
              sent = res.parsedHeader.content.date;
          if ((now - sent) > config.clockSkew * 1000) {
            callback('date too old');
          } else {
            callback(null);
          }
        } else {
          callback(null);
        }
      }
    ], function(error) {
      if (error) {
        log.error('%s %s', app.name, error);
      }
      next(error, res);
    });
  };

  /**
   * Get the config by name
   *
   * @param {String} name The name of the config
   * @return {Config} The configuration
   */
  my.getConfig = function(name) {
    var cfg;
    if (name && _.isString(name)) {
      cfg = my.configs[name];
    }
    return cfg;
  };

  /**
   * Delete a non active configuration
   *
   * @chainable
   * @param {String} name The name of the configuration
   * @return {Client} The client instance
   */
  my.deleteConfig = function(name) {
    var err;
    if (name) {
      if (name === my.config.name) {
        throw new CError('unable to remove active configuration').log();
      }
      delete my.configs[name];
    }
    return this;
  };

  /**
   * Create a local config based on default config.
   *
   * ## Example
   *
   *        var client = require('authorify-client')({
   *          port: 3000
   *          // set other options
   *        });
   *        client
   *          .set({
   *            name: 'newconfig',
   *            port: 4000,
   *            headers: {
   *              'custom-header-1': 'value',
   *              'custom-header-2': 'value'
   *            }
   *          })
   *          .get('/someroute')
   *          .end(function(err, res){
   *            // your logic here
   *          });
   *
   *        console.log(client.configs.newconfig.port);  // it is 4000
   *        console.log(client.configs.config.port);     // it is 3000
   *        console.log(client.config.port);             // it is 4000 because newconfig is the active configuration
   *
   *        // switch to 'config' configuration
   *        client.set('config');
   *
   * @chainable
   * @param {Object/String} [opts] The init configuration options or the active config name using default values
   * @param {String} opts.name = 'config' The name of the configuration to activate, create or update
   * @param {String} opts.protocol The protocol for requests
   * @param {String} opts.host The host of the server
   * @param {Integer} opts.port The port of the server
   * @param {String} opts.key The client private RSA key
   * @param {String} opts.cert The client public X.509 cert
   * @param {String} opts.ca The Certification Authority certificate
   * @param {String} opts.handshakePath The route exposed by the server for the handshake phase
   * @param {String} opts.authPath The route exposed by the server for the authentication/authorization phases
   * @param {String} opts.logoutPath The route exposed by the server for the logout
   * @param {String} opts.id The id (uuid) assigned to the client
   * @param {String} opts.app The app (uuid) assigned to the application that the client want to use
   * @param {Object} opts.headers Additional headers
   * @param {Object} opts.encryptedBodyName The property name for the encrypted body value
   * @param {Integer} opts.requestTimeout Timeout in milliseconds for requests
   * @param {String} opts.SECRET The secret key used in hash operations
   * @param {String} opts.SECRET_CLIENT The key used in conjunction with SECRET to verify handshake token
   */
  my.setConfig = function(opts) {
    opts = formatOptions(opts);
    var name = opts.name,
        cfg = my.getConfig(name);
    if (cfg) {
      delete opts.name;
      if (_.isEmpty(opts)) {
        my.config = cfg;
      } else {
        // delete older configuration
        delete my.configs[name];
        // create new configuration
        opts.name = name;
        my.createNewConfig(opts);
        log.debug("%s updated configuration '%s'", app.name, name);
      }
    } else {
      my.createNewConfig(opts);
      log.debug("%s created new configuration '%s'", app.name, name);
    }

    return this;
  };

  /**
   * Create a new configuration
   *
   * @param {Object} opts Config options
   * @private
   * @ignore
   */
  my.createNewConfig = function(opts) {
    opts = getConfigOptions(opts);
    var name = opts.name;
    if (!(my.configs[name])) {
      my.configs[name] = new Config(opts);
    }
    my.config = my.configs[name];
  };

  /**
   * Perform a handshake request
   *
   * @chainable
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.handshake = function(callback) {
    var _client = new Client();
    _client.handshake(callback);
    return _client;
  };

  /**
   * Perform an authentication request
   *
   * @chainable
   * @param {String} username The username for interactive login
   * @param {String} password The password for interactive login
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.authenticate = function(username, password, callback) {
    var _client = new Client();
    _client.authenticate(username, password, callback);
    return _client;
  };

  /**
   * Perform an authorize request
   *
   * @chainable
   * @param {Object} opts The options for authorization
   * @param {String} opts.path The required route
   * @param {String} [opts.method = 'GET'] The http verb
   * @param {Boolean} [opts.plain = false] True if the request body is in plaintext
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} opts.callback.err The error if occurred
   * @param {ServerResponse} opts.callback.res The server response
   * @return {Client} The client instance
   */
  my.authorize = function(opts) {
    var _client = new Client();
    _client.authorize(opts);
    return _client;
  };

  /**
   * Create a new client agent to request a route
   *
   * @chainable
   * @param {String} [method = 'GET'] The http verb
   * @param {String} path The required route
   * @param {Boolean} [plain = false] True if the request body is in plaintext
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   * @private
   */
  my.createClient = function(method, path, plain, callback) {
    var opts = fixRequestOptions(method, path, plain, callback);
    _.extend(opts, my.config);
    var _client = new Client(opts);
    if (opts.callback) {
      _client.end(opts.callback);
    }
    return _client;
  };

  /**
   * Perform a login action (handshake + authentication). Note that the required 'id' and 'app' are
   * defined into the active configuration.
   *
   * @chainable
   * @param {String} username The username for interactive login
   * @param {String} password The password for interactive login
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.login = function( username, password, callback) {
    var _client = my.handshake(function(err, res) {
      if (!err) {
        _client.authenticate(username, password, callback);
      } else {
        callback(err, res);
      }
    });
    return _client;
  };

  /**
   * Perform a logout request
   *
   * @chainable
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.logout = function(callback) {
    if (!callback) {
      callback = function() {};
    }
    return my.get(my.config.logoutPath, callback);
  };

  /**
   * Destroy the session for the required or active configuration.
   *
   * @param {String} name The config name
   * @return {Client} The client instance
   * @chainable
   */
  my.destroySession = function(name) {
    name = name || defaultConfigName;
    sessionStore.destroy(my.configs[name].urlBase);
    return this;
  };

  /**
   * Perform a GET request
   *
   * @method get
   * @chainable
   * @param {String} path The required route
   * @param {Boolean} [plain = false] True if the request body is in plaintext
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.get = function(path, plain, callback) {
    return my.createClient('GET', path, plain, callback);
  };

  /**
   * Perform a POST request
   *
   * @chainable
   * @param {String} path The required route
   * @param {Boolean} [plain = false] True if the request body is in plaintext
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.post = function(path, plain, callback) {
    return my.createClient('POST', path, plain, callback);
  };

  /**
   * Perform a PUT request
   *
   * @chainable
   * @param {String} path The required route
   * @param {Boolean} [plain = false] True if the request body is in plaintext
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.put = function(path, plain, callback) {
    return my.createClient('PUT', path, plain, callback);
  };

  /**
   * Perform a DELETE request
   *
   * @chainable
   * @param {String} path The required route
   * @param {Boolean} [plain = false] True if the request body is in plaintext
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.del = function(path, plain, callback) {
    return my.createClient('DELETE', path, plain, callback);
  };

  /**
   * Perform a HEAD request
   *
   * @chainable
   * @param {String} path The required route
   * @param {Boolean} [plain = false] True if the request body is in plaintext
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.head = function(path, plain, callback) {
    return my.createClient('HEAD', path, plain, callback);
  };

  /**
   * Perform a PATCH request
   *
   * @chainable
   * @param {String} path The required route
   * @param {Boolean} [plain = false] True if the request body is in plaintext
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.patch = function(path, plain, callback) {
    return my.createClient('PATCH', path, plain, callback);
  };

  /**
   * Perform a OPTIONS request
   *
   * @method options
   * @chainable
   * @param {String} path The required route
   * @param {Boolean} [plain = false] True if the request body is in plaintext
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.options = function(path, plain, callback) {
    return my.createClient('OPTIONS', path, plain, callback);
  };

  /**
   * @method opts
   * @chainable
   * @inheritdoc #options
   */
  my.opts = my.options;

  /**
   * Load a plugin module to add some functionality.
   *
   * ## Example
   *
   *      var authorify = require('authorify-client')({
   *        // add your options
   *      });
   *      authorify.load('pluginname', 'shortname', opts);  // opts is an optional object to configure the plugin
   *      var loadedPlugin = authorify.plugin['shortname'];
   *      // below you can use all methods/properties exported by the plugin (loadedPlugin)
   *
   * @param {String} name The name of the plugin. THe plugin must be installed into the
   * application folder that uses the authorify module.
   * @param {String} [shortname] An optional short name for the plugin loaded as property in the root application
   * (authorify.plugin['shortname']).
   * @param {Object} [opts] The options required by the plugin.
   */
  my.load = function(name, shortname, opts) {
    if (_.isObject(shortname)) {
      opts = shortname;
      shortname = name;
    } else if (!shortname) {
      shortname = name;
    }
    opts = opts || {};
    var plugin;
    if ('undefined' === typeof window) {
      plugin = require(name)(app, opts);
    } else {
      name = getModuleName(name);
      plugin = window[name](app, opts);
    }
    if (plugin) {
      my.plugin[shortname] = plugin;
      log.info('%s plugin %s loaded with name %s', app.name, name, shortname);
    } else {
      log.error('%s plugin %s not loaded', app.name, name);
    }
  };

  /**
   * A crypter class
   *
   * @private
   */
  my.Crypter = Crypter;

  // init config
  my.setConfig();

  return my;
};

},{}],18:[function(require,module,exports){
/**
 * @class node_modules.authorify.config.browser
 * @ignore
 *
 * @author Marcello Gesmundo
 *
 * # License
 *
 * Copyright (c) 2012-2014 Yoovant by Marcello Gesmundo. All rights reserved.
 *
 * This program is released under a GNU Affero General Public License version 3 or above, which in summary means:
 *
 * - You __can use__ this program for __no cost__.
 * - You __can use__ this program for __both personal and commercial reasons__.
 * - You __do not have to share your own program's code__ which uses this program.
 * - You __have to share modifications__ (e.g bug-fixes) you've made to this program.
 *
 * For more convoluted language, see the LICENSE file.
 *
 */
module.exports = function(app) {
  'use strict';

  require('./default')(app);
  require('logged-errors');

  app.logger.info('%s browser config loaded', app.name);

  return app;
};

},{"./default":19,"logged-errors":31}],19:[function(require,module,exports){
/**
 * The configuration.
 *
 * @class node_modules.authorify_client
 *
 * @author Marcello Gesmundo
 *
 * # License
 *
 * Copyright (c) 2012-2014 Yoovant by Marcello Gesmundo. All rights reserved.
 *
 * This program is released under a GNU Affero General Public License version 3 or above, which in summary means:
 *
 * - You __can use__ this program for __no cost__.
 * - You __can use__ this program for __both personal and commercial reasons__.
 * - You __do not have to share your own program's code__ which uses this program.
 * - You __have to share modifications__ (e.g bug-fixes) you've made to this program.
 *
 * For more convoluted language, see the LICENSE file.
 *
 */
module.exports = function(app) {
  'use strict';

  // dependencies
  var _          = require('underscore'),
      iDate      = require('internet-timestamp'),
      superagent = require('superagent'),
      async      = require('async'),
      util       = require('util'),
      base64url  = require('base64url'),
      Store      = app.class.Store;

  // namespace
  var my = {};

  my.config = {
    /**
     * @ignore
     * @private
     */
    name: 'authorify client',
    /**
     * @cfg {Object} [logger = console] The logger. It MUST have
     * log, error, warn, info, debug methods
     */
    logger: console, // for best logging please use winston (node environment): npm install winston
    /**
     * @cfg {Object} crypto Cryptographic engine
     */
    crypto: undefined,
    /**
     * @cfg {String} cert The client X.509 certificate in pem format
     */
    cert: undefined,
    /**
     * @cfg {String} key The client private RSA key in pem format
     */
    key: undefined,
    /**
     * @cfg {String} ca The Certification Authority certificate in pem format
     */
    ca: undefined,
    /**
     * @cfg {Object} sessionStore The store for the sessions
     */
    sessionStore: undefined,
    /**
     * @cfg {String} SECRET The secret key used in hash operations
     */
    SECRET: 'secret',  // use your own SECRET!
    /**
     * @cfg {String} SECRET_CLIENT The key used in conjunction with SECRET to verify handshake token
     */
    SECRET_CLIENT: 'secret_client',  // use your own SECRET_CLIENT,
    /**
     * @cfg {String} encryptedBodyName = 'ncryptdbdnm' The property name for the encrypted body value
     */
    encryptedBodyName: 'ncryptdbdnm',
    /**
     * @cfg {String} encryptedSignatureName = 'ncryptdsgnnm' The property name for the signature value of the body
     */
    encryptedSignatureName: 'ncryptdsgnnm',
    /**
     * @cfg {Boolean} signBody = true Sign the body when it is sent encrypted
     */
    signBody: true,
    /**
     * @cfg {Boolean} encryptQuery = true Encrypt the values in url query string
     */
    encryptQuery: true,
    /**
     * @cfg {String} authHeader='Authorization' The header used for authentication and authorization
     */
    authHeader: 'Authorization',
    /**
     * @cfg {String} protocol='http' The protocol for requests
     */
    protocol: 'http',
    /**
     * @cfg {String} host='localhost' The host of the server
     */
    host: 'localhost',
    /**
     * @cfg {Integer} port=3000 The port of the server
     */
    port: 3000,
    /**
     * @cfg {String} handshakePath='/handshake' The route exposed by the server for the handshake phase
     */
    handshakePath: '/handshake',
    /**
     * @cfg {String} authPath='/auth' The route exposed by the server for the authentication/authorization phases
     */
    authPath: '/auth',
    /**
     * @cfg {String} logoutPath='/logout' The route exposed by the server for the logout
     */
    logoutPath: '/logout',
    /**
     * @cfg {Integer} requestTimeout=10000 Timeout in milliseconds for requests
     */
    requestTimeout: 10000, // 10s
    /**
     * @cfg {Integer} clockSkew=0 Max age (in seconds) of the request/reply.
     * Every request must have a valid response within clockSkew seconds.
     * Note: you must enable a NTP server both on client and server. Set 0 to disable date check or 300 like Kerberos.
     */
    clockSkew: 0,
    /**
     * @cfg {String} id The id (uuid) assigned to the client
     */
    id: undefined,
    /**
     * @cfg {String} app The app (uuid) assigned to the application that the client want to use
     */
    app: undefined
  };

  // merge app.config with default config
  app.config = _.extend(my.config, app.config);

  if (!app.config.sessionStore) {
    app.config.sessionStore = new Store('session');
  }

  // empty function
  var emptyFn = function() {};

  if (app.config.logger) {
    if ('function' !== typeof app.config.logger.debug) {
      // console does not have debug method
      app.config.logger.debug = app.config.logger.log;
    }
  } else {
    app.config.logger = {
      debug: emptyFn,
      log: emptyFn,
      warn: emptyFn,
      error: emptyFn,
      info: emptyFn
    };
  }

  app.name = app.config.name;
  app._ = _;
  app.async = async;
  app.iDate = iDate;
  app.base64url = base64url;
  app.superagent = superagent;
  app.util = util;
  app.logger = app.config.logger;
  app.sessionStore = app.config.sessionStore;

  app.logger.info('%s default config loaded', app.name);

  return app;
};

},{"async":26,"base64url":27,"internet-timestamp":29,"superagent":40,"underscore":43,"util":10}],20:[function(require,module,exports){
module.exports = function(app) {
  'use strict';

  var extend = app.jsface.extend,
      iDate = app.iDate;

  var dateExt = {
    toRfc3339: function() {
      return iDate(this);
    },
    toSerialNumber: function() {
      return this.getTime() - (new Date(1970,1,1)).getTime();
    }
  };

  extend(Date.prototype, dateExt);

  return dateExt;
};
},{}],21:[function(require,module,exports){
module.exports = function(app) {
  'use strict';

  var extend = app.jsface.extend;

  var regExp = {
    isUuid: function() {
      return (this.match(/([a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}?)/ig) ? true : false);
    },
    isBase64: function() {
      return (this.match(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/i) ? true : false);
    },
    isHex: function() {
      return (this.match(/(0x)?[0-9a-f]+/i) ? true : false);
    }
  };

  extend(String.prototype, regExp);

  return regExp;
};
},{}],22:[function(require,module,exports){
module.exports = function(app) {
  'use strict';

  var extend = app.jsface.extend;

  var stringExt = {
    capitalize: function() {
      return this.charAt(0).toUpperCase() + this.slice(1);
    },
    startsWith: function(starts) {
      if (starts === '') {
        return true;
      }
      if (starts === null || starts === undefined) {
        return false;
      }
      starts = String(starts);
      if (this.length >= starts.length) {
        return (this.slice(0, starts.length) === starts);
      }
      return false;
    },
    newLineSanify: function() {
      return this.replace(/(\r\n|\n\r|\r)/gm, '\n');
    },
    urlSanify: function() {
      var result = this;
      if (result.length > 0) {
        if (result.charAt(0) !== '/') {
          result = '/' + result;
        }
        if (result.length > 1 && result.charAt(result.length - 1) === '/') {
          result = result.slice(0, result.length - 1);
        }
      } else {
        result = '/';
      }
      return result;
    }
  };

  extend(String.prototype, stringExt);

  return stringExt;
};
},{}],23:[function(require,module,exports){
/**
 * A mixin class with useful properties.
 *
 * @class node_modules.authorify_client.mixin.WithContent
 * @inheritable
 *
 * @author Marcello Gesmundo
 *
 * # License
 *
 * Copyright (c) 2012-2014 Yoovant by Marcello Gesmundo. All rights reserved.
 *
 * This program is released under a GNU Affero General Public License version 3 or above, which in summary means:
 *
 * - You __can use__ this program for __no cost__.
 * - You __can use__ this program for __both personal and commercial reasons__.
 * - You __do not have to share your own program's code__ which uses this program.
 * - You __have to share modifications__ (e.g bug-fixes) you've made to this program.
 *
 * For more convoluted language, see the LICENSE file.
 *
 */
module.exports = function(app) {
  'use strict';

  var _      = app._,
      forge  = app.config.crypto,
      Class  = app.jsface.Class,
      SECRET = app.config.SECRET,
      errors = app.errors;

  var CError = errors.InternalError;

  return Class({
    /**
     * Set the date
     * @param {Date/Integer} date The date as date or number of milliseconds. The date is anyhow saved as integer.
     */
    setDate: function(date) {
      if (_.isDate(date)) {
        this._date = date.toSerialNumber();
      } else if (_.isNumber(date)) {
        this._date = date;
      } else {
        throw new CError('wrong date type').log();
      }
    },
    /**
     * Get the date
     * @return {Integer} The date in milliseconds
     */
    getDate: function() {
      return this._date;
    },
    /**
     * Set the token
     * @param {String} token The token in Base64 format
     */
    setToken: function(token) {
      if (token) {
        if (token.isBase64()) {
          this._token = token;
        } else {
          throw new CError('token not valid').log();
        }
      }
    },
    /**
     * Get the token
     * @return {String} The token in Base64 format
     */
    getToken: function() {
      return this._token;
    },
    /**
     * Set the id if the client
     * @param {String} id The id of the client as uuid string
     */
    setId: function(id) {
      if (id) {
        if (id.isUuid()) {
          this._id = id;
        } else {
          throw new CError('id not valid').log();
        }
      }
    },
    /**
     * Get the id of the client
     * @return {String} The id of the client as uuid string
     */
    getId: function() {
      return this._id;
    },
    /**
     * Set the app used by the client
     * @param {String} app The app used by the client as uuid string
     */
    setApp: function(app) {
      if (app) {
        if (app.isUuid()) {
          this._app = app;
        } else {
          throw new CError('app not valid').log();
        }
      }
    },
    /**
     * Get the app used by the client
     * @return {String} The app used by the client as uuid string
     */
    getApp: function() {
      return this._app;
    },
    /**
     * Set the username for interactive login
     * @param {String} username The username for the login
     */
    setUsername: function(username) {
      if (username) {
        this._username = username;
      }
    },
    /**
     * Get the username
     * @return {String} The username for the login
     */
    getUsername: function() {
      return this._username;
    },
    /**
     * Set the password for interactive login
     * @param {String} password The password for the login
     */
    setPassword: function(password) {
      // empty password not allowed
      if (password) {
        var hmac = forge.hmac.create();
        hmac.start('sha256', SECRET);
        hmac.update(password);
        this._password = password;
        this._passwordHash = hmac.digest().toHex();
      }
    },
    /**
     * Get the password
     * @return {String} The password for the login
     */
    getPassword: function() {
      return this._password;
    },
    /**
     * Verify the password
     * @param {String} password The password to verify
     * @return {Boolean} True if the password match the password used in login phase (the verify is based on SHA256 digest)
     */
    verifyPassword: function(password) {
      if (password) {
        var hmac = forge.hmac.create();
        hmac.start('sha256', SECRET);
        hmac.update(password);
        return hmac.digest().toHex() === this._passwordHash;
      }
      return false;
    }
  });
};
},{}],24:[function(require,module,exports){
/**
 * A mixin class with encryption features.
 *
 * @class node_modules.authorify_client.mixin.WithCrypto
 * @inheritable
 *
 * @author Marcello Gesmundo
 *
 * # License
 *
 * Copyright (c) 2012-2014 Yoovant by Marcello Gesmundo. All rights reserved.
 *
 * This program is released under a GNU Affero General Public License version 3 or above, which in summary means:
 *
 * - You __can use__ this program for __no cost__.
 * - You __can use__ this program for __both personal and commercial reasons__.
 * - You __do not have to share your own program's code__ which uses this program.
 * - You __have to share modifications__ (e.g bug-fixes) you've made to this program.
 *
 * For more convoluted language, see the LICENSE file.
 *
 */
module.exports = function(app) {
  'use strict';

  var forge     = app.config.crypto,
      base64url = app.base64url,
      Class     = app.jsface.Class,
      errors    = app.errors,
      pki       = forge.pki,
      caStore   = pki.createCaStore(),
      SCHEME    = 'RSA-OAEP',
      MODE      = 'CTR';

  var CError = errors.InternalError;

  return Class({
    $statics: {
      /**
       * Get bytes from a secret key
       *
       * @param {String} secret The secret in Base64 format
       * @return {Bytes} The secret bytes
       * @static
       * @private
       */
      getBytesFromSecret: function(secret) {
        var keyIv;
        if (!secret) {
          throw new CError('missing secret').log();
        }
        // secret is a Base64 string
        if(secret.isBase64()){
          try {
            keyIv = forge.util.decode64(secret);
          } catch (e) {
            throw new CError('secret not valid').log();
          }
        } else {
          keyIv = secret;
        }
        return keyIv;
      },
      /**
       * Generate a new secret key
       *
       * @return {String} The secret in Base64 format
       * @static
       */
      generateSecret: function() {
        return forge.util.encode64(forge.random.getBytesSync(16));
      }
    },
    /**
     * Set the private RSA key
     * @param {String} pem The private RSA key in pem format
     */
    setKey: function(pem) {
      if (pem) {
        this._key = pki.privateKeyFromPem(pem);
      }
    },
    /**
     * Get the private RSA key in native format
     * @return {String} The private RSA key
     */
    getKey: function() {
      return this._key;
    },
    /**
     * Get the private RSA key in pem format
     * @return {String} The private RSA key
     */
    getKeyPem: function() {
      return pki.privateKeyToPem(this._key).newLineSanify();
    },
    /**
     * Set the X.509 certificate
     * @param {String} pem The X.509 certificate in pem format
     */
    setCert: function(pem) {
      if (pem) {
        this._cert = pki.certificateFromPem(pem);
      }
    },
    /**
     * Get the X.509 certificate in native format
     * @return {String} The X.509 certificate
     */
    getCert: function() {
      return this._cert;
    },
    /**
     * Get the X.509 certificate in pem format
     * @return {String} The X.509 certificate
     */
    getCertPem: function() {
      return pki.certificateToPem(this._cert).newLineSanify();
    },
    /**
     * Set the CA certificate
     * @param {String} pem The CA certificate in pem format
     */
    setCa: function(pem) {
      if (pem) {
        this._ca = pki.certificateFromPem(pem);
        caStore.addCertificate(this._ca);
      }
    },
    /**
     * Get the CA certificate in native format
     * @return {String} The CA certificate
     */
    getCa: function() {
      return this._ca;
    },
    /**
     * Get the CA certificate in pem format
     * @return {String} The CA certificate
     */
    getCaPem: function() {
      return pki.certificateToPem(this._ca).newLineSanify();
    },
    /**
     * Encrypt data using RSA public key inside the X.509 certificate
     * @param {String} data The data to encrypt
     * @param {String} [scheme='RSA-OAEP'] The scheme to be used in encryption.
     * Use 'RSAES-PKCS1-V1_5' in legacy applications.
     * @return {String} The RSA encryption result in Base64
     */
    encryptRsa: function (data, scheme) {
      // scheme = RSA-OAEP, RSAES-PKCS1-V1_5
      scheme = scheme || SCHEME;
      return forge.util.encode64(this._cert.publicKey.encrypt(data, scheme));
    },
    /**
     * Decrypt RSA encrypted data
     * @param {String} data The data to decrypt
     * @param {String} [scheme='RSA-OAEP'] The mode to use in decryption. 'RSA-OAEP', 'RSAES-PKCS1-V1_5' are allowed schemes.
     * @return {String} The decrypted data
     */
    decryptRsa: function (data, scheme) {
      scheme = scheme || SCHEME;
      return this._key.decrypt(forge.util.decode64(data), scheme);
    },
    /**
     * Encrypt data using AES cipher
     * @param {String} data The data to encrypt
     * @param {Bytes} secret The secret to use in encryption
     * @param {String} [encoder = 'base64'] base64 or url final encoding
     * @param {String} [mode = 'CTR'] The mode to use in encryption. 'CBC', 'CFB', 'OFB', 'CTR' are allowed modes.
     * @return {String} The AES encryption result in Base64
     */
    encryptAes: function (data, secret, encoder, mode) {
      // mode = CBC, CFB, OFB, CTR
      mode = mode || MODE;
      var keyIv = this.getBytesFromSecret(secret);
      var cipher = forge.aes.createEncryptionCipher(keyIv, mode);
      cipher.start(keyIv);
      cipher.update(forge.util.createBuffer(data));
      cipher.finish();
      if (encoder === 'url') {
        return base64url(cipher.output.data);
      }
      return forge.util.encode64(cipher.output.data);
    },
    /**
     * Decrypt AES encrypted data
     * @param {String} data The data to decrypt
     * @param {String} secret The secret to use in decryption in Base64 format
     * @param {String} [encoder = 'base64'] base64 or url encoding
     * @param {String} [mode='CTR'] The mode to use in decryption. 'CBC', 'CFB', 'OFB', 'CTR' are allowed modes.
     * @return {String} The decrypted data
     */
    decryptAes: function (data, secret, encoder, mode) {
      // mode = CBC, CFB, OFB, CTR
      mode = mode || MODE;
      var keyIv = this.getBytesFromSecret(secret);
      var cipher = forge.aes.createDecryptionCipher(keyIv, mode);
      cipher.start(keyIv);
      var decoded;
      if (encoder === 'url') {
        decoded = base64url.decode(data);
      } else {
        decoded = forge.util.decode64(data);
      }
      cipher.update(forge.util.createBuffer(decoded));
      cipher.finish();
      return cipher.output.data;
    },
    /**
     * Create a signature (RSA-SHA1) for the message
     * @param {String} message The message to sign
     * @returns {String} The signature in Base64
     */
    sign: function (message) {
      var md = forge.md.sha1.create();
      md.update(message, 'utf8');
      return forge.util.encode64(this._key.sign(md));
    },
    /**
     * Verify a signature (RSA-SHA1) for the message
     * @param {String} message The message signed
     * @param {String} signature The signature of the message in Base64 format
     * @returns {Boolean} True is the signature is successful verified
     */
    verifySignature: function (message, signature) {
      var md = forge.md.sha1.create();
      md.update(message, 'utf8');
      try {
        return this._cert.publicKey.verify(md.digest().bytes(), forge.util.decode64(signature));
      } catch (e) {
        return false;
      }
    },
    /**
     * Verify that a X.509 certificate is generated by the CA
     * @param {String} pem The certificate to verify in pem format
     * @returns {Boolean} True if the X.509 certificate is original
     */
    verifyCertificate: function (pem) {
      var certificate = forge.pki.certificateFromPem(pem);
      var issuerCert = caStore.getIssuer(certificate);
      if (issuerCert) {
        try {
          return issuerCert.verify(certificate);
        } catch (e) {
          return false;
        }
      }
      return false;
    }
  });
};

},{}],25:[function(require,module,exports){
/**
 * A mixin class with useful properties.
 *
 * @class node_modules.authorify_client.mixin.WithPayload
 * @inheritable
 *
 * @author Marcello Gesmundo
 *
 * # License
 *
 * Copyright (c) 2012-2014 Yoovant by Marcello Gesmundo. All rights reserved.
 *
 * This program is released under a GNU Affero General Public License version 3 or above, which in summary means:
 *
 * - You __can use__ this program for __no cost__.
 * - You __can use__ this program for __both personal and commercial reasons__.
 * - You __do not have to share your own program's code__ which uses this program.
 * - You __have to share modifications__ (e.g bug-fixes) you've made to this program.
 *
 * For more convoluted language, see the LICENSE file.
 *
 */
module.exports = function(app) {
  'use strict';

  var Class  = app.jsface.Class,
      errors = app.errors;

  var CError = errors.InternalError;

  return Class({
    $statics: {
      /**
       * Array of enabled modes
       * @property {Array}
       * @static
       */
      MODES: ['handshake', 'auth-init', 'auth', 'auth-plain'],
      /**
       * Verify if a mode is allowed
       * @method
       * @param {String} mode The mode to verify
       * @return {Boolean} True if the mode is allowed
       * @static
       */
      isModeAllowed: function(mode) {
        if (this.MODES.indexOf(mode) === -1) {
          throw new CError('not allowed payload mode').log();
        }
        return true;
      }
    },
    /**
     * Set the mode
     * @param {String} mode The mode.
     */
    setMode: function(mode) {
      this.isModeAllowed.call(this, mode);
      this._mode = mode;
    },
    /**
     * Get the mode
     * @return {String} The current mode
     */
    getMode: function() {
      return this._mode;
    },
    /**
     * Set the session identifier
     * @param {String} sid The session identifier
     */
    setSid: function(sessionId) {
      if (sessionId) {
        if (sessionId.length < 24) {
          throw new CError('sid length undersized').log();
        }
        if (sessionId.length > 128) {
          throw new CError('sid length exceeded').log();
        }
        this._sid = sessionId;
      }
    },
    /**
     * Get the session identifier
     * @return {String} The current session identifier
     */
    getSid: function() {
      return this._sid;
    }
  });
};

},{}],26:[function(require,module,exports){
(function (process){
/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
/*jshint onevar: false, indent:4 */
/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
              setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(done) );
        });
        function done(err) {
          if (err) {
              callback(err);
              callback = function () {};
          }
          else {
              completed += 1;
              if (completed >= arr.length) {
                  callback();
              }
          }
        }
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback();
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        if (!callback) {
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err) {
                    callback(err);
                });
            });
        } else {
            var results = [];
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err, v) {
                    results[x.index] = v;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        var remainingTasks = keys.length
        if (!remainingTasks) {
            return callback();
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            remainingTasks--
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (!remainingTasks) {
                var theCallback = callback;
                // prevent final callback from calling itself if it errors
                callback = function () {};

                theCallback(null, results);
            }
        });

        _each(keys, function (k) {
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var attempts = [];
        // Use defaults if times not passed
        if (typeof times === 'function') {
            callback = task;
            task = times;
            times = DEFAULT_TIMES;
        }
        // Make sure times is a number
        times = parseInt(times, 10) || DEFAULT_TIMES;
        var wrappedTask = function(wrappedCallback, wrappedResults) {
            var retryAttempt = function(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            };
            while (times) {
                attempts.push(retryAttempt(task, !(times-=1)));
            }
            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || callback)(data.err, data.result);
            });
        }
        // If a callback is passed, run this as a controll flow
        return callback ? wrappedTask() : wrappedTask
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (!_isArray(tasks)) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (test.apply(null, args)) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (!test.apply(null, args)) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            started: false,
            paused: false,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            kill: function () {
              q.drain = null;
              q.tasks = [];
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (!q.paused && workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                if (q.paused === true) { return; }
                q.paused = true;
                q.process();
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                q.process();
            }
        };
        return q;
    };
    
    async.priorityQueue = function (worker, concurrency) {
        
        function _compareTasks(a, b){
          return a.priority - b.priority;
        };
        
        function _binarySearch(sequence, item, compare) {
          var beg = -1,
              end = sequence.length - 1;
          while (beg < end) {
            var mid = beg + ((end - beg + 1) >>> 1);
            if (compare(item, sequence[mid]) >= 0) {
              beg = mid;
            } else {
              end = mid - 1;
            }
          }
          return beg;
        }
        
        function _insert(q, data, priority, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  priority: priority,
                  callback: typeof callback === 'function' ? callback : null
              };
              
              q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }
        
        // Start with a normal queue
        var q = async.queue(worker, concurrency);
        
        // Override push to accept second parameter representing priority
        q.push = function (data, priority, callback) {
          _insert(q, data, priority, callback);
        };
        
        // Remove unshift function
        delete q.unshift;

        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            drained: true,
            push: function (data, callback) {
                if (!_isArray(data)) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    cargo.drained = false;
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain && !cargo.drained) cargo.drain();
                    cargo.drained = true;
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0, tasks.length);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                async.nextTick(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    async.compose = function (/* functions... */) {
      return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

}).call(this,require("Vyf5Vp"))
},{"Vyf5Vp":8}],27:[function(require,module,exports){
(function (Buffer){
function fromBase64(base64string) {
  return (
    base64string
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  );
}

function toBase64(base64UrlString) {
  if (Buffer.isBuffer(base64UrlString))
    base64UrlString = base64UrlString.toString()

  const b64str = padString(base64UrlString)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  return b64str;
}

function padString(string) {
  const segmentLength = 4;
  const stringLength = string.length;
  const diff = string.length % segmentLength;
  if (!diff)
    return string;
  var position = stringLength;
  var padLength = segmentLength - diff;
  const paddedStringLength = stringLength + padLength;
  const buffer = Buffer(paddedStringLength);
  buffer.write(string);
  while (padLength--)
    buffer.write('=', position++);
  return buffer.toString();
}

function decodeBase64Url(base64UrlString, encoding) {
  return Buffer(toBase64(base64UrlString), 'base64').toString(encoding);
}

function base64url(stringOrBuffer) {
  return fromBase64(Buffer(stringOrBuffer).toString('base64'));
}

function toBuffer(base64string) {
  return Buffer(toBase64(base64string), 'base64');
}

base64url.toBase64 = toBase64;
base64url.fromBase64 = fromBase64;
base64url.decode = decodeBase64Url;
base64url.toBuffer = toBuffer;

module.exports = base64url;

}).call(this,require("buffer").Buffer)
},{"buffer":4}],28:[function(require,module,exports){
/*!
 * cargo 0.8.0+201405131636
 * https://github.com/ryanve/cargo
 * MIT License (c) 2014 Ryan Van Etten
 */
!function(root, name, make) {
  if (typeof module != 'undefined' && module.exports) module.exports = make()
  else root[name] = make()
}(this, 'cargo', function() {

  var cargo = {}
    , win = typeof window != 'undefined' && window
    , son = typeof JSON != 'undefined' && JSON || false
    , has = {}.hasOwnProperty
    
  function clone(o) {
    var k, r = {}
    for (k in o) has.call(o, k) && (r[k] = o[k])
    return r
  }
  
  function test(api, key) {
    if (api) try {
      key = key || 'cargo'+-new Date
      api.setItem(key, key)
      api.removeItem(key)
      return true
    } catch (e) {}
    return false
  }
  
  /**
   * @param {Storage=} api
   * @return {Function} abstraction
   */
  function abstracts(api) {
    var und, stores = test(api), cache = {}, all = stores ? api : cache
    function f(k, v) {
      var n = arguments.length
      if (1 < n) return und === v ? f['remove'](k) : f['set'](k, v), v
      return n ? f['get'](k) : clone(all)
    }
    f['stores'] = stores
    f['decode'] = son.parse
    f['encode'] = son.stringify
    f['get'] = stores ? function(k) {
      return und == (k = api.getItem(k)) ? und : k
    } : function(k) {
      return !has.call(cache, k) ? und : cache[k]
    }
    f['set'] = stores ? function(k, v) {
      api.setItem(k, v)
    } : function(k, v) {
      cache[k] = v
    }
    f['remove'] = stores ? function(k) {
      api.removeItem(k)
    } : function(k) {
      delete cache[k]
    }
    return f
  }

  cargo['session'] = abstracts(win.sessionStorage)
  cargo['local'] = abstracts(win.localStorage)
  cargo['temp'] = abstracts()
  return cargo
});
},{}],29:[function(require,module,exports){
module.exports = function (d) {
    var tzo = 0, m;
    if (m = /([-+]\d+)($|\s*\(\S+\)$)/.exec(d)) {
        tzo = Number(m[1]);
        tzo = -(Math.floor(tzo / 100) * 60 + (tzo % 100));
    }
    if (typeof d === 'string') d = new Date(d);
    
    if (tzo) {
        d = new Date(d.valueOf() - 1000 * (tzo - d.getTimezoneOffset()) * 60);
    }
    else tzo = d.getTimezoneOffset()
    
    var month = pad(d.getMonth() + 1, 2);
    var date = pad(d.getDate(), 2);
    var ymd = [ d.getFullYear(), month, date ].join('-');
    
    var h = pad(d.getHours(), 2);
    var m = pad(d.getMinutes(), 2);
    var s = pad(d.getSeconds(), 2);
    var hms = [ h, m, s ].join(':');
    
    var tzs = tzo > 0 ? '-' : '+';
    var tzh = tzs + pad(Math.floor(Math.abs(tzo) / 60), 2);
    var tzm = pad(Math.abs(tzo) % 60, 2);
    return ymd + 'T' + [h,m,s].join(':') + [tzh,tzm].join(':');
};

function pad (x, n) {
    return (Array(n).join('0') + String(x)).split('').slice(-n).join('');
}

},{}],30:[function(require,module,exports){
/*
 * JSFace Object Oriented Programming Library
 * https://github.com/tnhu/jsface
 *
 * Copyright (c) 2009-2013 Tan Nhu
 * Licensed under MIT license (https://github.com/tnhu/jsface/blob/master/LICENSE.txt)
 */
(function(context, OBJECT, NUMBER, LENGTH, toString, undefined, oldClass, jsface) {
  /**
   * Return a map itself or null. A map is a set of { key: value }
   * @param obj object to be checked
   * @return obj itself as a map or false
   */
  function mapOrNil(obj) { return (obj && typeof obj === OBJECT && !(typeof obj.length === NUMBER && !(obj.propertyIsEnumerable(LENGTH))) && obj) || null; }

  /**
   * Return an array itself or null
   * @param obj object to be checked
   * @return obj itself as an array or null
   */
  function arrayOrNil(obj) { return (obj && typeof obj === OBJECT && typeof obj.length === NUMBER && !(obj.propertyIsEnumerable(LENGTH)) && obj) || null; }

  /**
   * Return a function itself or null
   * @param obj object to be checked
   * @return obj itself as a function or null
   */
  function functionOrNil(obj) { return (obj && typeof obj === "function" && obj) || null; }

  /**
   * Return a string itself or null
   * @param obj object to be checked
   * @return obj itself as a string or null
   */
  function stringOrNil(obj) { return (toString.apply(obj) === "[object String]" && obj) || null; }

  /**
   * Return a class itself or null
   * @param obj object to be checked
   * @return obj itself as a class or false
   */
  function classOrNil(obj) { return (functionOrNil(obj) && (obj.prototype && obj === obj.prototype.constructor) && obj) || null; }

  /**
   * Util for extend() to copy a map of { key:value } to an object
   * @param key key
   * @param value value
   * @param ignoredKeys ignored keys
   * @param object object
   * @param iClass true if object is a class
   * @param oPrototype object prototype
   */
  function copier(key, value, ignoredKeys, object, iClass, oPrototype) {
    if ( !ignoredKeys || !ignoredKeys.hasOwnProperty(key)) {
      object[key] = value;
      if (iClass) { oPrototype[key] = value; }                       // class? copy to prototype as well
    }
  }

  /**
   * Extend object from subject, ignore properties in ignoredKeys
   * @param object the child
   * @param subject the parent
   * @param ignoredKeys (optional) keys should not be copied to child
   */
  function extend(object, subject, ignoredKeys) {
    if (arrayOrNil(subject)) {
      for (var len = subject.length; --len >= 0;) { extend(object, subject[len], ignoredKeys); }
    } else {
      ignoredKeys = ignoredKeys || { constructor: 1, $super: 1, prototype: 1, $superp: 1 };

      var iClass     = classOrNil(object),
          isSubClass = classOrNil(subject),
          oPrototype = object.prototype, supez, key, proto;

      // copy static properties and prototype.* to object
      if (mapOrNil(subject)) {
        for (key in subject) {
          copier(key, subject[key], ignoredKeys, object, iClass, oPrototype);
        }
      }

      if (isSubClass) {
        proto = subject.prototype;
        for (key in proto) {
          copier(key, proto[key], ignoredKeys, object, iClass, oPrototype);
        }
      }

      // prototype properties
      if (iClass && isSubClass) { extend(oPrototype, subject.prototype, ignoredKeys); }
    }
  }

  /**
   * Create a class.
   * @param parent parent class(es)
   * @param api class api
   * @return class
   */
  function Class(parent, api) {
    if ( !api) {
      parent = (api = parent, 0);                                     // !api means there's no parent
    }

    var clazz, constructor, singleton, statics, key, bindTo, len, i = 0, p,
        ignoredKeys = { constructor: 1, $singleton: 1, $statics: 1, prototype: 1, $super: 1, $superp: 1, main: 1, toString: 0 },
        plugins     = Class.plugins;

    api         = (typeof api === "function" ? api() : api) || {};             // execute api if it's a function
    constructor = api.hasOwnProperty("constructor") ? api.constructor : 0;     // hasOwnProperty is a must, constructor is special
    singleton   = api.$singleton;
    statics     = api.$statics;

    // add plugins' keys into ignoredKeys
    for (key in plugins) { ignoredKeys[key] = 1; }

    // construct constructor
    clazz  = singleton ? {} : (constructor ? constructor : function(){});

    // determine bindTo: where api should be bound
    bindTo = singleton ? clazz : clazz.prototype;

    // make sure parent is always an array
    parent = !parent || arrayOrNil(parent) ? parent : [ parent ];

    // do inherit
    len = parent && parent.length;
    while (i < len) {
      p = parent[i++];
      for (key in p) {
        if ( !ignoredKeys[key]) {
          bindTo[key] = p[key];
          if ( !singleton) { clazz[key] = p[key]; }
        }
      }
      for (key in p.prototype) { if ( !ignoredKeys[key]) { bindTo[key] = p.prototype[key]; } }
    }

    // copy properties from api to bindTo
    for (key in api) {
      if ( !ignoredKeys[key]) {
        bindTo[key] = api[key];
      }
    }

    // copy static properties from statics to both clazz and bindTo
    for (key in statics) { clazz[key] = bindTo[key] = statics[key]; }

    // if class is not a singleton, add $super and $superp
    if ( !singleton) {
      p = parent && parent[0] || parent;
      clazz.$super  = p;
      clazz.$superp = p && p.prototype ? p.prototype : p;
      bindTo.$class = clazz;
    }

    for (key in plugins) { plugins[key](clazz, parent, api); }                 // pass control to plugins
    if (functionOrNil(api.main)) { api.main.call(clazz, clazz); }              // execute main()
    return clazz;
  }

  /* Class plugins repository */
  Class.plugins = {};

  /* Initialization */
  jsface = {
    Class        : Class,
    extend       : extend,
    mapOrNil     : mapOrNil,
    arrayOrNil   : arrayOrNil,
    functionOrNil: functionOrNil,
    stringOrNil  : stringOrNil,
    classOrNil   : classOrNil
  };

  if (typeof module !== "undefined" && module.exports) {                       // NodeJS/CommonJS
    module.exports = jsface;
  } else {
    oldClass          = context.Class;                                         // save current Class namespace
    context.Class     = Class;                                                 // bind Class and jsface to global scope
    context.jsface    = jsface;
    jsface.noConflict = function() { context.Class = oldClass; };              // no conflict
  }
})(this, "object", "number", "length", Object.prototype.toString);
},{}],31:[function(require,module,exports){
window.loggedErrors = require('./lib');

},{"./lib":35}],32:[function(require,module,exports){
function _assert(arg, type, name, stackFunc) {
  name = name || type;
  stackFunc = stackFunc || _assert.caller;
  var t = typeof (arg);

  if (t !== type) {
    throw new assert.AssertionError({
      message: _(TYPE_REQUIRED, name, type),
      actual: t,
      expected: type,
      operator: '===',
      stackStartFunction: stackFunc
    });
  }
}

function object(arg, name) {
  _assert(arg, 'object', name);
}

exports.object = object;
},{}],33:[function(require,module,exports){
exports.STATUS_CODES = {
  100 : 'Continue',
  101 : 'Switching Protocols',
  102 : 'Processing',                 // RFC 2518, obsoleted by RFC 4918
  200 : 'OK',
  201 : 'Created',
  202 : 'Accepted',
  203 : 'Non-Authoritative Information',
  204 : 'No Content',
  205 : 'Reset Content',
  206 : 'Partial Content',
  207 : 'Multi-Status',               // RFC 4918
  300 : 'Multiple Choices',
  301 : 'Moved Permanently',
  302 : 'Moved Temporarily',
  303 : 'See Other',
  304 : 'Not Modified',
  305 : 'Use Proxy',
  307 : 'Temporary Redirect',
  400 : 'Bad Request',
  401 : 'Unauthorized',
  402 : 'Payment Required',
  403 : 'Forbidden',
  404 : 'Not Found',
  405 : 'Method Not Allowed',
  406 : 'Not Acceptable',
  407 : 'Proxy Authentication Required',
  408 : 'Request Time-out',
  409 : 'Conflict',
  410 : 'Gone',
  411 : 'Length Required',
  412 : 'Precondition Failed',
  413 : 'Request Entity Too Large',
  414 : 'Request-URI Too Large',
  415 : 'Unsupported Media Type',
  416 : 'Requested Range Not Satisfiable',
  417 : 'Expectation Failed',
  418 : 'I\'m a teapot',              // RFC 2324
  422 : 'Unprocessable Entity',       // RFC 4918
  423 : 'Locked',                     // RFC 4918
  424 : 'Failed Dependency',          // RFC 4918
  425 : 'Unordered Collection',       // RFC 4918
  426 : 'Upgrade Required',           // RFC 2817
  428 : 'Precondition Required',      // RFC 6585
  429 : 'Too Many Requests',          // RFC 6585
  431 : 'Request Header Fields Too Large',// RFC 6585
  500 : 'Internal Server Error',
  501 : 'Not Implemented',
  502 : 'Bad Gateway',
  503 : 'Service Unavailable',
  504 : 'Gateway Time-out',
  505 : 'HTTP Version Not Supported',
  506 : 'Variant Also Negotiates',    // RFC 2295
  507 : 'Insufficient Storage',       // RFC 4918
  509 : 'Bandwidth Limit Exceeded',
  510 : 'Not Extended',               // RFC 2774
  511 : 'Network Authentication Required' // RFC 6585
};

},{}],34:[function(require,module,exports){
// Copyright 2012 Mark Cavage, Inc.  All rights reserved.

var http   = require('./http');
var util   = require('util');
var assert = require('./assert-plus');
var WError = require('verror').WError;
var outil  = require('object_utils');

///--- Globals

var slice = Function.prototype.call.bind(Array.prototype.slice);


///--- Helpers

function codeToErrorName(code) {
    code = parseInt(code, 10);
    var status = http.STATUS_CODES[code];
    if (!status)
        return (false);


    var pieces = status.split(/\s+/);
    var str = '';
    pieces.forEach(function (s) {
        str += s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    });

    str = str.replace(/\W+/g, '');
    if (!/\w+Error$/.test(str))
        str += 'Error';

    return (str);
}

function stackToArray(stack) {
    if (stack && stack.split) {
        return stack.split('\n').map(Function.prototype.call, String.prototype.trim);
    }
    return stack;
}

///--- Error Base class

function HttpError(options) {
    assert.object(options, 'options');

    /**
     * Add the stack to the body
     *
     * @param {Boolean} asArray True if you want the stack as an array
     * @chainable
     * @return {HttpError}
     */
    this.withStack = function withStack(asArray) {
        this.body = this.body || {};
        if (asArray) {
            this.body.stack = stackToArray(this.stack);
        } else {
            this.body.stack = this.stack;
        }
        return this;
    };

    /**
     * Set the stack as an array
     *
     * @chainable
     * @return {HttpError}
     */
    this.toArray = function toArray() {
        if (this.body.stack) {
          this.body.stack = stackToArray(this.body.stack);
        }
        return this;
    };

    /**
     * Send the error to the logger
     *
     * @param {String} [mode = 'body'] If not equal to 'body' use message in default format
     * @chainable
     * @return {HttpError}
     */
    this.log = function log(mode) {
        if (config.logger && config.logger.error) {
            var msg = this.message;
            if ('function' === typeof config.format) {
                msg = config.format(this, mode);
            }
            config.logger.error(msg);
        }
        return this;
    };

  options.constructorOpt = options.constructorOpt || HttpError;
    WError.apply(this, arguments);

    var self = this;
    var code = parseInt((options.statusCode || 500), 10);
    this.statusCode = code;
    this.body = options.body || {
        code: codeToErrorName(code),
        message: options.message || self.message
    };
    this.message = options.message || self.message;
}

util.inherits(HttpError, WError);


///--- Exports

module.exports = {

    HttpError: HttpError,

    codeToHttpError: function codeToHttpError(code, message, body) {
        var err;
        var name = codeToErrorName(code);

        if (!name) {
            err = new HttpError({
                statusCode: code,
                message: message,
                body: body
            });
            err.name = 'Http' + code + 'Error';
        } else {
            err = new module.exports[name]({
                body: body,
                message: message,
                constructorOpt: codeToHttpError,
                statusCode: code
            });
        }

        return (err);
    },

    codeToErrorName: codeToErrorName
};


// Export all the 4xx and 5xx HTTP Status codes as Errors
var codes = Object.keys(http.STATUS_CODES);

codes.forEach(function (code) {
    var name = codeToErrorName(code);

    module.exports[name] = function (cause, message) {
        var index = 1;
        var opts = {
            statusCode: code
        };

        if (cause && cause instanceof Error) {
            opts.cause = cause;
            opts.constructorOpt = arguments.callee;
        } else if (typeof (cause) === 'object') {
            opts.body = cause.body;
            opts.cause = cause.cause;
            opts.constructorOpt = cause.constructorOpt;
            opts.message = cause.message;
            opts.statusCode = cause.statusCode || code;
        } else {
            opts.constructorOpt = arguments.callee;
            index = 0;
        }

        var args = slice(arguments, index);
        args.unshift(opts);
        HttpError.apply(this, args);
    };
    util.inherits(module.exports[name], HttpError);

    module.exports[name].displayName =
        module.exports[name].prototype.name =
            name;
});

var config = {
    logger: console,
    format: function(error, mode) {
        // you can define your format
        mode = mode || 'body';
        if (mode === 'body') {
            return error.body
        }
        return error.message;
    }
};

module.exports.setConfig = function(newConfig) {
    config = outil.merge(config, newConfig);
};
module.exports.getConfig = function() {
    return config;
}
},{"./assert-plus":32,"./http":33,"object_utils":37,"util":10,"verror":38}],35:[function(require,module,exports){
// Copyright 2012 Mark Cavage, Inc.  All rights reserved.

var httpErrors = require('./http_error');
var restErrors = require('./rest_error');

module.exports = {
  'set': function(config) {
    httpErrors.setConfig(config);
  },
  codeToErrorName: httpErrors.codeToErrorName
};

Object.keys(httpErrors).forEach(function (k) {
    module.exports[k] = httpErrors[k];
});

// Note some of the RestErrors overwrite plain HTTP errors.
Object.keys(restErrors).forEach(function (k) {
    module.exports[k] = restErrors[k];
});

},{"./http_error":34,"./rest_error":36}],36:[function(require,module,exports){
// Copyright 2012 Mark Cavage, Inc.  All rights reserved.

var util = require('util');

var assert = require('./assert-plus');

var httpErrors = require('./http_error');


///--- Globals

var slice = Function.prototype.call.bind(Array.prototype.slice);

var HttpError = httpErrors.HttpError;

var CODES = {
    BadDigest: 400,
    BadMethod: 405,
    Internal: 500, // Don't have InternalErrorError
    InvalidArgument: 409,
    InvalidContent: 400,
    InvalidCredentials: 401,
    InvalidHeader: 400,
    InvalidVersion: 400,
    MissingParameter: 409,
    NotAuthorized: 403,
    PreconditionFailed: 412,
    RequestExpired: 400,
    RequestThrottled: 429,
    ResourceNotFound: 404,
    WrongAccept: 406
};


///--- API

function RestError(options) {
    assert.object(options, 'options');

    options.constructorOpt = options.constructorOpt || RestError;
    HttpError.apply(this, arguments);

    var self = this;
    this.restCode = options.restCode || 'Error';
    this.body = options.body || {
        code: self.restCode,
        message: options.message || self.message
    };
}

util.inherits(RestError, HttpError);


///--- Exports

module.exports = {
    RestError: RestError
};

Object.keys(CODES).forEach(function (k) {
    var name = k;
    if (!/\w+Error$/.test(name))
        name += 'Error';

    module.exports[name] = function (cause, message) {
        var index = 1;
        var opts = {
            restCode: (k === 'Internal' ? 'InternalError' : k),
            statusCode: CODES[k]
        };

        opts.constructorOpt = arguments.callee;

        if (cause && cause instanceof Error) {
            opts.cause = cause;
        } else if (typeof (cause) === 'object') {
            opts.body = cause.body;
            opts.cause = cause.cause;
            opts.message = cause.message;
            opts.statusCode = cause.statusCode || CODES[k];
        } else {
            index = 0;
        }

        var args = slice(arguments, index);
        args.unshift(opts);
        RestError.apply(this, args);
    };
    util.inherits(module.exports[name], RestError);
    module.exports[name].displayName =
        module.exports[name].prototype.name =
            name;
});

},{"./assert-plus":32,"./http_error":34,"util":10}],37:[function(require,module,exports){
/**
 * @class node_modules.object_utils
 * 
 * @author Marcello Gesmundo
 * 
 * This module provide some utilities for object manipulation. It can used
 * both in Node and in browser.
 * 
 * # License
 * 
 * Copyright (c) 2012-2013 Yoovant by Marcello Gesmundo. All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 * 
 *    * Redistributions of source code must retain the above copyright
 *      notice, this list of conditions and the following disclaimer.
 *    * Redistributions in binary form must reproduce the above
 *      copyright notice, this list of conditions and the following
 *      disclaimer in the documentation and/or other materials provided
 *      with the distribution.
 *    * Neither the name of Yoovant nor the names of its
 *      contributors may be used to endorse or promote products derived
 *      from this software without specific prior written permission.
 *      
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
(function(exports) {
    var ObjectUtils = exports;
    
    /**
     * Return true if obj1 === obj2 comparing all values of all properties
     */
    ObjectUtils.equals = function (obj1, obj2) {
        if (!obj1 || !obj2) {
            return false;
        }
        var p;
        for(p in obj1) {
            if (obj1.hasOwnProperty(p)) {
                if(obj2[p]==='undefined') {
                    return false;
                }
            }
        }
        for(p in obj1) {
            if (obj1.hasOwnProperty(p)) {
                if (obj1[p]) {
                    switch (typeof(obj1[p])) {
                        case 'object':
                            if (!this.equals(obj1[p], obj2[p])) {
                                return false;
                            }
                            break;
                        case 'function':
                            if (obj2[p]==='undefined' || (p !== 'equals' && obj1[p].toString() !== obj2[p].toString())) {
                                return false;
                            }
                            break;
                        default:
                            if (obj1[p] !== obj2[p]) {
                                return false;
                            }
                    }
                } else {
                    if (obj2[p]) {
                        return false;
                    }
                }
            }
        }

        for(p in obj2) {
            if (obj2.hasOwnProperty(p)) {
                if(obj1[p]==='undefined') {
                    return false;
                }
            }
        }

        return true;
    };
    
    /**
     * Alias for #equals
     * @method
     */
    ObjectUtils.equal = ObjectUtils.equals;

    /**
     * Merge obj2 properties with all obj1 properties
     * @param {Object} obj1 First object
     * @param {Object} obj2 Second object
     * @return {Object} Return obj1 with all new obj2 properties and
     * obj1 properties updated with correspondents obj2 properties
     */
    ObjectUtils.merge = function (obj1, obj2) {
        if (obj2) {
            var key, value;

            for (key in obj2) {
                if (obj2.hasOwnProperty(key)) {
                    value = obj2[key];
                    try {
                        if ( value.constructor === Object ) {
                            obj1[key] = ObjectUtils.merge(obj1[key], value);
                        } else {
                            obj1[key] = value;
                        }
                    } catch(e) {
                        obj1[key] = value;
                    }
                }
            }
        }

        return obj1;
    };

    /**
     * Return true if the object is null or undefined
     * @param {Object} obj Object to check
     */
    ObjectUtils.isNull = function (obj) {
        return (!obj || obj === 'undefined' || obj === 'null');
    };
    
}('object' === typeof module ? module.exports : (this.ObjectUtils = {})));

},{}],38:[function(require,module,exports){
/*
 * verror.js: richer JavaScript errors
 */

var mod_assert = require('assert');
var mod_util = require('util');

var mod_extsprintf = require('extsprintf');

/*
 * Public interface
 */
exports.VError = VError;
exports.WError = WError;
exports.MultiError = MultiError;

/*
 * Like JavaScript's built-in Error class, but supports a "cause" argument and a
 * printf-style message.  The cause argument can be null.
 */
function VError(options)
{
	var args, causedBy, ctor, tailmsg;

	if (options instanceof Error || typeof (options) === 'object') {
		args = Array.prototype.slice.call(arguments, 1);
	} else {
		args = Array.prototype.slice.call(arguments, 0);
		options = undefined;
	}

	tailmsg = args.length > 0 ?
	    mod_extsprintf.sprintf.apply(null, args) : '';
	this.jse_shortmsg = tailmsg;
	this.jse_summary = tailmsg;

	if (options) {
		causedBy = options.cause;

		if (!causedBy || !(options.cause instanceof Error))
			causedBy = options;

		if (causedBy && (causedBy instanceof Error)) {
			this.jse_cause = causedBy;
			this.jse_summary += ': ' + causedBy.message;
		}
	}

	this.message = this.jse_summary;
	Error.call(this, this.jse_summary);

	if (Error.captureStackTrace) {
		ctor = options ? options.constructorOpt : undefined;
		ctor = ctor || arguments.callee;
		Error.captureStackTrace(this, ctor);
	}
}

mod_util.inherits(VError, Error);
VError.prototype.name = 'VError';

VError.prototype.toString = function ve_toString()
{
	var str = (this.hasOwnProperty('name') && this.name ||
		this.constructor.name || this.constructor.prototype.name);
	if (this.message)
		str += ': ' + this.message;

	return (str);
};

VError.prototype.cause = function ve_cause()
{
	return (this.jse_cause);
};


/*
 * Represents a collection of errors for the purpose of consumers that generally
 * only deal with one error.  Callers can extract the individual errors
 * contained in this object, but may also just treat it as a normal single
 * error, in which case a summary message will be printed.
 */
function MultiError(errors)
{
	mod_assert.ok(errors.length > 0);
	this.ase_errors = errors;

	VError.call(this, errors[0], 'first of %d error%s',
	    errors.length, errors.length == 1 ? '' : 's');
}

mod_util.inherits(MultiError, VError);



/*
 * Like JavaScript's built-in Error class, but supports a "cause" argument which
 * is wrapped, not "folded in" as with VError.	Accepts a printf-style message.
 * The cause argument can be null.
 */
function WError(options)
{
	Error.call(this);

	var args, cause, ctor;
	if (typeof (options) === 'object') {
		args = Array.prototype.slice.call(arguments, 1);
	} else {
		args = Array.prototype.slice.call(arguments, 0);
		options = undefined;
	}

	if (args.length > 0) {
		this.message = mod_extsprintf.sprintf.apply(null, args);
	} else {
		this.message = '';
	}

	if (options) {
		if (options instanceof Error) {
			cause = options;
		} else {
			cause = options.cause;
			ctor = options.constructorOpt;
		}
	}

	Error.captureStackTrace(this, ctor || this.constructor);
	if (cause)
		this.cause(cause);

}

mod_util.inherits(WError, Error);
WError.prototype.name = 'WError';


WError.prototype.toString = function we_toString()
{
	var str = (this.hasOwnProperty('name') && this.name ||
		this.constructor.name || this.constructor.prototype.name);
	if (this.message)
		str += ': ' + this.message;
	if (this.we_cause && this.we_cause.message)
		str += '; caused by ' + this.we_cause.toString();

	return (str);
};

WError.prototype.cause = function we_cause(c)
{
	if (c instanceof Error)
		this.we_cause = c;

	return (this.we_cause);
};

},{"assert":1,"extsprintf":39,"util":10}],39:[function(require,module,exports){
/*
 * extsprintf.js: extended POSIX-style sprintf
 */

var mod_assert = require('assert');
var mod_util = require('util');

/*
 * Public interface
 */
exports.sprintf = jsSprintf;

/*
 * Stripped down version of s[n]printf(3c).  We make a best effort to throw an
 * exception when given a format string we don't understand, rather than
 * ignoring it, so that we won't break existing programs if/when we go implement
 * the rest of this.
 *
 * This implementation currently supports specifying
 *	- field alignment ('-' flag),
 * 	- zero-pad ('0' flag)
 *	- always show numeric sign ('+' flag),
 *	- field width
 *	- conversions for strings, decimal integers, and floats (numbers).
 *	- argument size specifiers.  These are all accepted but ignored, since
 *	  Javascript has no notion of the physical size of an argument.
 *
 * Everything else is currently unsupported, most notably precision, unsigned
 * numbers, non-decimal numbers, and characters.
 */
function jsSprintf(fmt)
{
	var regex = [
	    '([^%]*)',				/* normal text */
	    '%',				/* start of format */
	    '([\'\\-+ #0]*?)',			/* flags (optional) */
	    '([1-9]\\d*)?',			/* width (optional) */
	    '(\\.([1-9]\\d*))?',		/* precision (optional) */
	    '[lhjztL]*?',			/* length mods (ignored) */
	    '([diouxXfFeEgGaAcCsSp%jr])'	/* conversion */
	].join('');

	var re = new RegExp(regex);
	var args = Array.prototype.slice.call(arguments, 1);
	var flags, width, precision, conversion;
	var left, pad, sign, arg, match;
	var ret = '';
	var argn = 1;

	mod_assert.equal('string', typeof (fmt));

	while ((match = re.exec(fmt)) !== null) {
		ret += match[1];
		fmt = fmt.substring(match[0].length);

		flags = match[2] || '';
		width = match[3] || 0;
		precision = match[4] || '';
		conversion = match[6];
		left = false;
		sign = false;
		pad = ' ';

		if (conversion == '%') {
			ret += '%';
			continue;
		}

		if (args.length === 0)
			throw (new Error('too few args to sprintf'));

		arg = args.shift();
		argn++;

		if (flags.match(/[\' #]/))
			throw (new Error(
			    'unsupported flags: ' + flags));

		if (precision.length > 0)
			throw (new Error(
			    'non-zero precision not supported'));

		if (flags.match(/-/))
			left = true;

		if (flags.match(/0/))
			pad = '0';

		if (flags.match(/\+/))
			sign = true;

		switch (conversion) {
		case 's':
			if (arg === undefined || arg === null)
				throw (new Error('argument ' + argn +
				    ': attempted to print undefined or null ' +
				    'as a string'));
			ret += doPad(pad, width, left, arg.toString());
			break;

		case 'd':
			arg = Math.floor(arg);
			/*jsl:fallthru*/
		case 'f':
			sign = sign && arg > 0 ? '+' : '';
			ret += sign + doPad(pad, width, left,
			    arg.toString());
			break;

		case 'j': /* non-standard */
			if (width === 0)
				width = 10;
			ret += mod_util.inspect(arg, false, width);
			break;

		case 'r': /* non-standard */
			ret += dumpException(arg);
			break;

		default:
			throw (new Error('unsupported conversion: ' +
			    conversion));
		}
	}

	ret += fmt;
	return (ret);
}

function doPad(chr, width, left, str)
{
	var ret = str;

	while (ret.length < width) {
		if (left)
			ret += chr;
		else
			ret = chr + ret;
	}

	return (ret);
}

/*
 * This function dumps long stack traces for exceptions having a cause() method.
 * See node-verror for an example.
 */
function dumpException(ex)
{
	var ret;

	if (!(ex instanceof Error))
		throw (new Error(jsSprintf('invalid type for %%r: %j', ex)));

	/* Note that V8 prepends "ex.stack" with ex.toString(). */
	ret = 'EXCEPTION: ' + ex.constructor.name + ': ' + ex.stack;

	if (ex.cause && typeof (ex.cause) === 'function') {
		var cex = ex.cause();
		if (cex) {
			ret += '\nCaused by: ' + dumpException(cex);
		}
	}

	return (ret);
}

},{"assert":1,"util":10}],40:[function(require,module,exports){
/**
 * Module dependencies.
 */

var Emitter = require('emitter');
var reduce = require('reduce');

/**
 * Root reference for iframes.
 */

var root = 'undefined' == typeof window
  ? this
  : window;

/**
 * Noop.
 */

function noop(){};

/**
 * Check if `obj` is a host object,
 * we don't want to serialize these :)
 *
 * TODO: future proof, move to compoent land
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isHost(obj) {
  var str = {}.toString.call(obj);

  switch (str) {
    case '[object File]':
    case '[object Blob]':
    case '[object FormData]':
      return true;
    default:
      return false;
  }
}

/**
 * Determine XHR.
 */

function getXHR() {
  if (root.XMLHttpRequest
    && ('file:' != root.location.protocol || !root.ActiveXObject)) {
    return new XMLHttpRequest;
  } else {
    try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.6.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.3.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch(e) {}
  }
  return false;
}

/**
 * Removes leading and trailing whitespace, added to support IE.
 *
 * @param {String} s
 * @return {String}
 * @api private
 */

var trim = ''.trim
  ? function(s) { return s.trim(); }
  : function(s) { return s.replace(/(^\s*|\s*$)/g, ''); };

/**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isObject(obj) {
  return obj === Object(obj);
}

/**
 * Serialize the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function serialize(obj) {
  if (!isObject(obj)) return obj;
  var pairs = [];
  for (var key in obj) {
    if (null != obj[key]) {
      pairs.push(encodeURIComponent(key)
        + '=' + encodeURIComponent(obj[key]));
    }
  }
  return pairs.join('&');
}

/**
 * Expose serialization method.
 */

 request.serializeObject = serialize;

 /**
  * Parse the given x-www-form-urlencoded `str`.
  *
  * @param {String} str
  * @return {Object}
  * @api private
  */

function parseString(str) {
  var obj = {};
  var pairs = str.split('&');
  var parts;
  var pair;

  for (var i = 0, len = pairs.length; i < len; ++i) {
    pair = pairs[i];
    parts = pair.split('=');
    obj[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
  }

  return obj;
}

/**
 * Expose parser.
 */

request.parseString = parseString;

/**
 * Default MIME type map.
 *
 *     superagent.types.xml = 'application/xml';
 *
 */

request.types = {
  html: 'text/html',
  json: 'application/json',
  xml: 'application/xml',
  urlencoded: 'application/x-www-form-urlencoded',
  'form': 'application/x-www-form-urlencoded',
  'form-data': 'application/x-www-form-urlencoded'
};

/**
 * Default serialization map.
 *
 *     superagent.serialize['application/xml'] = function(obj){
 *       return 'generated xml here';
 *     };
 *
 */

 request.serialize = {
   'application/x-www-form-urlencoded': serialize,
   'application/json': JSON.stringify
 };

 /**
  * Default parsers.
  *
  *     superagent.parse['application/xml'] = function(str){
  *       return { object parsed from str };
  *     };
  *
  */

request.parse = {
  'application/x-www-form-urlencoded': parseString,
  'application/json': JSON.parse
};

/**
 * Parse the given header `str` into
 * an object containing the mapped fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseHeader(str) {
  var lines = str.split(/\r?\n/);
  var fields = {};
  var index;
  var line;
  var field;
  var val;

  lines.pop(); // trailing CRLF

  for (var i = 0, len = lines.length; i < len; ++i) {
    line = lines[i];
    index = line.indexOf(':');
    field = line.slice(0, index).toLowerCase();
    val = trim(line.slice(index + 1));
    fields[field] = val;
  }

  return fields;
}

/**
 * Return the mime type for the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function type(str){
  return str.split(/ *; */).shift();
};

/**
 * Return header field parameters.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function params(str){
  return reduce(str.split(/ *; */), function(obj, str){
    var parts = str.split(/ *= */)
      , key = parts.shift()
      , val = parts.shift();

    if (key && val) obj[key] = val;
    return obj;
  }, {});
};

/**
 * Initialize a new `Response` with the given `xhr`.
 *
 *  - set flags (.ok, .error, etc)
 *  - parse header
 *
 * Examples:
 *
 *  Aliasing `superagent` as `request` is nice:
 *
 *      request = superagent;
 *
 *  We can use the promise-like API, or pass callbacks:
 *
 *      request.get('/').end(function(res){});
 *      request.get('/', function(res){});
 *
 *  Sending data can be chained:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' })
 *        .end(function(res){});
 *
 *  Or passed to `.send()`:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' }, function(res){});
 *
 *  Or passed to `.post()`:
 *
 *      request
 *        .post('/user', { name: 'tj' })
 *        .end(function(res){});
 *
 * Or further reduced to a single call for simple cases:
 *
 *      request
 *        .post('/user', { name: 'tj' }, function(res){});
 *
 * @param {XMLHTTPRequest} xhr
 * @param {Object} options
 * @api private
 */

function Response(req, options) {
  options = options || {};
  this.req = req;
  this.xhr = this.req.xhr;
  this.text = this.xhr.responseText;
  this.setStatusProperties(this.xhr.status);
  this.header = this.headers = parseHeader(this.xhr.getAllResponseHeaders());
  // getAllResponseHeaders sometimes falsely returns "" for CORS requests, but
  // getResponseHeader still works. so we get content-type even if getting
  // other headers fails.
  this.header['content-type'] = this.xhr.getResponseHeader('content-type');
  this.setHeaderProperties(this.header);
  this.body = this.req.method != 'HEAD'
    ? this.parseBody(this.text)
    : null;
}

/**
 * Get case-insensitive `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

Response.prototype.get = function(field){
  return this.header[field.toLowerCase()];
};

/**
 * Set header related properties:
 *
 *   - `.type` the content type without params
 *
 * A response of "Content-Type: text/plain; charset=utf-8"
 * will provide you with a `.type` of "text/plain".
 *
 * @param {Object} header
 * @api private
 */

Response.prototype.setHeaderProperties = function(header){
  // content-type
  var ct = this.header['content-type'] || '';
  this.type = type(ct);

  // params
  var obj = params(ct);
  for (var key in obj) this[key] = obj[key];
};

/**
 * Parse the given body `str`.
 *
 * Used for auto-parsing of bodies. Parsers
 * are defined on the `superagent.parse` object.
 *
 * @param {String} str
 * @return {Mixed}
 * @api private
 */

Response.prototype.parseBody = function(str){
  var parse = request.parse[this.type];
  return parse
    ? parse(str)
    : null;
};

/**
 * Set flags such as `.ok` based on `status`.
 *
 * For example a 2xx response will give you a `.ok` of __true__
 * whereas 5xx will be __false__ and `.error` will be __true__. The
 * `.clientError` and `.serverError` are also available to be more
 * specific, and `.statusType` is the class of error ranging from 1..5
 * sometimes useful for mapping respond colors etc.
 *
 * "sugar" properties are also defined for common cases. Currently providing:
 *
 *   - .noContent
 *   - .badRequest
 *   - .unauthorized
 *   - .notAcceptable
 *   - .notFound
 *
 * @param {Number} status
 * @api private
 */

Response.prototype.setStatusProperties = function(status){
  var type = status / 100 | 0;

  // status / class
  this.status = status;
  this.statusType = type;

  // basics
  this.info = 1 == type;
  this.ok = 2 == type;
  this.clientError = 4 == type;
  this.serverError = 5 == type;
  this.error = (4 == type || 5 == type)
    ? this.toError()
    : false;

  // sugar
  this.accepted = 202 == status;
  this.noContent = 204 == status || 1223 == status;
  this.badRequest = 400 == status;
  this.unauthorized = 401 == status;
  this.notAcceptable = 406 == status;
  this.notFound = 404 == status;
  this.forbidden = 403 == status;
};

/**
 * Return an `Error` representative of this response.
 *
 * @return {Error}
 * @api public
 */

Response.prototype.toError = function(){
  var req = this.req;
  var method = req.method;
  var url = req.url;

  var msg = 'cannot ' + method + ' ' + url + ' (' + this.status + ')';
  var err = new Error(msg);
  err.status = this.status;
  err.method = method;
  err.url = url;

  return err;
};

/**
 * Expose `Response`.
 */

request.Response = Response;

/**
 * Initialize a new `Request` with the given `method` and `url`.
 *
 * @param {String} method
 * @param {String} url
 * @api public
 */

function Request(method, url) {
  var self = this;
  Emitter.call(this);
  this._query = this._query || [];
  this.method = method;
  this.url = url;
  this.header = {};
  this._header = {};
  this.on('end', function(){
    var res = new Response(self);
    if ('HEAD' == method) res.text = null;
    self.callback(null, res);
  });
}

/**
 * Mixin `Emitter`.
 */

Emitter(Request.prototype);

/**
 * Allow for extension
 */

Request.prototype.use = function(fn) {
  fn(this);
  return this;
}

/**
 * Set timeout to `ms`.
 *
 * @param {Number} ms
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.timeout = function(ms){
  this._timeout = ms;
  return this;
};

/**
 * Clear previous timeout.
 *
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.clearTimeout = function(){
  this._timeout = 0;
  clearTimeout(this._timer);
  return this;
};

/**
 * Abort the request, and clear potential timeout.
 *
 * @return {Request}
 * @api public
 */

Request.prototype.abort = function(){
  if (this.aborted) return;
  this.aborted = true;
  this.xhr.abort();
  this.clearTimeout();
  this.emit('abort');
  return this;
};

/**
 * Set header `field` to `val`, or multiple fields with one object.
 *
 * Examples:
 *
 *      req.get('/')
 *        .set('Accept', 'application/json')
 *        .set('X-API-Key', 'foobar')
 *        .end(callback);
 *
 *      req.get('/')
 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *        .end(callback);
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.set = function(field, val){
  if (isObject(field)) {
    for (var key in field) {
      this.set(key, field[key]);
    }
    return this;
  }
  this._header[field.toLowerCase()] = val;
  this.header[field] = val;
  return this;
};

/**
 * Get case-insensitive header `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api private
 */

Request.prototype.getHeader = function(field){
  return this._header[field.toLowerCase()];
};

/**
 * Set Content-Type to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.xml = 'application/xml';
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('application/xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 * @param {String} type
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.type = function(type){
  this.set('Content-Type', request.types[type] || type);
  return this;
};

/**
 * Set Accept to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.json = 'application/json';
 *
 *      request.get('/agent')
 *        .accept('json')
 *        .end(callback);
 *
 *      request.get('/agent')
 *        .accept('application/json')
 *        .end(callback);
 *
 * @param {String} accept
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.accept = function(type){
  this.set('Accept', request.types[type] || type);
  return this;
};

/**
 * Set Authorization field value with `user` and `pass`.
 *
 * @param {String} user
 * @param {String} pass
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.auth = function(user, pass){
  var str = btoa(user + ':' + pass);
  this.set('Authorization', 'Basic ' + str);
  return this;
};

/**
* Add query-string `val`.
*
* Examples:
*
*   request.get('/shoes')
*     .query('size=10')
*     .query({ color: 'blue' })
*
* @param {Object|String} val
* @return {Request} for chaining
* @api public
*/

Request.prototype.query = function(val){
  if ('string' != typeof val) val = serialize(val);
  if (val) this._query.push(val);
  return this;
};

/**
 * Write the field `name` and `val` for "multipart/form-data"
 * request bodies.
 *
 * ``` js
 * request.post('/upload')
 *   .field('foo', 'bar')
 *   .end(callback);
 * ```
 *
 * @param {String} name
 * @param {String|Blob|File} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.field = function(name, val){
  if (!this._formData) this._formData = new FormData();
  this._formData.append(name, val);
  return this;
};

/**
 * Queue the given `file` as an attachment to the specified `field`,
 * with optional `filename`.
 *
 * ``` js
 * request.post('/upload')
 *   .attach(new Blob(['<a id="a"><b id="b">hey!</b></a>'], { type: "text/html"}))
 *   .end(callback);
 * ```
 *
 * @param {String} field
 * @param {Blob|File} file
 * @param {String} filename
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.attach = function(field, file, filename){
  if (!this._formData) this._formData = new FormData();
  this._formData.append(field, file, filename);
  return this;
};

/**
 * Send `data`, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // querystring
 *       request.get('/search')
 *         .end(callback)
 *
 *       // multiple data "writes"
 *       request.get('/search')
 *         .send({ search: 'query' })
 *         .send({ range: '1..5' })
 *         .send({ order: 'desc' })
 *         .end(callback)
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .send('{"name":"tj"})
 *         .end(callback)
 *
 *       // auto json
 *       request.post('/user')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send('name=tj')
 *         .end(callback)
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // defaults to x-www-form-urlencoded
  *      request.post('/user')
  *        .send('name=tobi')
  *        .send('species=ferret')
  *        .end(callback)
 *
 * @param {String|Object} data
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.send = function(data){
  var obj = isObject(data);
  var type = this.getHeader('Content-Type');

  // merge
  if (obj && isObject(this._data)) {
    for (var key in data) {
      this._data[key] = data[key];
    }
  } else if ('string' == typeof data) {
    if (!type) this.type('form');
    type = this.getHeader('Content-Type');
    if ('application/x-www-form-urlencoded' == type) {
      this._data = this._data
        ? this._data + '&' + data
        : data;
    } else {
      this._data = (this._data || '') + data;
    }
  } else {
    this._data = data;
  }

  if (!obj) return this;
  if (!type) this.type('json');
  return this;
};

/**
 * Invoke the callback with `err` and `res`
 * and handle arity check.
 *
 * @param {Error} err
 * @param {Response} res
 * @api private
 */

Request.prototype.callback = function(err, res){
  var fn = this._callback;
  if (2 == fn.length) return fn(err, res);
  if (err) return this.emit('error', err);
  fn(res);
};

/**
 * Invoke callback with x-domain error.
 *
 * @api private
 */

Request.prototype.crossDomainError = function(){
  var err = new Error('Origin is not allowed by Access-Control-Allow-Origin');
  err.crossDomain = true;
  this.callback(err);
};

/**
 * Invoke callback with timeout error.
 *
 * @api private
 */

Request.prototype.timeoutError = function(){
  var timeout = this._timeout;
  var err = new Error('timeout of ' + timeout + 'ms exceeded');
  err.timeout = timeout;
  this.callback(err);
};

/**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 *
 * @api public
 */

Request.prototype.withCredentials = function(){
  this._withCredentials = true;
  return this;
};

/**
 * Initiate request, invoking callback `fn(res)`
 * with an instanceof `Response`.
 *
 * @param {Function} fn
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.end = function(fn){
  var self = this;
  var xhr = this.xhr = getXHR();
  var query = this._query.join('&');
  var timeout = this._timeout;
  var data = this._formData || this._data;

  // store callback
  this._callback = fn || noop;

  // state change
  xhr.onreadystatechange = function(){
    if (4 != xhr.readyState) return;
    if (0 == xhr.status) {
      if (self.aborted) return self.timeoutError();
      return self.crossDomainError();
    }
    self.emit('end');
  };

  // progress
  if (xhr.upload) {
    xhr.upload.onprogress = function(e){
      e.percent = e.loaded / e.total * 100;
      self.emit('progress', e);
    };
  }

  // timeout
  if (timeout && !this._timer) {
    this._timer = setTimeout(function(){
      self.abort();
    }, timeout);
  }

  // querystring
  if (query) {
    query = request.serializeObject(query);
    this.url += ~this.url.indexOf('?')
      ? '&' + query
      : '?' + query;
  }

  // initiate request
  xhr.open(this.method, this.url, true);

  // CORS
  if (this._withCredentials) xhr.withCredentials = true;

  // body
  if ('GET' != this.method && 'HEAD' != this.method && 'string' != typeof data && !isHost(data)) {
    // serialize stuff
    var serialize = request.serialize[this.getHeader('Content-Type')];
    if (serialize) data = serialize(data);
  }

  // set header fields
  for (var field in this.header) {
    if (null == this.header[field]) continue;
    xhr.setRequestHeader(field, this.header[field]);
  }

  // send stuff
  this.emit('request', this);
  xhr.send(data);
  return this;
};

/**
 * Expose `Request`.
 */

request.Request = Request;

/**
 * Issue a request:
 *
 * Examples:
 *
 *    request('GET', '/users').end(callback)
 *    request('/users').end(callback)
 *    request('/users', callback)
 *
 * @param {String} method
 * @param {String|Function} url or callback
 * @return {Request}
 * @api public
 */

function request(method, url) {
  // callback
  if ('function' == typeof url) {
    return new Request('GET', method).end(url);
  }

  // url first
  if (1 == arguments.length) {
    return new Request('GET', method);
  }

  return new Request(method, url);
}

/**
 * GET `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.get = function(url, data, fn){
  var req = request('GET', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.query(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * HEAD `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.head = function(url, data, fn){
  var req = request('HEAD', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * DELETE `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.del = function(url, fn){
  var req = request('DELETE', url);
  if (fn) req.end(fn);
  return req;
};

/**
 * PATCH `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.patch = function(url, data, fn){
  var req = request('PATCH', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * POST `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.post = function(url, data, fn){
  var req = request('POST', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * PUT `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.put = function(url, data, fn){
  var req = request('PUT', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * Expose `request`.
 */

module.exports = request;

},{"emitter":41,"reduce":42}],41:[function(require,module,exports){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],42:[function(require,module,exports){

/**
 * Reduce `arr` with `fn`.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @param {Mixed} initial
 *
 * TODO: combatible error handling?
 */

module.exports = function(arr, fn, initial){  
  var idx = 0;
  var len = arr.length;
  var curr = arguments.length == 3
    ? initial
    : arr[idx++];

  while (idx < len) {
    curr = fn.call(null, curr, arr[idx], ++idx, arr);
  }
  
  return curr;
};
},{}],43:[function(require,module,exports){
//     Underscore.js 1.6.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.6.0';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return obj;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
    return obj;
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var result;
    any(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(predicate, context);
    each(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, function(value, index, list) {
      return !predicate.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(predicate, context);
    each(obj, function(value, index, list) {
      if (!(result = result && predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(predicate, context);
    each(obj, function(value, index, list) {
      if (result || (result = predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matches(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matches(attrs));
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    var result = -Infinity, lastComputed = -Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed > lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    var result = Infinity, lastComputed = Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed < lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Shuffle an array, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (obj.length !== +obj.length) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return value;
    return _.property(value);
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, iterator, context) {
    iterator = lookupIterator(iterator);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iterator, context) {
      var result = {};
      iterator = lookupIterator(iterator);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    _.has(result, key) ? result[key].push(value) : result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[0];
    if (n < 0) return [];
    return slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[array.length - 1];
    return slice.call(array, Math.max(array.length - n, 0));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Split an array into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(array, predicate) {
    var pass = [], fail = [];
    each(array, function(elem) {
      (predicate(elem) ? pass : fail).push(elem);
    });
    return [pass, fail];
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.contains(other, item);
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, 'length').concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    return function() {
      var position = 0;
      var args = boundArgs.slice();
      for (var i = 0, length = args.length; i < length; i++) {
        if (args[i] === _) args[i] = arguments[position++];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return func.apply(this, args);
    };
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error('bindAll must be passed function names');
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
        context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;
      if (last < wait) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))
                        && ('constructor' in a && 'constructor' in b)) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  _.constant = function(value) {
    return function () {
      return value;
    };
  };

  _.property = function(key) {
    return function(obj) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
  _.matches = function(attrs) {
    return function(obj) {
      if (obj === attrs) return true; //avoid comparing an object to itself.
      for (var key in attrs) {
        if (attrs[key] !== obj[key])
          return false;
      }
      return true;
    }
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() { return new Date().getTime(); };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}).call(this);

},{}]},{},[11])