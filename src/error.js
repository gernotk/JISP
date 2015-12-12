(function (global) {
  'use strict';

  var JISP = global.JISP,
      Tools = JISP.Tools,
      extend = Tools.extend,
      Error;

  Error = JISP.Error = function (msg) {
    this.msg = msg;
    this.backtrace = [];
  };

  extend(Error.prototype, {
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
    isError: function (value) {
      return value instanceof Error;
    },
    error: function (msg) {
      return new Error(msg);
    }
  });
}(window));
