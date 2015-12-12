(function (global) {
  'use strict';

  var JISP = global.JISP,
      Tools;

  Tools = JISP.Tools = {
    extend: function () {
      var args = [].slice.call(arguments),
          target = args.shift() || {},
          sources = args;
        
      sources.forEach(function (src) {
        var props = Tools.keys(src || {});
            
        props.forEach(function (name) {
          target[name] = src[name];
        });
      });
        
      return target;
    },
    keys: function (obj) {
      var keys = [],
          key;
        
      for (key in obj) {
        if (obj.hasOwnProperty(key))  {
          keys.push(key);
        }
      }
        
      return keys;
    },
    bind: function () {
      var bindArgs = [].slice.call(arguments),
          context = bindArgs.shift(),
          fn = bindArgs.shift();
        
      return function () {
        var args = [].slice.call(arguments);
            
        return fn.apply(context, bindArgs.concat(args));
      };
    }
  };
}(window));
