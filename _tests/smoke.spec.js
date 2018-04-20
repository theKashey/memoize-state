import {expect} from 'chai';
import {isProxyfied} from 'proxyequal';
import sinon from 'sinon';
import memoize, {shouldBePure, isThisPure, memoizedFlow, memoizedFlowRight} from '../src/index';

describe('memoize-proxy', () => {
  it('memoize once', () => {
    let callCount = 0;
    const mapStateToProps = (state, props) => Object.assign({},
      {
        [props.extract]: state[props.extract],
        callCount: callCount++
      } // invisible!
    );

    const mm = memoize(mapStateToProps);
    expect(mm({a: 1, b: 2}, {extract: 'b', stuff: 1})).not.to.be.equal(mm({a: '!', b: 3}, {extract: 'b', stuff: '!'}));

    expect(mm({a: 1, b: 2}, {extract: 'b', stuff: 1})).to.be.equal(mm({a: '!', b: 2}, {extract: 'b', stuff: '!'}));
    expect(mm({a: 1, b: 2}, {extract: 'b', stuff: 1})).to.be.equal(mm({a: '!', b: 2}, {extract: 'b', stuff: '!'}));

    expect(mm({a: 1, b: 2}, {extract: 'b', stuff: 1})).not.to.be.equal(mm({a: '!', b: 3}, {extract: 'b', stuff: '!'}));
  });

  it('nested memoization', () => {
    let callCount = 0;
    const mapStateToProps = (state, props) => Object.assign({},
      {
        [props.extract]: state[props.extract],
        callCount: callCount++
      } // invisible!
    );

    const mm = memoize(memoize(memoize(mapStateToProps)));
    expect(mm({a: 1, b: 2}, {extract: 'b', stuff: 1})).not.to.be.equal(mm({a: '!', b: 3}, {extract: 'b', stuff: '!'}));

    const result1 = mm({a: 1, b: 2}, {extract: 'b', stuff: 1});
    const result2 = mm({a: '!', b: 2}, {extract: 'b', stuff: '!'});
    expect(result1).to.be.equal(result2);
    expect(mm({a: 1, b: 2}, {extract: 'b', stuff: 1})).to.be.equal(mm({a: '!', b: 2}, {extract: 'b', stuff: '!'}));
    expect(mm({a: 1, b: 2}, {extract: 'b', stuff: 1})).to.be.equal(mm({a: '!', b: 2}, {extract: 'b', stuff: '!'}));

    expect(mm({a: 1, b: 2}, {extract: 'b', stuff: 1})).not.to.be.deep.equal(mm({a: '!', b: 3}, {
      extract: 'b',
      stuff: '!'
    }));
    expect(mm({a: 1, b: 2}, {extract: 'b', stuff: 1})).not.to.be.deep.equal(mm({a: '!', b: 3}, {
      extract: 'a',
      stuff: '!'
    }));
  });

  it('nested memoization returning value', () => {
    let callCount = 0;
    const mapStateToProps = (state) => ({
      a: state.a,
      state: state,
      callCount: callCount++
    });

    const mm = memoize(memoize(mapStateToProps));
    const state1 = {a: 1};
    expect(mm(state1)).to.be.deep.equal({a: 1, state: state1, callCount: 0});
    expect(mm(state1)).to.be.deep.equal({a: 1, state: state1, callCount: 0});
    const state2 = {a: 2};
    expect(mm(state2)).to.be.deep.equal({a: 2, state: state2, callCount: 1});
    expect(mm(state2)).to.be.deep.equal({a: 2, state: state2, callCount: 1});
    const state3 = {a: 2, b: 3};
    expect(mm(state3)).to.be.deep.equal({a: 2, state: state3, callCount: 2});
    expect(mm(state2)).to.be.deep.equal({a: 2, state: state2, callCount: 3})
    ;
    expect(mm(state1)).to.be.deep.equal({a: 1, state: state1, callCount: 4});
  });

  it('nested memoization not returning value', () => {
    let callCount = 0;
    const mapStateToProps = (state) => ({
      a: state.a,
      state: state.a,
      callCount: callCount++
    });

    const mm = memoize(memoize(mapStateToProps));
    const state1 = {a: 1};
    expect(mm(state1)).to.be.deep.equal({a: 1, state: 1, callCount: 0});
    expect(mm(state1)).to.be.deep.equal({a: 1, state: 1, callCount: 0});
    const state2 = {a: 2};
    expect(mm(state2)).to.be.deep.equal({a: 2, state: 2, callCount: 1});
    expect(mm(state2)).to.be.deep.equal({a: 2, state: 2, callCount: 1});
    const state3 = {a: 2, b: 3};
    expect(mm(state3)).to.be.deep.equal({a: 2, state: 2, callCount: 1});
    expect(mm(state2)).to.be.deep.equal({a: 2, state: 2, callCount: 1});

    expect(mm(state1)).to.be.deep.equal({a: 1, state: 1, callCount: 2});
  });

  it('memoize twice shadowing', () => {

    const mapStateToProps = (state, props) => state.a[0].b.c + state.a[1].b.c + props.value;

    const mm = memoize(memoize(mapStateToProps, {cacheSize: 2}));

    const A1 = {
      a: [
        {b: {c: 1}},
        {b: {c: 1}}
      ]
    };
    const A2 = {
      a: [
        {b: A1.a[0].b},
        {b: {c: 1}}
      ]
    };
    const A3 = {
      a: [
        {b: {c: 1}},
        {b: {c: 1, d: 1}}
      ]
    };

    expect(mm(A1, {value: 0})).to.be.equal(2);
    expect(mm.getAffectedPaths()).to.be.deep.equal([
      [
        ".a.0.b.c",
        ".a.1.b.c"
      ],
      [
        ".value"
      ]
    ]);

    expect(mm(A1, {value: 0})).to.be.equal(2);
    expect(mm.getAffectedPaths()).to.be.deep.equal([
      [
        ".a.0.b.c",
        ".a.1.b.c"
      ],
      [
        ".value"
      ]
    ]);

    expect(mm(A2, {value: 0})).to.be.equal(2);
    expect(mm.getAffectedPaths()).to.be.deep.equal([
      [
        ".a.0.b.c",
        ".a.1.b.c"
      ],
      [
        ".value"
      ]
    ]);

    expect(mm(A3, {value: 0})).to.be.equal(2);
    expect(mm.getAffectedPaths()).to.be.deep.equal([
      [
        ".a.0.b.c",
        ".a.1.b.c"
      ],
      [
        ".value"
      ]
    ]);
  });

  it('should keep equal compare when the object returned and shallow if values', () => {
    const fn1 = memoize(obj => ({obj}));
    const fn2 = memoize(obj => (Object.assign({}, obj)));
    expect(fn1({foo: 123})).not.to.be.equal(fn1({foo: 123}));
    expect(fn1({foo: 123})).to.be.deep.equal(fn1({foo: 123}));
    expect(fn2({foo: 123})).to.be.equal(fn2({foo: 123}));
  });

  it('redux-first-router-case', () => {
    // https://github.com/theKashey/memoize-state/issues/3#issuecomment-372104800
    const mapState = ({category, videosByCategory, videosHash}, {dispatch}) => {
      const slugs = videosByCategory[category] || []
      const videos = slugs.map(slug => videosHash[slug])
      return {videos, dispatch}
    };
    const fn = memoize(mapState);
    const dispatch = () => {
    };

    expect(
      fn({category: 1, videosByCategory: {1: [42]}, videosHash: {42: "test"}}, {dispatch})
    ).to.be.equal(
      fn({category: 1, videosByCategory: {1: [42]}, videosHash: {42: "test"}}, {dispatch})
    )
  });

  it('returning value and nested info', () => {
    const mapStateToProps = (state) => ({
      state: state.obj,
      int: state.obj.int
    });

    const mm = memoize(mapStateToProps);

    const state1 = {obj: {int: 42}, b: 42};
    expect(mm(state1)).to.be.deep.equal({state: state1.obj, int: 42});
    const state2 = {obj: {int: 42}, b: 42};
    expect(mm(state2)).to.be.deep.equal({state: state2.obj, int: 42});
    const state3 = {obj: state2.obj, b: 42};
    expect(mm(state3)).to.be.deep.equal({state: state2.obj, int: 42});

    const emptyObj = {};
    const state4 = {obj: {int: emptyObj, a: 1}, b: 42};
    expect(mm(state4)).to.be.deep.equal({state: state4.obj, int: emptyObj});
    const state5 = {obj: {int: emptyObj, a: 2}, b: 42};
    expect(mm(state5)).to.be.deep.equal({state: state5.obj, int: emptyObj});
  });

  it('memoize twice', () => {
    let callCount = 0;
    const mapStateToProps = (state, props) => Object.assign({},
      {
        value: state[props.extract],
        callCount: callCount++ // invisible!
      }
    );

    const mm = memoize(mapStateToProps, {cacheSize: 2});
    const result1 = mm({a: 1, b: 2}, {extract: 'b', stuff: 1});
    const result2 = mm({a: 1, b: 2}, {extract: 'a', stuff: 1});

    expect(result1).not.to.be.equal(result2);

    expect(result1).to.be.equal(mm({a: '!', b: 2}, {extract: 'b', stuff: '!'}));
    expect(result1).to.be.equal(mm({a: '!', b: 2}, {extract: 'b', stuff: '!'}));
    expect(result2).to.be.equal(mm({a: 1, b: '!'}, {extract: 'a', stuff: '!'}));
    expect(result2).to.be.equal(mm({a: 1, b: '!'}, {extract: 'a', stuff: '!'}));
    expect(result1).to.be.equal(mm({a: '!', b: 2}, {extract: 'b', stuff: '!'}));
    expect(result2).to.be.equal(mm({a: 1, b: '!'}, {extract: 'a', stuff: '!'}));

    // break stuff
    mm({a: 2, b: 4}, {extract: 'a'});
    expect(result1).not.to.be.equal(mm({a: '!', b: 2}, {extract: 'b', stuff: '!'}));
    expect(result2).not.to.be.equal(mm({a: 1, b: '!'}, {extract: 'a', stuff: '!'}));
  });

  it('cyclic deps', () => {
    const fn1 = memoize(state => state);
    const fn2 = memoize(state => {
      const R = {state: state};
      R.self = R;
      return R;
    });
    const fn3 = memoize(state => {
      const R = {state: state.value};
      R.self = R;
      return R;
    });

    const A = {value: {x: 1}};
    A.self = A;
    const result1 = fn1(A);

    expect(result1).to.be.equal(A);

    const result2 = fn2(A);
    expect(result2.state).to.be.equal(A);
    expect(result2.self.state).to.be.equal(A);

    const result3 = fn3(A);
    expect(result3.state).to.be.equal(A.value);
    expect(result3.self.state).to.be.equal(A.value);
  });

  it('shouldDive optimizations', () => {
    const fn1 = memoize(state => ({yes: {value: state}, no: {value: state}}));
    const fn2 = memoize(state => ({
      yes: {value: state},
      no: {value: state}
    }), {flags: {deproxifyShouldDive: (data, key) => key === 'no' && data.value.v === 42}});

    const A = {v: 42};
    const result1 = fn1(A);
    const result2 = fn2(A);

    expect(result1.yes.value).to.be.equal(A);
    expect(result1.no.value).to.be.equal(A);

    expect(result2.yes.value.v).to.be.equal(42);
    expect(result2.yes.value).not.to.be.equal(A);
    expect(result2.no.value).to.be.equal(A);

  })

  describe('deproxyfy stuff', () => {
    it('when top level object', () => {
      const f = memoize(({data}) => data);
      const test = {data: [{a: 1}, {b: 2}, 3]};
      expect(f(test)).to.be.equal(test.data);

      expect(isProxyfied(f(test))).to.be.false;
      expect(isProxyfied(f(test).a)).to.be.false;
    });

    it('when nested object', () => {
      const f = memoize(({data}) => ({
        data: data
      }));
      const test = {data: [{a: 1}, {b: 2}, 3]};
      expect(f(test).data).to.be.equal(test.data);

      expect(isProxyfied(f(test).data)).to.be.false;
      expect(isProxyfied(f(test).data.a)).to.be.false;
    });
  });

  it('should respect arguments count', () => {
    function function0() {
      return 0;
    }

    function function1(a) {
      return a;
    }

    function function2(a, b) {
      return a + b;
    }

    function functionT(...rest) {
      return 0 + rest[0];
    }

    functionT.someProp = 42;

    const f0 = memoize(function0);
    const f1 = memoize(function1);
    const f2 = memoize(function2);
    const ft = memoize(functionT);

    expect(f0.length).to.be.equal(0);
    expect(f1.length).to.be.equal(1);
    expect(f2.length).to.be.equal(2);
    expect(ft.length).to.be.equal(0);

    expect(f0(1, 2, 4)).to.be.equal(0);
    expect(f1(1, 2, 3)).to.be.equal(1);
    expect(f2(1, 2, 3)).to.be.equal(3);
    expect(ft(1, 2, 3)).to.be.equal(1);

    expect(f1.name).to.be.equal('ms_function1');
    expect(ft.name).to.be.equal('ms_functionT');
    expect(ft.someProp).to.be.equal(42);
  });

  it('should pass name and content', () => {
    const fn = a => a;

    function func(a) {
      return a;
    }

    expect(memoize(fn).name).to.equal('ms_fn');
    expect(memoize(a => a).name).to.equal('ms_');
    expect(memoize(func).name).to.equal('ms_func');
    expect(String(memoize(func))).to.equal('/* memoized by memoize-state */\n' + func);
  });

  it('should detect argument as result', () => {
    function f1(a) {
      return a.a && a;
    }

    const f = memoize(f1);
    expect(f({a: 1, b: 1})).to.be.deep.equal({a: 1, b: 1});
    expect(f.cacheStatistics.cache[0].affected[0].useAffected).to.be.deep.equal([".a"]);
    expect(f.cacheStatistics.cache[0].affected[0].resultAffected).to.be.deep.equal([""]);
    expect(f({a: 1, b: 2})).to.be.deep.equal({a: 1, b: 2});
    expect(f.cacheStatistics.cache[0].affected[0].useAffected).to.be.deep.equal([".a"]);
    expect(f.cacheStatistics.cache[0].affected[0].resultAffected).to.be.deep.equal([""]);
  })

  it('should maintain object equality', () => {
    const A = {
      data: 42
    };
    const B = {A};
    const C = {A};

    let cache1, cache2;

    const fn1 = ({A}) => {
      if (!cache1) {
        cache1 = A;
      } else {
        expect(cache1).to.be.equal(A);
      }
    };

    const fn2 = ({A}) => {
      if (!cache2) {
        cache2 = A;
      } else {
        expect(cache2).not.to.be.equal(A);
      }
    };

    const mfn1 = memoize(fn1);
    mfn1(B);
    mfn1(C);

    const mfn2 = memoize(fn2, {nestedEquality: false});
    mfn2(B);
    mfn2(C);
  });

  it('smoke args memoization', () => {
    const o1 = {a: 1};
    const o2 = {a: 1};
    const f1 = memoize(obj => Object.assign({}, obj), {strictArity: true});
    const f2 = memoize(obj => Object.assign({}, obj));

    const result11 = f1(o1, 1, o1);
    const result12 = f1(o2, 1, o1);
    const result13 = f1(o2, 2, o1);

    expect(result11).to.be.equal(result12);
    expect(result12).to.be.equal(result13);

    const result21 = f2(o1, 1, o1);
    const result22 = f2(o2, 1, o1);
    const result23 = f2(o2, 2, o1);

    expect(result21).to.be.equal(result22)
    expect(result22).not.to.be.equal(result23);
  });

  it('memoization sideeffect has no sence for original array', () => {
    var A = [{a: 1}, {a: 2}, {a: 3}];
    const f1 = memoize((obj, order) => obj.sort((a, b) => order * (a.a - b.a)));
    expect(isProxyfied(f1(A, -1)[0])).to.be.false;

    expect(f1(A, -1)).to.be.deep.equal([{a: 1}, {a: 2}, {a: 3}]);
  });

  it('memoization sideeffect, works with sliced array', () => {
    var A = [{a: 1}, {a: 2}, {a: 3}];
    const f1 = memoize((obj, order) => obj.slice().sort((a, b) => order * (a.a - b.a)));
    expect(isProxyfied(f1(A, -1)[0])).to.be.false;

    expect(f1(A, -1)).to.be.deep.equal([{a: 3}, {a: 2}, {a: 1}]);
    expect(f1(A, 1)).to.be.deep.equal([{a: 1}, {a: 2}, {a: 3}]);
    expect(f1(A, -1)).to.be.deep.equal([{a: 3}, {a: 2}, {a: 1}]);
    expect(f1(A, 1)).to.be.deep.equal([{a: 1}, {a: 2}, {a: 3}]);
  });

  it('isThisPure', () => {
    var array = [1, 2, 3];
    const fun1 = (a) => ({result: a.map(a => a)});
    expect(isThisPure(() => fun1(array))).to.be.false;

    const fun2 = (a) => ({result: a});
    expect(isThisPure(() => fun2(array))).to.be.true;

    const fun3 = memoize(a => ({result: a.map(a => a)}));
    expect(isThisPure(() => fun3(array))).to.be.true;
  });

  it('should report about spread operator', () => {
    const mapState = ({a, ...rest}) => rest;
    const fn = memoize(mapState);
    const spy = sinon.stub(console, "warn");
    const result = fn({a: 1, b: 1});
    expect(result).to.be.deep.equal({
      b: 1
    });

    sinon.assert.calledWith(spy, 'memoize-state: object spread detected in ', mapState, '. Keys affected: ', sinon.match.any, '. This is no-op.');

    spy.restore();
  });

  describe('shouldBePure', () => {
    const A = [1, 2, 3];

    it('should detect array duplication', () => {
      const fun1 = (a) => ({key1: a.map(a => a)});
      const test1 = shouldBePure(fun1);
      test1(A);
      test1(A);
      expect(test1.isPure).to.be.false;
    });

    it('should pass memoization', () => {
      let cache = {};
      let order = 0;
      const fun1 = (a) => {
        if (a.v !== cache) {
          order += a.k;
        }
        cache = a.v;
        return a.v;
      };
      const A = {v: {v: 1}, k: 1};
      const test1 = shouldBePure(fun1);


      test1(A);
      test1(A);
      expect(order).to.be.equal(2);
      expect(test1.isPure).to.be.true;

      order = 0;
      const test2 = shouldBePure(fun1, {checkAffectedKeys: false});
      test2(A);
      test2(A);
      expect(order).to.be.equal(1);
      expect(test2.isPure).to.be.true;
    });

    it('should deep equal arguments', () => {
      const fun2 = (a) => ({key1: a});
      const test2 = shouldBePure(fun2);
      test2(A);
      test2(A);
      expect(test2.isPure).to.be.true;
      test2([1, 2, 3]);
      expect(test2.isPure).to.be.true;
      test2([1, 2, 3]);
      expect(test2.isPure).to.be.true;
    });

    it('pure memoization', () => {
      const fun3 = memoize(a => ({key1: a.map(a => a)}));
      const test3 = shouldBePure(fun3);
      test3(A);
      test3(A);
      expect(test3.isPure).to.be.true;
      test3([1, 2, 3]);
      expect(test3.isPure).to.be.true;
      test3([1, 2, 4]);
      expect(test3.isPure).to.be.true;
    });

    it('shouldBePure', () => {
      const fun4 = ({a}) => ({key1: a});
      const test4 = shouldBePure(fun4);
      test4({a: A});
      test4({a: A});
      expect(test4.isPure).to.be.true;
      test4({a: [1, 2, 3]});
      expect(test4.isPure).to.be.true;
      test4({a: [1, 2, 3]});
      expect(test4.isPure).to.be.true;
    });

    it('should detect internal memoization', () => {
      let cache = 0;
      let autoCache = 0;
      const fun = function (a) {
        var result = cache || a.a;
        if (autoCache) {
          cache = result
        }
        return cache;
      };

      const test = shouldBePure(fun);
      test({a: A});
      expect(test.isPure).to.be.true;
      test({a: A});
      expect(test.isPure).to.be.true;
      cache = A;
      test({a: A});  // undetectable
      expect(test.isPure).to.be.true;
      // memozation broken
      expect(test({a: A})).to.be.equal(A);
      expect(test({a: 1})).to.be.equal(A);
      expect(test({a: 2})).to.be.equal(A);
    });

    it('should detect internal memoization via safe mode', () => {
      let cache = 0;
      const fun = function (a) {
        var result = cache || a.a;
        cache = result;
        return cache;
      };

      const test = shouldBePure(fun);
      test({a: 1});
      expect(test.isPure).to.be.false;
      test({a: 2});
      expect(test.isPure).to.be.false;
    });

    it('should be possible to overload trigger', () => {
      const fun = function (a) {
        return [{a: a.a}]
      };
      const fn = sinon.stub();

      const test = shouldBePure(fun, {
        onTrigger: fn
      });
      test({a: 1});
      test({a: 1});
      expect(test.isPure).to.be.false;
      sinon.assert.calledWith(fn, 'shouldBePure', fun, '`s result is not equal at [0], while should be equal');
    })
  });
});

describe('flow', () => {
  it('flow/pipe', () => {
    const add = sinon.spy(state => ({value: state.value + 1}));
    const mul = sinon.spy(state => ({value: state.value * 2, extra: 1}));
    const fn = memoizedFlow([
      add,
      mul
    ]);

    expect(fn({value: 1})).to.be.deep.equal({value: 4, extra: 1});
    sinon.assert.calledOnce(add);
    sinon.assert.calledOnce(mul);

    expect(fn({value: 1, otherValue: 0})).to.be.deep.equal({value: 4, extra: 1, otherValue: 0});
    sinon.assert.calledOnce(add);
    sinon.assert.calledOnce(mul);

    expect(fn({value: 2, otherValue: 1})).to.be.deep.equal({value: 6, extra: 1, otherValue: 1});
    sinon.assert.calledTwice(add);
    sinon.assert.calledTwice(mul);

  })

  it('flowRight/pipe', () => {
    const add = sinon.spy(state => ({value: state.value + 1}));
    const mul = sinon.spy(state => ({value: state.value * 2, extra: 1}));
    const fn = memoizedFlowRight([
      add,
      mul
    ]);

    expect(fn({value: 1})).to.be.deep.equal({value: 3, extra: 1});
    sinon.assert.calledOnce(add);
    sinon.assert.calledOnce(mul);

    expect(fn({value: 1, otherValue: 0})).to.be.deep.equal({value: 3, extra: 1, otherValue: 0});
    sinon.assert.calledOnce(add);
    sinon.assert.calledOnce(mul);

    expect(fn({value: 2, otherValue: 1})).to.be.deep.equal({value: 5, extra: 1, otherValue: 1});
    sinon.assert.calledTwice(add);
    sinon.assert.calledTwice(mul);

  })
});