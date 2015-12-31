# JISP

## What is JISP?

JISP stands for "JavaScript List Processing" and is a minimal strict functional, interpreted language inspired by LISP. It uses JSON instead of S-expressions for its syntax making it less readable but on the other hand much easier to implement -- which was the primary design goal. 

Well, JISP is your regular half-assed toy programming language of which there are many more on github. One thing that may be special about this one is its support for anonymous, recursive functions that are guaranteed not to blow the JavaScript stack as the intepreter is automatically trampolining recursive calls for you. Furthermore, there is built-in support for non-blocking execution of JISP programs so long running programs are not paused by the browser and you can have intermediate textual or graphical updates. Programming in JISP is therefore a much more joyful experience than in other slow toy programming languages.

## How to build

Just install npm and run Grunt on the repository. A file named "jisp.js" will be generated. To try out the interpreter just open one of the example programs in your browser: <a href="https://github.com/gernotk/JISP/blob/master/factorial.html">factorial.html</a>, <a href="https://github.com/gernotk/JISP/blob/master/filter.html">filter.html</a>, <a href="https://github.com/gernotk/JISP/blob/master/qsort.html">qsort.html</a> and <a href="https://github.com/gernotk/JISP/blob/master/mandelbrot.html">mandelbrot.html</a>.

## Key language features

* lists

```
['length', ['quote', [1, 2, 3]]]
//-> 3

['car', ['quote', [1, 2, 3]]]
//-> 1

['cdr', ['quote', [1, 2, 3]]]
//-> [2, 3]

['cons', 1, ['quote', [2, 3]]]
//-> [1, 2, 3]

['nth', 2, ['quote', [1, 2, 3]]]
//-> 3
```

* numbers and basic arithmetics:

```
['+', 1, 2, 3, ['*', 2, 2], 5]
//-> 15
```

* symbols which can replace literal strings:

```
['quote', 'this is a simple string literal']
//-> 'this is a simple string literal'
```

* lexical bindings:

```
['let*', 
  [['foo', 4],
   ['foo²', ['*', 'foo', 'foo']]],
  ['+', 'foo²', 'foo²']]
//-> 32
```

* conditional branching:

```
['if', ['>', 'n', 100],
  ['quote', 'n lt than 100'],
  ['quote', 'n se than 100']]
```

* basic logic:
```
['or', 'NIL', 42]
//-> 42

['and', 'NIL', 42]
//-> NIL

['or', ['and', 'NIL', 42], ['and', 1, 2]]
//-> 2
```

* anonymous but first class and recursive functions:

```
[['lambda', ['n'],
  ['if', ['=', 'n', 0],
    1,
    ['recur', ['-', 'n', 1]]]], 3]
//-> 3! = 6

['let',
  [['fac', ['lambda', ['n'],
             ['if', ['=', 'n', 0'],
              1,
              ['recur', ['-', 'n', 1]]]]]],
  ['fac', 3]]
//-> 3! = 6
```

* rest arguments:

```
[['lambda', ['&rest', 'args'],
  'args'], 1, 2, 3]
//-> [1, 2, 3]
```

* in the future, hopefully: macros to make the language more extensible

## Interpreter gimmicks

* Don't worry about recursions or even mutual recursive functions: The interpreter's built-in automatic trampolining will preserve your precious stack.

* A foreign function interface to extend the interpreter. Have a look at <a href="https://github.com/gernotk/JISP/blob/master/src/runner.js">src/runner.js</a> to find out how to use that feature to support easy graphics.

```
var jisp = new JISP.Interpreter({
             runtime: JISP.runtime,
             ffi: {
               // creates a 'print' function in the 
               // global namespace of JISP:
               print: function (val) {
                 var str;
                 
                 if (Interpreter.isSymbol(val) ||
                     Interpreter.isNumber(val)) {
                   str = val;
                 } else {
                   str = JSON.stringify(val);
                 }
                 
                 $container.append(str + '<br/>');
                 
                 return Interpreter.TRUE;
               }
             }
           });
```

* non-blocking program execution
