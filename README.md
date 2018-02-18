memoize-state
=====
__Reselect__? Memoize-one? It is quite __hard__ to __debug__ how __mapStateToProps__ behave.

You know - it should be a __pure function__, returning the same results for the same arguments. 
mapStateToProps, should be strict equal across the different calls

`mapStateToProps(state) === mapStateToProps(state)`

or, at least, shallow equal. Actually this is the case, redux expects
 
`shallowEqual(mapStateToProps(state), mapStateToProps(state))`.

But it does not.

Most of memoizations works as __selectors__, making a new result to be __shallowequal__ to the old one, to prevent
unnecessary redraw.

Memoize-state memoizes used __state__, using the same __magic__, as you can found in __MobX__.
And, you know, you can use it to memoize any function.

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
Memoize-state could break the way your application works, if you will use additional memoization inside a wrapped function.
The wrapped function __have to be pure__, a more __pure__ than usual -

> __No side effects. NO SIDE EFFECTS AT ALL!. Including memoization__

In case of internal memoization memoize-state could remove _internally memoized_ branches, and does not reflects changes made inside
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
  
> Lodash memoize will access a few branches of on object, making memoize state thinking that you need them, not the object.
It will break the stuff.  
  
### Can I memoize-state memoized-state function?
Yes, you could. It's aways depends.

There is always one rule - you shall not memoize one branch one time, and access it without memoization second time.
memoize-state will always report if something goes wrong (in safe mode).
  
## Keep in mind
Sometimes you have to "explain" which variable should be tract.
```js
memoized ( state => state ? something : state, N) // bad
memoized ( state => state ? something : {...state}, N) // good (actually way bad
```  
Where `N` - number of different combinations state could form. {...state} will enumerate all the keys for
the memoize-one, and make the magic - pure and consistent results.  
## Speed

Uses `ES6 Proxy` underneath to detect used branches of a state (as `MobX`). 
Should be slower than "manual" __reselect__ors, but faster than anything else. 

## Compatibility

__NOT__ compatible with __IE11__. One need to provide a proxy polyfill to make this work.
See https://github.com/GoogleChrome/proxy-polyfill

# Licence
MIT