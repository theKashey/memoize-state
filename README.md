memoize-state
=====
[![CircleCI status](https://img.shields.io/circleci/project/github/theKashey/memoize-state/master.svg?style=flat-square)](https://circleci.com/gh/theKashey/memoize-state/tree/master)

>Caching (aka memoization) is very powerful optimization technique - however it only makes sense when maintaining the cache itself and looking up cached results is cheaper than performing computation itself again.
[You don't need WASM to speed up JS](http://mrale.ph/blog/2018/02/03/maybe-you-dont-need-rust-to-speed-up-your-js.html)



__Reselect__? Memoize-one? Most of memoization libraries remeber the parameters you provided, not how you use them. 
As result is not easy to achive high cache hit ratio, cos:
- it is hard to create stuctured selectors
- you are changing a value, not changing values inside it.

**I don't want to think how to use memoization, I want to use memoization!**

Memoize-state is built to memoize more complex situations, even if it is cheaper to perform a computation.
Just because one cheap computation can cause a recomputation cascade.

Lets imagine some complex function.
```js
 const fn = memoize((number, state, string) => ({result:state[string].value + number}))
 fn(1, { value: 1, otherValue: 1}, 'value');
 fn(1, { value: 1, otherValue: 2 }, 'value');
 fn(1, { value: 1 }, 'value');
```
All _ordinal_ memoization libraries will drop cache each time, as long `state` is different each time.
More of it - it will return a unique object each time.
But not today!

Memoize-state memoizes used __state__ parts, using the same __magic__, as you can found in __MobX__.
It will know, that it should react only state.value. _Perfect_.

[![NPM](https://nodei.co/npm/memoize-state.png?downloads=true&stars=true)](https://nodei.co/npm/memoize-state/)

# API
* `memoizeState(function, options)` - creates memoized variant of a function.
- Name, length (argument count), and any other own key will be transferred to memoized result
- If argument is an object - memoize will perform `proxyequal` comparison, resulting true, of you did no access any object member
- If argument is not an object - memoize will compare values.
- result function will have `cacheStatistics` method. JFYI.

### Possible options
- cacheSize, default 1. The size of cache.
- shallowCheck, default true. Perform shallow equal between arguments.
- equalCheck, default true. Perform deep proxyequal comparision.
- strictArity, default false. Limit arguments count to the function default.
- nestedEquality, default true. Keep the object equality for sub-proxies.
- safe, default false. Activate the `safe` memoization mode. See below. 

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
memoize-one     x         6563316 ops/sec ±1.50% (6 runs sampled)  hitratio 100% 2 /2432667
lodash.memoize  x         2988552 ops/sec ±3.98% (5 runs sampled)  hitratio 100% 1 /3844342
fast-memoize    x         1007010 ops/sec ±1.18% (6 runs sampled)  hitratio 100% 1 /4443629
memoize-state   x         3753869 ops/sec ±1.33% (6 runs sampled)  hitratio 100% 1 /6175599
Fastest is memoize-one

function of 2 arguments, providing 3, all unchanged
memoize-one     x         6077327 ops/sec ±1.53% (6 runs sampled)  hitratio 100% 2 /2534824
lodash.memoize  x         2780103 ops/sec ±1.88% (6 runs sampled)  hitratio 100% 1 /3615601
fast-memoize    x          928385 ops/sec ±4.59% (6 runs sampled)  hitratio 100% 1 /3998562
memoize-state   x         3389800 ops/sec ±1.51% (6 runs sampled)  hitratio 100% 1 /5243823
Fastest is memoize-one

function of 3 arguments, all changed / 10
memoize-one     x           19043 ops/sec ±1.15% (6 runs sampled)  hitratio 50% 4083 /8163
lodash.memoize  x           30242 ops/sec ±1.45% (5 runs sampled)  hitratio 79% 6114 /28541
fast-memoize    x           17442 ops/sec ±0.78% (6 runs sampled)  hitratio 92% 2891 /34322
memoize-state   x           16621 ops/sec ±2.16% (6 runs sampled)  hitratio 92% 3225 /40772
Fastest is lodash.memoize

function with an object as argument, returning a part
memoize-one     x            8822 ops/sec ±1.39% (5 runs sampled)  hitratio 0% 4337 /4337
lodash.memoize  x         1378671 ops/sec ±8.92% (6 runs sampled)  hitratio 100% 1 /669631
fast-memoize    x         1027750 ops/sec ±6.03% (6 runs sampled)  hitratio 100% 1 /1246719
memoize-state   x         1207975 ops/sec ±2.08% (6 runs sampled)  hitratio 100% 1 /1805336
Fastest is lodash.memoize

function with an object as argument, changing value, returning a part
memoize-one     x            8236 ops/sec ±1.54% (6 runs sampled)  hitratio 0% 4112 /4112
lodash.memoize  x           74548 ops/sec ±4.14% (6 runs sampled)  hitratio 91% 4106 /45160
fast-memoize    x           71851 ops/sec ±2.60% (6 runs sampled)  hitratio 96% 3524 /80393
memoize-state   x           61650 ops/sec ±1.28% (6 runs sampled)  hitratio 98% 2632 /106706
Fastest is lodash.memoize,fast-memoize

function with an object as argument, changing other value, returning a part
memoize-one     x            7683 ops/sec ±1.78% (6 runs sampled)  hitratio 0% 3488 /3488
lodash.memoize  x           69976 ops/sec ±2.08% (6 runs sampled)  hitratio 91% 3086 /34339
fast-memoize    x           66844 ops/sec ±2.26% (6 runs sampled)  hitratio 96% 2308 /57408
memoize-state   x         1085455 ops/sec ±2.39% (6 runs sampled)  hitratio 100% 1 /399267
Fastest is memoize-state

function with 2 objects as argument, changing both value
memoize-one     x            7251 ops/sec ±7.62% (6 runs sampled)  hitratio 0% 3263 /3263
lodash.memoize  x            7255 ops/sec ±3.94% (5 runs sampled)  hitratio 56% 2591 /5855
fast-memoize    x            7197 ops/sec ±2.57% (6 runs sampled)  hitratio 64% 3341 /9197
memoize-state   x           45612 ops/sec ±5.28% (6 runs sampled)  hitratio 94% 1487 /24063
Fastest is memoize-state

when changes anything, except the function gonna to consume
memoize-one     x            8003 ops/sec ±0.99% (5 runs sampled)  hitratio 0% 3453 /3453
lodash.memoize  x            7640 ops/sec ±2.47% (6 runs sampled)  hitratio 50% 3490 /6944
fast-memoize    x            7315 ops/sec ±1.38% (5 runs sampled)  hitratio 73% 2576 /9521
memoize-state   x          461062 ops/sec ±37.16% (6 runs sampled)  hitratio 100% 1 /270082
Fastest is memoize-state

when state is very big, and you need a small part
memoize-one     x            7713 ops/sec ±2.21% (6 runs sampled)  hitratio 0% 3518 /3518
lodash.memoize  x             198 ops/sec ±2.48% (6 runs sampled)  hitratio 100% 10 /3613
fast-memoize    x             201 ops/sec ±1.54% (6 runs sampled)  hitratio 100% 9 /3688
memoize-state   x           61350 ops/sec ±2.49% (6 runs sampled)  hitratio 91% 3072 /34404
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


## Compatibility

__NOT__ compatible with __IE11__. One have to provide a proxy polyfill to make this work.
See https://github.com/GoogleChrome/proxy-polyfill

# Licence
MIT