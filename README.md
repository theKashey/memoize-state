memoize-state
=====
[![CircleCI status](https://img.shields.io/circleci/project/github/theKashey/memoize-state/master.svg?style=flat-square)](https://circleci.com/gh/theKashey/memoize-state/tree/master)

__Reselect__? Memoize-one? Most of memoization libraries remeber the parameters you provided, not how you use them. 
As result is not easy to achive high cache hit ratio, cos:
- it is hard to create stuctured selectors
- you are changing a value, not changing values inside it.

**I don't want to think how to use memoization, I want to use memoization!**

Lets imagine some complex function.
```js
 const fn = memoize((number, state, string) => state[string].value + number)
 fn(1, { value: 1, otherValue: 1}, 'value');
 fn(1, { value: 1, otherValue: 2 }, 'value');
 fn(1, { value: 1 }, 'value');
```
All _ordinal_ memoization libraries will drop cache each time, as long `state` is different each time.
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

## Compatibility

__NOT__ compatible with __IE11__. One have to provide a proxy polyfill to make this work.
See https://github.com/GoogleChrome/proxy-polyfill

# Licence
MIT