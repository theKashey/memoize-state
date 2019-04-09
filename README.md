memoize-state
=====

[![Join the chat at https://gitter.im/thekashey/memoize-state](https://badges.gitter.im/thekashey/memoize-state.svg)](https://gitter.im/thekashey/memoize-state?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![CircleCI status](https://img.shields.io/circleci/project/github/theKashey/memoize-state/master.svg?style=flat-square)](https://circleci.com/gh/theKashey/memoize-state/tree/master)
[![coverage-badge](https://img.shields.io/codecov/c/github/thekashey/memoize-state.svg?style=flat-square)](https://codecov.io/github/thekashey/memoize-state)
[![version-badge](https://img.shields.io/npm/v/memoize-state.svg?style=flat-square)](https://www.npmjs.com/package/memoize-state)
[![Greenkeeper badge](https://badges.greenkeeper.io/theKashey/memoize-state.svg)](https://greenkeeper.io/)


>Caching (aka memoization) is very powerful optimization technique - however it only makes sense when maintaining the cache itself and looking up cached results is cheaper than performing computation itself again.
[You don't need WASM to speed up JS](http://mrale.ph/blog/2018/02/03/maybe-you-dont-need-rust-to-speed-up-your-js.html)



__Reselect__? Memoize-one? Most of memoization libraries remembers the parameters you provided, not what you did inside. 
Sometimes is not easy to achive high cache hit ratio. Sometimes you have to _think_ about how to properly dissolve computation into the _memoizable_ parts.

**I don't want to think how to use memoization, I want to use memoization!**

Memoize-state is built to memoize more complex situations, even the ones which are faster to recomoute, than to deside that recalculation is not needed.
Just because one cheap computation can cause a redraw/reflow/recomputation cascade for a whole application.

Lets imagine some complex function.
```js
 const fn = memoize(
   (number, state, string) => ({result:state[string].value + number})
 )
let firstValue = fn(1, { value: 1, otherValue   : 1 }, 'value'); // first call
  firstValue === fn(1, { value: 1, otherValue   : 2 }, 'value'); // "nothing" changed
  firstValue === fn(1, { value: 1, somethingElse: 3 }, 'value'); // "nothing" changed
  firstValue !== fn(2, { value: 1, somethingElse: 3 }, 'value'); // something important changed
```
All _ordinal_ memoization libraries will drop cache each time, as long `state` is different each time.
More of it - they will return a unique object each time, as long the function is returning a new object each time.
But not today!

Memoize-state memoizes tracks used __state__ parts, using the same __magic__, as you can found in __MobX__ or __immer__.
It will know, that it should react only on some `state.value1` change, but not `value2`. _Perfect_.

Now you able just to write functions AS YOU WANT. Memoize-state will detect all _really_ used arguments, variables and keys, and then - react only to the _right_ changes.

[![NPM](https://nodei.co/npm/memoize-state.png?downloads=true&stars=true)](https://nodei.co/npm/memoize-state/) 

## Implementations
- [React-memoize](https://github.com/theKashey/react-memoize) - magic memoization for React, componentWillReceiveProps optization, selection from context, whole SFC memoization.
- [beautiful-react-redux](https://github.com/theKashey/beautiful-react-redux) - instant memoization for React-Redux
- your project!  

# API
* `memoizeState(function, options)` - creates memoized variant of a function.
- Name, length (argument count), and any other own key will be transferred to memoized result
- If argument is an object - memoize will perform `proxyequal` comparison, resulting true, of you did no access any object member
- If argument is not an object - memoize will compare values.
- result function will have `cacheStatistics` method. JFYI.

### Possible options
- `cacheSize`, default 1. The size of the cache.
- `shallowCheck`, default true. Perform shallow equal between arguments.
- `equalCheck`, default true. Perform deep proxyequal comparision.
- `strictArity`, default false. Limit arguments count to the function default.
- `nestedEquality`, default true. Keep the object equality for sub-proxies.
- `safe`, default false. Activate the `safe` memoization mode. See below. 

### MapStateToProps
You know - it should be a __pure function__, returning the same results for the same arguments. 
mapStateToProps, should be strict equal across the different calls
`mapStateToProps(state) === mapStateToProps(state)`
or, at least, shallow equal
`shallowEqual(mapStateToProps(state), mapStateToProps(state))`.

Creating good memoization function, using reselect, avoiding side-effects - it could be hard. I know.

Memoize-state was created to solve this case, especially this case.

## Key principe
Memoize-state will track the way you __USE__ the state.
```js
 const state = {
   branch1: {...},
   branch2: {someKey1:1, someKey2: 2}
 }
 
 const aFunction = (state) => state.branch2.someKey2 && Math.random();
 
 const fastFunction = memoize(aFunction);
 
```
After the first launch memoize-state will detect the used parts of a state, and then react only for changes inside them
```js
 const result1 = fastFunction(state); 
 // result1 - some random. 42 for example
 const result2 = fastFunction({branch2: {someKey2:2}})
 // result2 - the same value! A new state is `proxyequal` to the old
 const result3 = fastFunction({branch2: {someKey2:3}})
 // result3 - is the NEW, at last.   
```

## Usage
* Wrap mapStateToProps by `memoize`
* Choose the memoization options (__unsafe__ by default).

```js
import memoize from 'memoize-state';

const mapStateToProps = memoize((state, props) => {
  //....
});
```

#### Memoized composition
You can use compose(flow, flowRight) to pipe result from one memoized function to another. But better to use `flow`

! All functions accepts __Object__ as input and return __Object as output.
```js
import {memoizedFlow, memoizedFlowRight, memoizedPipe, memoizedCompose} from 'memoize-state';

// memoizedFlow will merge result with the current input
// thus you can not import and not return all the keys
// and memoization will work
const sequence = memoizedFlow([
  ({a,b}) => ({sumAB: a+b}),
  ({a,c}) => ({sumAC: a+c}),
  ({sumAB, sumAC}) => ({result: sumAB+sumAC})
]);

sequence({a:1, b:1, c:1}) === ({a:1, b:1, c:1, sumAB: 2, sumAC: 2, result: 4})

//----------------

import flow from 'lodash.flow';

// You have to rethrow all the variables you might need in the future
// and memoization will not properly work, as long step2 will be regenerated then you will change b
// as long it depends on sumAB from step1
const sequence = flow([
  ({a,b, c}) => ({sumAB: a+b, a,c}),
  ({a,c, sumAB}) => ({sumAC: a+c, sumAB}),
  ({sumAB, sumAC}) => ({result: sumAB+sumAC})
]);

sequence({a:1, b:1, c:1}) === ({result: 4})
```

- `memoizedFlow` is equal to `memoizedPipe`, and applies functions from first to last.
- `memoizedFlowRight` is equal to `memoizedCompose`, and applies functions from last to right(right).


##### Additional API
You also could use memoize-state to double check your selectors.
```js
import {shouldBePure} from 'memoize-state';

const mapStateToProps = shouldBePure((state, props) => {
  //....
});
// then it will log all situations, when result was not shallow equal to the old one, but should.
```
`shouldBePure` will deactivate itself in `production` env. Use `shallBePure` if you need it always enabled.

## You said UNSAFE???
Not all functions could be `safely` memoized. Just not all of them.
The wrapped function __have to be pure__.
```js
let cache = 0;
const func = (state) => (cache || cache = state.a);
const memoizedState = memoize(func);
memoizedState({a:1}); // will return 1 AND fill up the cache
memoizedState({a:2}); // will return 1 FROM cache, and dont read anything from state
memoizedState({a:3}); // memoize state saw, that you dont read anything from a state.
// and will ignore __ANY__ changes. __FOREVER__!
``` 
> PS: this would not happened if state.a is a object. Memoize-state will understand the case, when you are returning a part of a state
 
It's easy to fix - `memoize(func, { safe: true })`, but func will be __called twice__ to detect internal memoization.

In case of internal memoization safe-memoize will deactivate itself.
  
> Check performed only twice. Once on execution, and once on first cached result.
In both cases wrapped function should return the "same" result.   
  
### Can I memoize-state memoized-state function?
Yes, you could. 

But memoize-state could disable another underlying memoizations libraries.
  
# Warning!
Not everything is simple. Memoize-state works on copies of original object, __returning the original
object, if you have returned a copy__.

That means - if you get an array. __sort it__ and return result - you will return unsorted result.

`Input has to be immutable`, don't sort it, don't mutate it, don't forget to Array.slice().
but you are the right person to watch over it.  
  
## Speed

Uses `ES6 Proxy` underneath to detect used branches of a state (as `MobX`).
Removes all the magic from result value. 
Should be slower than "manual" __reselect__ors, but faster than anything else.

We have a performance test, according to the results - 
- memoize-state __is not slower__ than major competitors, and __10-100x times faster__, for the "state" cases.
- lodash.memoize and fast-memoize could not handle __big__ states as input.
- memoize-one should be super fast, but it is not

But the major difference is
- memoize-one are having __highest hitratio__, than means - it were able to "memoize" most of the cases
```text
function of 3 arguments, all unchanged
base            x           10230 ops/sec ±2.63% (5 runs sampled)  hitratio 0% 5700 /5700
memoize-one     x        24150462 ops/sec ±3.02% (6 runs sampled)  hitratio 100% 1 /14019795
lodash.memoize  x         2954428 ops/sec ±4.02% (6 runs sampled)  hitratio 100% 1 /15818699
fast-memoize    x         1065755 ops/sec ±3.22% (6 runs sampled)  hitratio 100% 1 /16243313
memoize-state   x         4910783 ops/sec ±2.55% (5 runs sampled)  hitratio 100% 1 /18929141
Fastest is memoize-one

function of 1 arguments, object unchanged
base            x       408704195 ops/sec ±0.55% (5 runs sampled)  hitratio 100% 0 /188881067
memoize-one     x        77024718 ops/sec ±1.78% (6 runs sampled)  hitratio 100% 0 /221442642
lodash.memoize  x         3776797 ops/sec ±1.55% (6 runs sampled)  hitratio 100% 0 /223654022
fast-memoize    x        75375793 ops/sec ±3.08% (6 runs sampled)  hitratio 100% 0 /267664702
memoize-state   x         5690401 ops/sec ±3.77% (5 runs sampled)  hitratio 100% 0 /271589669
Fastest is base

function of 1 arguments, object unchanged
base            x       398167311 ops/sec ±0.50% (6 runs sampled)  hitratio 100% 0 /190155405
memoize-one     x        76062398 ops/sec ±3.71% (6 runs sampled)  hitratio 100% 0 /231172341
lodash.memoize  x         3734556 ops/sec ±6.70% (6 runs sampled)  hitratio 100% 0 /233243184
fast-memoize    x        37234595 ops/sec ±2.30% (6 runs sampled)  hitratio 100% 0 /250419641
memoize-state   x          639290 ops/sec ±6.09% (6 runs sampled)  hitratio 100% 0 /250718787
Fastest is base

function of 2 arguments, providing 3, all unchanged
base            x           10426 ops/sec ±3.01% (6 runs sampled)  hitratio 0% 3712 /3712
memoize-one     x        24164455 ops/sec ±6.67% (6 runs sampled)  hitratio 100% 1 /15190474
lodash.memoize  x         2826340 ops/sec ±3.44% (6 runs sampled)  hitratio 100% 1 /16624930
fast-memoize    x         1070852 ops/sec ±2.70% (6 runs sampled)  hitratio 100% 1 /17155394
memoize-state   x         4966459 ops/sec ±1.13% (5 runs sampled)  hitratio 100% 1 /19324311
Fastest is memoize-one

function of 3 arguments, all changed / 10
base            x           10189 ops/sec ±3.13% (6 runs sampled)  hitratio 0% 3657 /3657
memoize-one     x           19842 ops/sec ±2.73% (6 runs sampled)  hitratio 63% 5316 /14288
lodash.memoize  x           33160 ops/sec ±1.45% (5 runs sampled)  hitratio 83% 5782 /33561
fast-memoize    x           19029 ops/sec ±6.04% (5 runs sampled)  hitratio 86% 6731 /47024
memoize-state   x           18527 ops/sec ±10.56% (5 runs sampled)  hitratio 93% 3868 /54760
Fastest is lodash.memoize

function with an object as argument, returning a part
base            x           10095 ops/sec ±3.49% (5 runs sampled)  hitratio 0% 4107 /4107
memoize-one     x           10054 ops/sec ±3.14% (6 runs sampled)  hitratio 50% 4141 /8249
lodash.memoize  x         1695449 ops/sec ±3.68% (6 runs sampled)  hitratio 100% 1 /950379
fast-memoize    x         1287216 ops/sec ±1.29% (6 runs sampled)  hitratio 100% 1 /1590863
memoize-state   x         1574688 ops/sec ±2.24% (6 runs sampled)  hitratio 100% 1 /2469327
Fastest is lodash.memoize

function with an object as argument, changing value, returning a part
base            x           10187 ops/sec ±1.66% (6 runs sampled)  hitratio 0% 4179 /4179
memoize-one     x           10205 ops/sec ±3.96% (6 runs sampled)  hitratio 50% 4174 /8354
lodash.memoize  x           87943 ops/sec ±12.70% (5 runs sampled)  hitratio 92% 4138 /49727
fast-memoize    x           90510 ops/sec ±1.05% (6 runs sampled)  hitratio 96% 3972 /89439
memoize-state   x           76372 ops/sec ±6.67% (6 runs sampled)  hitratio 97% 3612 /125554
Fastest is fast-memoize,lodash.memoize

function with an object as argument, changing other value, returning a part
base            x            9867 ops/sec ±7.72% (5 runs sampled)  hitratio 0% 4537 /4537
memoize-one     x           10066 ops/sec ±4.24% (5 runs sampled)  hitratio 47% 5059 /9597
lodash.memoize  x           92596 ops/sec ±0.61% (6 runs sampled)  hitratio 92% 4515 /54745
fast-memoize    x           89224 ops/sec ±1.24% (5 runs sampled)  hitratio 96% 3445 /89181
memoize-state   x         1469865 ops/sec ±2.95% (5 runs sampled)  hitratio 100% 1 /805990
Fastest is memoize-state

function with 2 objects as argument, changing both value
base            x           10127 ops/sec ±2.21% (5 runs sampled)  hitratio 0% 5489 /5489
memoize-one     x           10030 ops/sec ±3.97% (6 runs sampled)  hitratio 60% 3702 /9192
lodash.memoize  x            9745 ops/sec ±4.69% (6 runs sampled)  hitratio 70% 3997 /13190
fast-memoize    x            9268 ops/sec ±5.04% (5 runs sampled)  hitratio 77% 3855 /17046
memoize-state   x           63493 ops/sec ±6.49% (6 runs sampled)  hitratio 94% 2736 /44395
Fastest is memoize-state

when changes anything, except the function gonna to consume
base            x            9901 ops/sec ±3.78% (6 runs sampled)  hitratio 0% 5121 /5121
memoize-one     x           10087 ops/sec ±2.59% (6 runs sampled)  hitratio 57% 3914 /9036
lodash.memoize  x            9643 ops/sec ±1.25% (6 runs sampled)  hitratio 67% 4361 /13398
fast-memoize    x            9554 ops/sec ±1.13% (6 runs sampled)  hitratio 76% 4228 /17627
memoize-state   x          520442 ops/sec ±1.54% (5 runs sampled)  hitratio 100% 1 /270727
Fastest is memoize-state

when state is very big, and you need a small part
base            x           10097 ops/sec ±1.63% (6 runs sampled)  hitratio 0% 4428 /4428
memoize-one     x            9262 ops/sec ±6.27% (5 runs sampled)  hitratio 53% 3974 /8403
lodash.memoize  x             276 ops/sec ±3.31% (6 runs sampled)  hitratio 100% 12 /8516
fast-memoize    x             280 ops/sec ±4.77% (6 runs sampled)  hitratio 100% 10 /8615
memoize-state   x           83005 ops/sec ±6.47% (6 runs sampled)  hitratio 92% 4042 /49019
Fastest is memoize-state
``` 

### Even more speed

```js
function fn1(object) {
  return object.value
}

// ^^ memoize state will react to any change of .value

function fn2(object) {
  return {...object.value}
}

// ^^ memoize state will react to any change of the values inside the .value

// for example, if value contain booleans the X and they Y - they form 4 possible pairs
const superMemoize = memoize(fn2, { cacheSize: 4 });

// ^^ you just got uber function, which will return 4 exactly the same objects
```

## The cost of the magic
Executing the function against EMPTY function, but triggering most of internal mechanics.
```text
base            x       244.000.431 
memoize-one     x        18.150.966 
lodash.memoize  x         3.941.183 
fast-memoize    x        34.699.858 
memoize-state   x         4.615.104 
```
> this 4 millions operations per second? A bit more that enough

## The common memoization
Memoize-state is not a best fit for a common case. It is designed to handle
- the complex objects
- limited count of stored cache lines (default: 1)

This is a fibonacci test from - fast-memoize. The test uses different performance measuring tool
and numbers differs.
```test
│ fast-memoize@current       │ 204,819,529 │ ± 0.85%                  │ 88          │
├────────────────────────────┼─────────────┼──────────────────────────┼─────────────┤
│ lru-memoize (single cache) │ 84,862,416  │ ± 0.59%                  │ 93          │
├────────────────────────────┼─────────────┼──────────────────────────┼─────────────┤
│ iMemoized                  │ 35,008,566  │ ± 1.29%                  │ 90          │
├────────────────────────────┼─────────────┼──────────────────────────┼─────────────┤
│ lodash                     │ 24,197,907  │ ± 3.70%                  │ 82          │
├────────────────────────────┼─────────────┼──────────────────────────┼─────────────┤
│ underscore                 │ 17,308,464  │ ± 2.79%                  │ 87          │
├────────────────────────────┼─────────────┼──────────────────────────┼─────────────┤
│ memoize-state <<----       │ 17,175,290  │ ± 0.80%                  │ 87          │
├────────────────────────────┼─────────────┼──────────────────────────┼─────────────┤
│ memoizee                   │ 12,908,819  │ ± 2.60%                  │ 78          │
├────────────────────────────┼─────────────┼──────────────────────────┼─────────────┤
│ lru-memoize (with limit)   │ 9,357,237   │ ± 0.47%                  │ 91          │
├────────────────────────────┼─────────────┼──────────────────────────┼─────────────┤
│ ramda                      │ 1,323,820   │ ± 0.54%                  │ 92          │
├────────────────────────────┼─────────────┼──────────────────────────┼─────────────┤
│ vanilla                    │ 122,835     │ ± 0.72%                  │ 89          │
└────────────────────────────┴─────────────┴──────────────────────────┴─────────────┘
```
memoize-state is comparable with lodash and underscore, even in this example.

## Spread no-op
>memoize-state: object spread detected in XXX. Consider refactoring.

Memoize state could not properly work if you "spread" state
```js
const mapStateToProps = ({prop,i,need,...rest}) =>....
//or
const mapStateToProps = (state, props) => ({ ...state, ...props })
//or
const mapState = ({ page, direction, ...state }) => ({
  page,
  direction,
  isLoading: isLoading(state)
})
``` 
It will assume, that you need ALL the keys, meanwhile - you could not.

Workaround - refactor the code
```js
const mapState = state => ({
  page: state.page,
  direction: state.direction,
  isLoading: isLoading(state)
})
```

See [issue](https://github.com/theKashey/memoize-state/issues/3#issuecomment-372226092) for more details

## Compatibility

IE11/Android compatible. Contains [proxy-polyfill](https://github.com/GoogleChrome/proxy-polyfill) inside.

# Licence
MIT
