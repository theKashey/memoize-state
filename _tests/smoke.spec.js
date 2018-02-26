import {expect} from 'chai';
import {isProxyfied} from 'proxyequal';
import memoize, {shouldBePure, isThisPure} from '../src/index';
import memoizeOne from "../../memoize-one/src";

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

  it('memoize twice', () => {
    let callCount = 0;
    const mapStateToProps = (state, props) => Object.assign({},
      state[props.extract],
      {callCount: callCount++} // invisible!
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

    expect(f1.name).to.be.equal('function1');
    expect(ft.name).to.be.equal('functionT');
    expect(ft.someProp).to.be.equal(42);
  });

  it('should pass name and content', () => {
    const fn = a => a;
    function func(a) { return a; }
    expect(memoize(fn).name).to.equal('fn');
    expect(memoize(a => a).name).to.equal('');
    expect(memoize(func).name).to.equal('func');
    expect(String(memoize(func))).to.equal('/* memoized by memoize-state */\n'+func);
  });

  it('should detect argument as result', () => {
    function f1(a) {
      return a.a && a;
    }

    const f = memoize(f1);
    expect(f({a: 1, b: 1})).to.be.deep.equal({a: 1, b: 1});
    expect(f.cacheStatistics.cache[0][1][0][1]).to.be.deep.equal([".a", ""]);
    expect(f({a: 1, b: 2})).to.be.deep.equal({a: 1, b: 2});
    expect(f.cacheStatistics.cache[0][1][0][1]).to.be.deep.equal([".a", ""]);
  })

  it('should maintain object equality', () => {
    const A = {
      data: 42
    };
    const B = { A };
    const C = { A };

    let cache1, cache2;

    const fn1 = ({A}) => {
      if(!cache1) {
         cache1=A;
      } else {
        expect(cache1).to.be.equal(A);
      }
    };

    const fn2 = ({A}) => {
      if(!cache2) {
        cache2=A;
      } else {
        expect(cache2).not.to.be.equal(A);
      }
    };

    const mfn1 = memoize(fn1);
    mfn1(B);
    mfn1(C);

    const mfn2 = memoize(fn2, { nestedEquality: false });
    mfn2(B);
    mfn2(C);
  });

  it('smoke args memoization', () => {
    const o1 = {a: 1};
    const o2 = {a: 1};
    const f1 = memoize(obj => Object.assign({}, obj), { strictArity: true });
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
  })

  it('isThisPure', () => {
    var array = [1, 2, 3];
    const fun1 = (a) => ({result: a.map(a => a)});
    expect(isThisPure(() => fun1(array))).to.be.false;

    const fun2 = (a) => ({result: a});
    expect(isThisPure(() => fun2(array))).to.be.true;

    const fun3 = memoize(a => ({result: a.map(a => a)}));
    expect(isThisPure(() => fun3(array))).to.be.true;
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
        var result = cache || a.a
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
        var result = cache || a.a
        cache = result
        return cache;
      };

      const test = shouldBePure(fun);
      test({a: A});
      expect(test.isPure).to.be.false;
      test({a: A});
      expect(test.isPure).to.be.false;
    });
  });
});
