(function (global) {
  'use strict';

  var JISP = global.JISP,
      Tools = JISP.Tools,
      extend = Tools.extend,
      Error;

  /**
   * A minimal error handling class for JISP. Provides a super minimal
   * backtrace and stringification of runtime errors (but not parser
   * errors).
   *
   * @param {String} msg
   * @namespace {JISP}
   * @constructor
   */
  Error = JISP.Error = function (msg) {
    this.msg = msg;
    this.backtrace = [];
  };

  extend(Error.prototype, {
    /**
     * Creates a string from this error.
     * @returns {String}
     */
    stringify: function () {
      var msg = this.msg,
          backtrace = this.backtrace || [],
          len = backtrace.length,
          cr = '\n',
          str = msg + ' at' + cr,
          i;
            
      for (i = len - 1; i >= 0; i -= 1) {
        str += indent(len - i) + JSON.stringify(backtrace[i]) + cr;
      }
            
      return str;
            
      function indent(count) {
        var tab = ' ',
            str = '';
                
        while (count-- > 0) {
          str += tab;
        }
                
        return str;
      }
    }
  });

  extend(Error, {
    /**
     * Takes a JISP value and reports whether this is in fact a
     * runtime error.
     *
     * @param {jisp value}
     * @returns {String}
     * @static
     */
    isError: function (value) {
      return value instanceof Error;
    },

    /**
     * A factory function for creating runtime errors.
     *
     * @param {String} error message
     * @returns {JISP.Error}
     */
    error: function (msg) {
      return new Error(msg);
    }
  });
}(window));
