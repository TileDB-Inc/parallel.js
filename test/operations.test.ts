import { describe, expect, it } from 'vitest';
import Parallel from '../';


describe('Operations', () => {
    it('should require(), map() and reduce correctly (check console errors)', async () => {
    	var p = new Parallel<Array<number>>({}, [0, 1, 2, 3, 4, 5, 6, 7, 8]);

        function add(d: [number, number]): number { return d[0] + d[1]; }
        function factorial(n: number): number { return n < 2 ? 1 : n * factorial(n - 1); }

        p.require(factorial);

        await p.map(function (n) { return Math.pow(10, n); }).reduce(add).finally(x => expect(x).toBe(111111111));
        await p.map(function (n) { return factorial(n); }).reduce(add).finally(x => expect(x).toBe(46234));
    });
});
