module.exports = function(grunt) {

  grunt.initConfig({
    jshint: {
      files: ['Gruntfile.js', 'src/**/*.js'],
      options: {
      }
    },
    concat: {
      dist: {
	src: [
	  'lib/**.js',
	  'src/jisp.js',
	  'src/tools.js',
	  'src/error.js',
	  'src/thunk.js',
	  'src/interpreter.js',
	  'src/runtime_native.js',
	  'src/runner.js'
	],
	dest: 'jisp.js'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');

  grunt.registerTask('default', ['jshint', 'concat']);
};
