import {expect} from 'chai';
import sinon from 'sinon';
import memoize, {shouldBePure, isThisPure} from '../src/index';

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

    const mm = memoize(mapStateToProps, 2);
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

  it('isThisPure', () => {
    var array = [1, 2, 3];
    const fun1 = (a) => ({result: a.map(a => a) });
    expect(isThisPure(() => fun1(array))).to.be.false;

    const fun2 = (a) => ({result:a});
    expect(isThisPure(() => fun2(array))).to.be.true;

    const fun3 = memoize(a => ({result: a.map(a => a) }));
    expect(isThisPure(() => fun3(array))).to.be.true;
  });

  it('shouldBePure', () => {
    const A = [1,2,3];
    const fun1 = (a) => ({key1: a.map(a => a)});
    const test1 = shouldBePure(fun1);
    test1(A);
    test1(A);
    expect(test1.isPure).to.be.false;

    const fun2 = (a) => ({key1: a});
    const test2 = shouldBePure(fun2);
    test2(A);
    test2(A);
    expect(test2.isPure).to.be.true;
    test2([1,2,3]);
    expect(test2.isPure).to.be.false;

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
});
