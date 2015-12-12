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
    
    this.compile = function (expr) {
      return compileExpression(rootScope, expr);
    };
  };

  extend(Interpreter.prototype, {
    parse: function (srcRaw) {
      return parseExpression(srcRaw);
    },
    deparse: function (expr) {
      return deparseExpression(expr);
    },
    evaluate: function (expr) {
      return this.compile(expr).execute();
    },
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
