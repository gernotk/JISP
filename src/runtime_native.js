(function (global) {
  var JISP = global.JISP,
      Thunk = JISP.Thunk,
      Interpreter = JISP.Interpreter,
      special = Interpreter.special,
      macro = Interpreter.macro,
      isNil = Interpreter.isNil,
      isNumber = Interpreter.isNumber,
      isList = Interpreter.isList,
      isTrue = Interpreter.isTrue,
      error = Interpreter.error;

  JISP.Runtime = {
    // reserved symbols
    'recur': Interpreter.NIL,
    '&rest': Interpreter.NIL,

    // basic primitives
    'quote': special(function (expr) {
      return expr;
    }),

    // lists
    'cons': function (first, second) {
      if (isList(first)) {
        return first.concat(second);
      } else {
        return [first].concat(second);
      }
    },
    'car': function (list) {
      var elt;

      if (!isList(list)) {
        return error('not a list');
      }
      
      elt = list[0];
      
      if (typeof elt === 'undefined') {
        elt = Interpreter.NIL;
      }
      
      return elt;
    },
    'cdr': function (list) {
      if (isNil(list)) {
        return [];
      }
      
      if (!isList(list)) {
        return error('not a list');
      }
      
      return list.slice(1);
    },
    // optional but fast list operations
    'length': function (list) {
      if (!isList(list)) {
        return error('not a list');
      }
      
      return list.length;
    },
    'nth': function (index, list) {
      var len;
      
      if (!isNumber(index) || !isList(list)) {
        return error('type error');
      }
      
      len = list.length;
      
      if (index < list.length && index >= 0) {
        return list[index];
      } else {
        return error('index "' + index + '" out of bounds "' + list.length + '"');
      }
    },

    // fast arithmetics
    '+': function () {
      var len = arguments.length, sum = 0, i, n;

      for (i = 0; i < len; i += 1) {
        n = arguments[i];
        if (isNumber(n)) {
          sum += n;
        } else {
          return error('not a number');
        }
      }

      return sum;
    },
    '-': function () {
      var len = arguments.length,
	        result, n, i;
      
      if (len === 1) {
        n = arguments[0];
        if (!isNumber()) {
          return error('not a number');
        }
        return -n;
      } else if (len > 1) {
        n = arguments[0];
        
        if (!isNumber(n)) {
          return error('not a number');
        }
        
        result = n;                
        for (i = 1; i < len; i += 1) {
          n = arguments[i];
          if (isNumber(n)) {
            result -= n;
          } else {
            return error('not a number');
          }
        }
        
        return result;
      } else {
        return error('wrong number of arguments');
      }
    },
    '*': function () {
      var len = arguments.length, product = 1, i, n;
      
      for (i = 0; i < len; i += 1) {
        n = arguments[i];
        if (isNumber(n)) {
          product *= n;
        } else {
          return error('not a number');
        }
      }
      
      return product;
    },
    '/': function () {
      var len = arguments.length, quotient, i, n;
      
      if (len === 1) {
        n = arguments[i];
        if (!isNumber(n)) {
          return error('not a number');
        } else if (n === 0) {
          return error('illegal division by zero');
        } else {
          return 1 / n;
        }
      } else if (len > 1) {
        quotient = arguments[0];
        for (i = 1; i < len; i += 1) {
          n = arguments[i];
          if (isNumber(n)) {
            quotient = quotient / arguments[i];
          } else {
            return error('not a number');
          }
        }
        return quotient;
      } else {
        return error('wrong number of arguments');
      }
    },

    // lambda
    'lambda': special(function (symbols, body) {
      var scope = this,
          restIndex = findRestIndex(),
          childScope, i,
          fn = function () {
            var argLen = arguments.length,
                rest = [];
            
            childScope = Object.create(scope);

            // JISP lambdas may be recursive by providing a
            // reference to themselves.
            childScope.recur = fn;
            
            // Add symbols and their values to the new lexical
            // scope up to the rest index.
            for (i = 0; i < restIndex; i += 1) {
              childScope[symbols[i]] = arguments[i];
            }
            
            // destructure rest parameter
            for (; i < argLen; i += 1) {
              rest.push(arguments[i]);
            }
            
            // read: childScope['RESTNAME'] = ['r1', 'r2', ...]
            if (symbols.length > restIndex + 1) {
              childScope[symbols[restIndex + 1]] = rest;
            }
            
            return Interpreter.compileExpression(childScope, body);
          };

      return fn;
      
      function findRestIndex() {
        var len = symbols.length, i;
        
        for (i = 0; i < len; i += 1) {
          if (symbols[i] === Interpreter.REST) {
            return i;
          }
        }
        
        // returns symbols.length
        return i;
      }
    }),
    'call': function () {
      var args = Array.prototype.slice.call(arguments),
	        fn = args.shift();
      
      return fn.apply(this, args);
    },
    'apply': function (fn, args) {
      return fn.apply(this, args);
    },

    // branching and logic
    'if': special(function (condForm, trueForm, falseForm) {
      var scope = this,
          thunk = new Thunk();
      
      falseForm = falseForm || [];
      
      thunk.pushFunction(function (result) {
        return Interpreter.compileExpression(scope, isTrue(result) ? trueForm : falseForm);
      }, 1);
      
      thunk.merge(Interpreter.compileExpression(scope, condForm));
      
      return thunk;
    }),

    // logic and comparison
    '=': function () {
      var len = arguments.length, result, i;
      
      if (len < 2) {
        return error('wrong number of arguments');
      }
      
      for (i = 0; i < len - 1; i += 1) {
        if (isNil(arguments[i]) && isNil(arguments[i+1])) {
          result = true;
        } else if (isNumber(arguments[i]) && isNumber(arguments[i+1])) {
          result = arguments[i] === arguments[i+1]; 
        } else {
          return error('not a number');
        }
        
        if (!result) {
          break;
        }
      }
      
      return result ? Interpreter.TRUE : Interpreter.NIL;
    },
    '>': function () {               
      var len = arguments.length, result, i;
      
      if (len < 2) {
        return error('wrong number of arguments');
      }
      
      for (i = 0; i < len - 1; i += 1) {
        if (isNumber(arguments[i]) && isNumber(arguments[i+1])) {
          result = arguments[i] > arguments[i+1]; 
        } else {
          return error('not a number');
        }
        
        if (!result) {
          break;
        }
      }
      
      return result ? Interpreter.TRUE : Interpreter.NIL;
    },

    'not': function (val) {
      return isTrue(val) ? Interpreter.NIL : Interpreter.TRUE;
    },
    
    'progn': special(function () {
      var scope = this,
	        thunk = new Thunk(),
          exprs = Array.prototype.slice.call(arguments),
          firstExpr = exprs.shift();
      
      exprs.reverse().forEach(function (arg) {
        thunk.pushFunction(function (ignored) {
          return Interpreter.compileExpression(scope, arg);
        }, 1);
      });
      
      thunk.merge(Interpreter.compileExpression(scope, firstExpr));

      return thunk;
    }),
    
    // Macros which could be written in terms of JISP
    // once we've got the 'macro' special OP
    'let': macro(function (declarations, body) {
      var vars = declarations.map(function (declaration) {
	      return declaration[0];
      }),
          initForms = declarations.map(function (declaration) {
            return declaration[1];
          });

      // We keep the reference to the outer lambda.
      vars.unshift('recur');
      initForms.unshift('recur');
      
      return ['call', ['lambda', vars,
                       body]].concat(initForms);
    }),
    'let*': macro(function (declarations, body) {
      var vars = declarations.map(function (declaration) {
        return declaration[0];
      }),
          initForms = declarations.map(function (declaration) {
            return declaration[1];
          });
      
      return buildLets();
      
      function buildLets() {
        var oneVar = vars.shift(),
            oneInitForm = initForms.shift();
        
        if (oneVar) {
          return ['let', [[oneVar, oneInitForm]],
                  buildLets()];
        } else {
          return body;
        }
      }
    }),
    'or': macro(function () {
      var conditions = Array.prototype.slice.call(arguments);
      
      return buildIf();
      
      function buildIf() {
        var expr = conditions.shift();
        
        return ['if', expr,
                expr,
                conditions.length ? buildIf() : []];
      }
    }),
    'and': macro(function () {
      var conditions = Array.prototype.slice.call(arguments);
      
      return buildIf();
      
      function buildIf() {
        var expr = conditions.shift();
        
        return ['if', expr, 
                conditions.length ? buildIf() : expr,
                []];
      }
    })
  };
}(window));
