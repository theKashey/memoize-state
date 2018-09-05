declare module 'memoize-state' {

    interface MemoizeStateOptions {
        /**
         * the size of the cache
         * @default 1
         */
        cacheSize?: number,
        /**
         * allow shallow arguments check
         * @default true
         */
        shallowCheck: boolean,
        /**
         * allow equal argiments check
         * @default true
         */
        equalCheck: boolean,
        /**
         * respond only to the "used" amount of arguments (not working with spread)
         * @default false
         */
        strictArity: boolean,
        /**
         * maintain the equal object equality
         * @default true
         */
        nestedEquality: boolean,
        /**
         * perform additional safe checks (this could produce cache-wiping side effect)
         * @default false
         */
        safe: boolean
    }

    interface PureOptions {
      /**
       * message displayed
       */
      message?: string,
      /**
       * controls uber paranoidal "safe" check mode
       */
      checkAffectedKeys?: boolean,
      /**
       * controls how to check `purity`. true will perform two calls with shallow non equal arguments, bypassing some sorts of memoization
       * false will call twice with the same arguments, detecting only internal memoizations
       */
      isolatedCheck?: boolean,
      /**
       * will call on failure
       */
      onTrigger?: (...args: any[]) => void,
    }


    export type NotRequired<T extends { [key: string]: any }> = {
        [K in keyof T]?: T[K];
    };
    export type Mapper<T, K = NotRequired<T> > = (input: T) => K;
    type ResultFunction<T> = (input: T) => T;

    /**
     * Memoizes the function basing on paramiters actually used by a function
     * @param {T} functor - function to be wrapped
     * @param {MemoizeStateOptions} [memoizationOptions], options
     * @return {T}
     * @example
     *  const memoizedFn = memoize(fn)
     */
    export default function memoize<T>(functor: T, memoizationOptions?: MemoizeStateOptions): T;

    /**
     * Flow(pipe) memoization composition.
     * @param {Mapper[]} flow - array of functions to be applied from left to right
     * @return {Function}
     */
    export function memoizedFlow<T>(flow: Mapper<T>): ResultFunction<T>;
    /**
     * Flow(pipe) memoization composition.
     * @param {Mapper[]} flow - array of functions to be applied from left to right
     * @return {Function}
     */
    export function memoizedPipe<T>(flow: Mapper<T>): ResultFunction<T>;
    /**
     * FlowRight(compose) memoization composition.
     * @param {Mapper[]} flow - array of functions to be applied from right to left
     * @return {Function}
     */
    export function memoizedFlowRight<T>(flow: Mapper<T>): ResultFunction<T>;
    /**
     * FlowRight(compose) memoization composition.
     * @param {Mapper[]} flow - array of functions to be applied from right to left
     * @return {Function}
     */
    export function memoizedCompose<T>(flow: Mapper<T>): ResultFunction<T>;

    /**
     * double checks that function inside the `executor` is a pure function
     * @param {() => any} executor
     * @return {boolean}
     * @example
     *  isThisPure(() => someFn())
     */
    export function isThisPure(executor: () => any): boolean

    /**
     * perform consistent checks, that fn is a pure function.
     * @param {T} fn
     * @return {T}
     */
    export function shallBePure<T>(fn: T, options?: PureOptions): T

    /**
     * perform consistent checks, that fn is a pure function in DEV env only
     * @param {T} fn
     * @return {T}
     */
    export function shouldBePure<T>(fn: T, options?: PureOptions): T
}
