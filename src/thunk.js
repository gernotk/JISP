(function (global) {
  'use strict';

  var JISP = global.JISP,
      Error = JISP.Error,
      Tools = JISP.Tools,
      extend = Tools.extend,
      Promise = global.Promise,
      Date = global.Date,
      setTimeout = global.setTimeout,
      Thunk;

  /**
   * Implements a "thunk", an object that can 
   + resolve recursive calls.
   *
   * @class Thunk
   * @namespace {JISP}
   */
  Thunk = JISP.Thunk = function (options) {
    this.options = options || {};
    /**
     * Stores function calls in the order they compiled.
     *
     * @property {Array} executionStack
     * @private
     */
    this.executionStack = [];
    this.backtrace = [];
  };

  extend(Thunk.prototype, {
    /**
     * Takes a function and the number of arguments 
     * the function will consume from the argument stack.
     * You may pass the original expression for better 
     * error reporting.
     *
     * @method pushFunction
     * @param {Function} fn
     * @param {Number} nrOfArgsConsumed
     * @param {Object} expr (optional)
     * @chainable
     */
    pushFunction: function (fn, nrOfArguments, fexpr) {
      this.executionStack.push({
	f: fn, 
        n: nrOfArguments,
        fe: fexpr || ''
      });

      return this;
    },
    
    /**
     * Takes a value of any type and puts it on 
     * the top of the argument stack.
     *
     * @method pushArgument
     * @param {Any} arg
     * @chainable
     */
    pushArgument: function (arg) {
      this.executionStack.push({a: arg});
      return this;
    },
    
    /**
     * Returns true if the element is a function call
     * argument.
     *
     * @method isArgument
     * @param {Any} arg
     * @return {Boolean}
     * @private
     */
    isArgument: function (elt) {
      return elt.hasOwnProperty('a');
    },
    
    pushError: function (err, expr) {
      err.backtrace.push(expr);
      this.executionStack.push({e: err});
      return this;
    },
    
    isError: function (elt) {
      return elt.hasOwnProperty('e');
    },
    
    /**
     * Returns the next element on the execution stack.
     *
     * @method pop
     * @return {Any}
     * @private
     */
    pop: function () {
      return this.executionStack.pop();
    },
    
    /**
     * Returns true if there are no function calls left.
     *
     * @method isConsumed
     * @return {Boolean}
     */
    isConsumed: function () {
      return this.executionStack.length === 0;
    },
    
    /**
     * Returns a copy of this thunk.
     *
     * @method clone
     * @return {Thunk}
     */
    clone: function () {
      var self = this,
          copy = new Thunk();

      copy.executionStack = 
        this.executionStack.map(function (elt) {
          if (self.isArgument(elt)) {
            return {a: elt.a};
          } else if (self.isError(elt)) {
            return {e: elt.e};
          } else {
            return {f: elt.f, n: elt.n, fe: elt.fe};
          }
        });
      
      return copy;
    },
    
    /**
     * Takes a thunk and merges it with this thunk. This
     * is how we resolve recursions.
     *
     * @method merge
     * @parameter {Thunk} thunk
     * @chainable
     */
    merge: function (thunk) {
      this.executionStack = this.executionStack.concat(thunk.executionStack);
      return this;
    },

    /**
     * Executes the thunk by repeatedly consuming function 
     * calls from its execution stack. In cases
     * where a function is returning itself a thunk (i.e. it is recursing),
     * the resulting thunk will be 'merged' with this thunk instead of executed
     * directly.
     *
     * Note, the method operates on a copy of this thunk and, thus, 
     * works non-destructively. This could be used to speed up compilations
     * of recursive functions by reusing the original thunk.
     *
     * This method may runs quite a while and blocks the JS event queue.
     * If you want intermediate screen updates you should use 'executeNonBlocking'
     * that, however, comes with a performance penality.
     *
     * @method execute
     * @return {Any}
     */
    execute: function() {
      var myCopy = this.clone(),
          stack = [],
          backtrace = [];
      
      this.backtrace = backtrace;
      
      while (!myCopy.isConsumed()) {
	myCopy.executeOnce(stack);
      }

      return stack.pop();
    },

    executeNonBlocking: function (interruptInterval, minOPs) {
      var myCopy = this.clone(),
          stack = [],
          backtrace = this.backtrace = [],
          safeInterruptInterval = Math.max(interruptInterval || 0, 0),
          safeMinOPs = Math.max(minOPs, 1),
          promise = new Promise(function (resolve, reject) {
            var continuation = function () {
              var past = Date.now(),
                  timePassed = 0,
                  opCnt = 0;

              try {
                if (myCopy.isConsumed()) {
                  resolve(stack.pop());
                }
                
                while(!myCopy.isConsumed() && 
                      (timePassed <= safeInterruptInterval)) {
                  myCopy.executeOnce(stack);
                  if (opCnt++ === safeMinOPs) {
                    timePassed = Date.now() - past;
                    opCnt = 0;
                  }
                }
                
                setTimeout(continuation, 0);
              } catch (err) {
                reject(err);
              }
            };
            
            setTimeout(continuation, 0);
          });
      
      return promise;
    },
    
    /**
     * Performs one method call on the execution stack and returns.
     * The call is destructive and returns whether this thunk 
     * is consumed.
     *
     * @method executeOnce
     * @parameter {Array} stack
     * @return {Boolean}
     * @private
     */
    executeOnce: function (stack) {
      var backtrace = this.backtrace,
          maxBackTrace = this.options.maxBackTrace || 10,
          elt, fn, nrOfArgs, fexpr, fnArgs, i, returnVal;
      
      if (!this.isConsumed()) {
	elt = this.pop();

        if (this.isError(elt)) {
          // compiler error
          elt.e.backtrace = elt.e.backtrace.concat(backtrace);
          throw elt.e;
        } else if (this.isArgument(elt)) {
          stack.push(elt.a);
        } else {
          fn = elt.f;
          nrOfArgs = elt.n;
          fexpr = elt.fe;
          fnArgs = [];
          
          backtrace.push(fexpr);
          
          for (i = 0; i < nrOfArgs; i += 1) {
            fnArgs.unshift(stack.pop());
          }
          
          returnVal = fn.apply(fn, fnArgs);
          
          if (Error.isError(returnVal)) {
            // runtime error
            returnVal.backtrace = returnVal.backtrace.concat(backtrace);
            throw returnVal;
          } else if (returnVal instanceof Thunk) {
            // recursion
            this.merge(returnVal);
          } else {
            stack.push(returnVal);
          }
        }
      }
      
      if (backtrace.length > maxBackTrace) {
        backtrace.splice(0, maxBackTrace);
      }
      
      return this.isConsumed();
    }
  });
}(window));
