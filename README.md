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

Memoize-state memoized used __state__, using the same __magic__, as you can found in __MobX__.
And, you know, you can use it to memoize any function.

[![NPM](https://nodei.co/npm/memoize-state.png?downloads=true&stars=true)](https://nodei.co/npm/memoize-state/)

## Key principe
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
* Choose the memoization count (1 by default).

```js
import memoize from 'memoize-state';

const mapStateToProps = memoize((state, props) => {
  ....
});
```

You also could use memoize-state to double check your selectors.
```js
import {shouldBePure} from 'memoize-state';

const mapStateToProps = shouldBePure((state, props) => {
  ....
});
// then it will log all situations, when result was not shallow equal to the old one, but should.
```
`shouldBePure` will deactive itself in `production` env. Use `shallBePure` if you need it always enabled.
  
## Speed

Uses `ES6 Proxy` underneath to detect used branches of a state (as `MobX`). 
Should be slower than "manual" __reselect__ors, but faster than anything else. 

## Compatibility

__NOT__ compatible with __IE11__. One need to provide a proxy polyfill to make this work.
See https://github.com/GoogleChrome/proxy-polyfill

# Licence
MIT