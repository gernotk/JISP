(function (global) {
  'use strict';

  var $ = global.$,
      JSON = global.JSON,
      JISP = global.JISP,
      Math = global.Math,
      Interpreter = JISP.Interpreter;

  // jQuery plugin for embedding
  $.fn.jispRun = function (options) {
    var $this = this,
        $text = $(options.cli || '#jisp_cli'),
        $gfx = $(options.gfx || '#jisp_gfx'),
        gfx = $gfx.get(0).getContext('2d'),
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
              gfx.fillRect(x * zoom, y * zoom, zoom, zoom);
              return Interpreter.TRUE;
	          },
	          'rgb': function (red, green, blue) {
              var redHex = red ? Math.floor(red % 255).toString(16) : '00',
		              greenHex = green ? Math.floor(green % 255).toString(16) : '00',
		              blueHex = blue ? Math.floor(blue % 255).toString(16) : '00';

              return '#' + redHex + greenHex + blueHex;
	          },
            'canvasWidth': function () {
              return global.parseInt($gfx.attr('width'), 10);
            },
            'canvasHeight': function () {
              return global.parseInt($gfx.attr('height'), 10);
            }
	        }
	      });

    if ($this.length > 0) {
      evaluateNext();
    }

    return $this;

    function evaluateNext() {
      var $nextScript, code;

      if ($this.size() !== 0) {
        $nextScript = $this.slice(0, 1);
        $this = $this.slice(1);
        code = jisp.parse($nextScript.text());
        jisp
          .evaluateNonBlocking(code)
          .then(evaluateNext, function (error) {
            print(error);
          });
      }
    }

    function print() {
      var vals = [].slice.call(arguments),
          strs = vals.map(function (val) {
            return val.stringify ? val.stringify() : JSON.stringify(val);
          }),
          str = strs.join(' ');
          
      $text.append('<pre>' + str + '</pre>');
    }
  };
  
  $(document).ready(function () {
    var $scripts = $('script[type="text/jisp"]');

    $scripts.jispRun({
      cli: '#jisp_cli',
      gfx: '#jisp_gfx'
    });
  });
}(window));
