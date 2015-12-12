(function (global) {
  'use strict';

  var $ = global.$,
      JSON = global.JSON,
      JISP = global.JISP,
      Interpreter = JISP.Interpreter,
      document = global.document;

  $(document).ready(function () {
    var $scripts = $('script[type="text/jisp"]'),
        $text = $('#jisp_cli'),
	gfx = $('#jisp_gfx').get(0).getContext('2d'),
	print = function () {
          var vals = [].slice.call(arguments),
              strs = vals.map(function (val) {
                return val.stringify ? val.stringify() : JSON.stringify(val);
              }),
              str = strs.join(' ');
                
          $text.append('<pre>' + str + '</pre>');
        },
        jisp = new Interpreter({
	  runtime: JISP.Runtime,
	  interruptInterval: 250, // ms
	  minimumOPs: 100,
	  ffi: {
	    'print': function () {
	      print.apply(this, arguments);
              return Interpreter.TRUE;
	    },
	    'clear': function () {
              $text.html('');
              return Interpreter.TRUE;
	    },
	    'pset': function (x, y, color, zoom) {
              color = color ? color : '#000000';
              zoom = zoom || 1;
              gfx.fillStyle = color;
              gfx.fillRect(x*zoom, y*zoom, zoom, zoom);
              return Interpreter.TRUE;
	    },
	    'rgb': function (red, green, blue) {
              var redHex = red ? Math.floor(red % 255).toString(16) : '00',
		  greenHex = green ? Math.floor(green % 255).toString(16) : '00',
		  blueHex = blue ? Math.floor(blue % 255).toString(16) : '00';
           
              return '#' + redHex + greenHex + blueHex;
	    }
	  }
	});

    evaluateNext();

    return;

    function evaluateNext() {
      var $nextScript, code;

      if ($scripts.size() !== 0) {
        $nextScript = $scripts.slice(0, 1);
        $scripts = $scripts.slice(1);
        code = jisp.parse($nextScript.text());
        jisp
          .evaluateNonBlocking(code)
          .then(evaluateNext, function (error) {
            print(error);
          });
      }
    }
  });
}(window));
