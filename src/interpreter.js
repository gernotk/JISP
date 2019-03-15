(function (global) {
  'use strict';

  var Object = global.Object,
      JSON = global.JSON,
      JISP = global.JISP,
      Thunk = JISP.Thunk,
      Error = JISP.Error,
      Tools = JISP.Tools,
      isError = Error.isError,
      error = Error.error,
      extend = Tools.extend,
      Interpreter;

  /**
   * Implements JISP's interpreter essentially providing a parse,
   * compile and evaluate method which do what you would expect.
   *
   * The constructor takes a language runtime object being just a
   * symbol table containing predefined functions. Almost anything
   * what JISP is is defined by means of this runtime. The interpreter
   * only provides an additional 'export' JISP special form making it
   * easier to build and maintain JISP packages by defining symbols in
   * the global scope if they are not already defined. It works
   * similar to the 'let' block but ignores its body argument.
   *
   * It also accepts a 'foreign function' object containing javascript
   * functions allowing to extend the standard runtime with side
   * effectful or more performant functions as you wish.
   *
   * @constructor Interpreter
   * @param {Object}
   *  @param {Object} runtime - the interpreter's runtime library (use JISP.Runtime)
   *  @param {Object} ffi - foreign functions callable from within JISP
   * @namespace JISP
   */
  Interpreter = JISP.Interpreter = function (options) {
    var rootScope;

    rootScope = Object.create(extend(options.runtime, options.ffi, {
      // special 'export' for building up libraries
      'export': special(function (declarations) {
        var symbols = declarations.map(function (decl) {
	        return decl[0];
	      }),
	          initForms = declarations.map(function (decl) {
	            return decl[1];
	          });
        
        symbols.forEach(function (symbol, i) {
          if (typeof rootScope[symbol] === 'undefined') {
            rootScope[symbol] = compileExpression(rootScope, initForms[i]).execute();
          } else {
            error('symbol "' + symbol + '" already defined');
          }
        });
        
	      return Interpreter.TRUE;
      })
    }));
    
    this.options = options;
    
    /** Compiles a JISP expression into an executable 'thunk'.
     *
     * @param {Array} 
     * @returns {JISP.Thunk}
     */
    this.compile = function (expr) {
      return compileExpression(rootScope, expr);
    };
  };

  extend(Interpreter.prototype, {
    /** 
     * Takes a JISP source code string and returns a parsed
     * expression.
     *
     * @param {String} 
     * @returns {Array}
     */
    parse: function (srcRaw) {
      return parseExpression(srcRaw);
    },
    /** 
     * Takes a JISP expression and returns its string representation.
     *
     * @param {Array} 
     * @returns {String}
     */
    deparse: function (expr) {
      return deparseExpression(expr);
    },

    /** 
     * Evaluates a parsed JISP expression blockingly and until
     * termination and returns a JISP value (a JS string, number or
     * array) if the code terminated. A runtime error raises and
     * exception.
     *
     * @param {Array}
     */
    evaluate: function (expr) {
      return this.compile(expr).execute();
    },

    /** 
     * Does the same thing as 'evaluate' but runs
     * non-blockingly. Returns a promise that may be fulfilled upon
     * termination or broken with a runtime error.
     *
     * @param {Array}
     * @returns {Promise}
     */
    evaluateNonBlocking: function (expr) {
      var options = this.options,
          interruptInterval = options.interruptInterval || 250,
          minOPs = options.minimumOPs || 1000;
      
      return this.compile(expr).executeNonBlocking(interruptInterval, minOPs);
    }
  });

  extend(Interpreter, {
    NIL: 'nil',
    TRUE: 't',
    REST: '&rest',
    parseExpression: parseExpression,
    deparseExpression: deparseExpression,
    compileExpression: compileExpression,
    isNumber: isNumber,
    isList: isList,
    isEmptyList: isEmptyList,
    isSymbol: isSymbol,
    isNil: isNil,
    isAtom: isAtom,
    isTrue: isTrue,
    isFunction: isFunction,
    evalSymbol: evalSymbol,
    evalNumber: evalNumber,
    evalAtom: evalAtom,
    special: special,
    macro: macro
  });

  function parseExpression(str) {
    var src = str.replace(/'/g, '"'),
        code = JSON.parse(src);

    return code;
  }

  function deparseExpression(expr) {
    return JSON.stringify(expr);
  }
  
  function compileExpression(scope, expr) {
    var compileStack = [expr],
        thunk = new Thunk(),
        first, rest, fn, returnVal;

    while (compileStack.length > 0) {
      expr = compileStack.pop();
      
      if (isAtom(expr)) {
        first = evalAtom(scope, expr);
        if (isError(first)) {
          thunk.pushError(first, expr);
          break;
        } else {
          thunk.pushArgument(first);
        }
      } else if (isList(expr)) {
        first = expr[0];
        rest = expr.slice(1);
	      
        if (isList(first)) {
          // special case: rewrite immediate function call
          compileStack.push(['call', first].concat(rest));
          continue;
        }
        
        fn = evalSymbol(scope, first);
        
        if (isError(fn)) {
          thunk.pushError(fn, expr);
          break;
        } else if (!isFunction(fn)) {
          thunk.pushError(error('illegal function call'), expr);
          break;
        }
        
        if (fn.macro) {
          compileStack.push(fn.apply(scope, rest));
        } else if (fn.special) {
          returnVal = fn.apply(scope, rest);
          if (returnVal instanceof Thunk) {
            thunk.merge(returnVal);
          } else {
            thunk.pushArgument(returnVal);
          }
        } else {
          thunk.pushFunction(fn, rest.length, expr);
          Array.prototype.push.apply(compileStack, rest);
        }
      } else {
        first = error('non-jispy object');
        thunk.pushError(first, expr);
      }
    }
    
    return thunk;
  }

  function evalAtom(scope, expr) {
    var result;
    
    if (isSymbol(expr)) {
      result = evalSymbol(scope, expr);
    } else if (isNumber(expr)) {
      result = evalNumber(scope, expr);
    } else if (isNil(expr)) {
      result = evalNil(expr);
    } else if (isTrue(expr)) {
      result = evalTrue();
    } else {
      result = error('illegal expression');
    }
    
    return result;
  }

  // test functions    
  function isNumber(expr) {
    return typeof expr === 'number';
  }
  
  function isList(expr) {
    return expr instanceof Array;
  }

  function isEmptyList(expr) {
    return isList(expr) && expr.length === 0;
  }
  
  function isSymbol(expr) {
    return (expr !== Interpreter.TRUE) && (expr !== Interpreter.NIL) && (typeof expr === 'string');
  }

  function isNil(expr) {
    return expr === Interpreter.NIL || isEmptyList(expr);
  }
  
  function isAtom(expr) {
    return isSymbol(expr) || isNumber(expr) || isNil(expr) || expr === Interpreter.TRUE;
  }
  
  function isTrue(value) {
    return value === Interpreter.TRUE || !isNil(value);
  }
  
  function isFunction(value) {
    return value instanceof Function;
  }
  
  // eval functions
  function evalNil(expr) {
    return isEmptyList(expr) ? expr : Interpreter.NIL;
  }
  
  function evalTrue() {
    return Interpreter.TRUE;
  }
  
  function evalSymbol(scope, symbol) {
    var value = scope[symbol];
    
    if (typeof value === 'undefined') {
      return error('unknown symbol "' + symbol + '"');
    }
    
    return value;
  }
  
  function evalNumber(scope, number) {
    return number;
  }

  function special(fn) {
    fn.special = true;
    
    return fn;
  }
  
  function macro(fn) {
    fn.macro = true;

    return fn;
  }
}(window));
