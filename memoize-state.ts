declare module 'memoize-state' {

    /**
     * Memoizes the function basing on paramiters actually used by a function
     * @param {<T>() => any} functor - function to be wrapped
     * @param {number} memoizationDepth =1, memoization count. Only one last call by default
     * @return {T}
     * @example
     *  const memoizedFn = memoize(fn)
     */
    export default function memoize<T>(functor: T, memoizationDepth?: number): T;

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
    export function shallBePure<T>(fn: T): T

    /**
     * perform consistent checks, that fn is a pure function in DEV env only
     * @param {T} fn
     * @return {T}
     */
    export function shouldBePure<T>(fn: T): T
}
