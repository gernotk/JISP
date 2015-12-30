# JISP (JavaScript list processing)

## What is JISP?

JISP stands for "JavaScript List Processing" and is a minimal strict functional, interpreted language inspired by LISP. It uses JSON instead of S-expressions for its syntax making it less readable but on the other hand much easier to implement -- which was the primary design goal. 

Well, JISP is your regular half-assed toy programming language of which there are many more on github. One thing that may be special about this one is its support for anonymous, recursive functions that are guaranteed not to blow the JavaScript stack as the intepreter is automatically trampolining recursive calls for you. Furthermore, there is built-in support for non-blocking execution of JISP programs so long running programs are not paused by the browser and you can have intermediate textual or graphical updates. Programming in JISP is therefore a much more joyful experience than in other slow toy programming languages.

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
```

* numbers and basic arithmetics:

```
['+', 1, 2, 3, ['*', 2, 2], 5]
```

* symbols which can replace literal strings:

```
['quote', 'this is a simple string literal']
```

* anonymous but recursive function definitions:

```
[['lambda', ['n'],
  ['if', ['=', 'n', 0],
    1,
    ['recur', ['-', 'n', 1]]]], 3]
//-> 3! = 6
```

* rest arguments:

```
[['lambda', ['&rest', 'args'],
  'args'], 1, 2, 3]
//-> [1, 2, 3]
```

* lexical bindings:

```
['let*', 
  [['foo', 4],
   ['foo²', ['*', 'foo', 'foo']]],
  ['+', 'foo²', 'foo²']]
```
