import {expect} from 'chai';
import Benchmark from 'benchmark';
import memoizeOne from 'memoize-one';
import lmemoize from 'lodash.memoize';
import fmemoize from 'fast-memoize';
import memoizeState from '../lib/index';

describe('performance test', () => {

  function toStringBench() {
    var bench = this,
      hz = bench.hz,
      stats = bench.stats,
      size = stats.sample.length,
      pm = '\xb1',
      result = bench.name + new Array(16 - bench.name.length).join(' '),
      n = "" + hz.toFixed(0);

    n = new Array(16 - n.length).join(' ') + n;

    result += ' x ' + n + ' ops/sec ' + pm +
      stats.rme.toFixed(2) + '% (' + size + ' run' + (size == 1 ? '' : 's') + ' sampled)';

    return result;
  }

  let complexRun = 0;

  function complexFunction() {
    complexRun++;
    for (let i = 0; i < 10000; i++) {
      Math.random();
    }
    return Math.random();
  }

  function test(fun, methods, done) {
    const mo = memoizeOne(fun);
    const ml = lmemoize(fun, args => JSON.stringify(args));
    const ms = memoizeState(fun, {strictArity: true});
    const mf = fmemoize(fun);

    const suite = new Benchmark.Suite();

    const options = {
      maxTime: 0.1
    };

    complexRun = 0;
    let localRun = 0;
    suite
      .add('base', () => fun.apply(localRun++ && null, methods()), options)
      .add('memoize-one', () => mo.apply(localRun++ && null, methods()), options)
      .add('lodash.memoize', () => ml.apply(localRun++ && null, methods()), options)
      .add('fast-memoize', () => mf.apply(localRun++ && null, methods()), options)
      .add('memoize-state', () => ms.apply(localRun++ && null, methods()), options)

      .on('cycle', function (event) {
        console.log(toStringBench.call(event.target), ' hitratio', 100 - Math.round(100 * complexRun / localRun) + '%', complexRun, '/' + localRun);
        complexRun = 0;
        localRun++;
      })
      .on('complete', function () {
        console.log('Fastest is ' + this.filter('fastest').map('name'));
        done();
      })
      // run async
      .run({
        async: false
      });
  }

  it('compare simple function', (done) => {
    console.log('function of 3 arguments, all unchanged');
    test(
      function (a, b, c) {
        complexFunction();
        return a + b + c
      },
      () => [1, 2, 3],
      done
    )
  }).timeout(10000);

  it('dry run. empty function calling object, not returning', (done) => {
    console.log('function of 1 arguments, object unchanged');
    test(
      function (a) {
        return 42;
      },
      () => {},
      done
    )
  }).timeout(10000);

  it('dry run. empty function calling object', (done) => {
    console.log('function of 1 arguments, object unchanged');
    test(
      function (a) {
        return a
      },
      () => {},
      done
    )
  }).timeout(10000);

  it('compare simple function', (done) => {
    console.log('function of 2 arguments, providing 3, all unchanged');
    test(
      function (a, b) {
        complexFunction();
        return a + b
      },
      () => [1, 2, 3],
      done
    )
  }).timeout(10000);

  it('compare unique params function', (done) => {
    console.log('function of 3 arguments, all changed / 10');
    let counter = 0;
    test(
      function (a, b, c) {
        complexFunction();
        return a + b + c
      },
      () => [Math.round(counter++ / 10), Math.round(counter++ / 10), Math.round(counter++ / 10)],
      done
    )
  }).timeout(10000);

  it('compare function with object as argument, returning value from object', (done) => {
    console.log('function with an object as argument, returning a part');
    test(
      function (a) {
        complexFunction();
        return a.data
      },
      () => [{data: 1}],
      done
    )
  }).timeout(10000);

  it('compare function with object as argument, returning value from object, and changing value', (done) => {
    console.log('function with an object as argument, changing value, returning a part');
    let counter = 0;
    test(
      function (a) {
        complexFunction();
        return a.data
      },
      () => [{data: Math.round(counter++ / 10)}],
      done
    )
  }).timeout(10000);

  it('compare function with object as argument, returning value from object, and changing not used value', (done) => {
    console.log('function with an object as argument, changing other value, returning a part');
    let counter = 0;
    test(
      function (a) {
        complexFunction();
        return a.data
      },
      () => [{data: 1, somethingElse: Math.round(counter++ / 10)}],
      done
    )
  }).timeout(10000);

  it('compare function with 2 object as argument, returning value from object, and changing not used value', (done) => {
    console.log('function with 2 objects as argument, changing both value');
    let counter = 0;
    test(
      function (a, b) {
        complexFunction();
        return a.b.c + b.c.d.e
      },
      () => {
        counter++;
        return [{
          b: {
            x: counter,
            c: Math.round(counter / 10),
          }
        }, {
          c: {
            d: {
              x: counter,
              e: Math.round(counter / 10),
            }
          }
        }]
      },
      done
    )
  }).timeout(10000);

  it('when changes anything, except the function gonna to consume', (done) => {
    console.log('when changes anything, except the function gonna to consume');
    let counter = 0;
    test(
      function (a, b) {
        complexFunction();
        return a.b.c + b.c.d.e
      },
      () => {
        counter++;
        return [{
          b: {
            x: counter,
            c: 1,
          },
          c: {
            d: {
              x: counter,
              e: 3,
            }
          }
        }, {
          c: {
            d: {
              x: counter,
              e: 3,
            }
          }
        }]
      },
      done
    )
  }).timeout(10000);

  it('when state is very big, and you need a small part', (done) => {
    console.log('when state is very big, and you need a small part');
    const A = new Array(100000).fill(1);
    let counter = 0;
    test(
      function (a) {
        complexFunction();
        return a.value
      },
      () => {
        counter+=0.1;
        return [{
          A,
          value: Math.round(counter)
        }]
      },
      done
    );
  }).timeout(10000);

}).timeout(10000);
