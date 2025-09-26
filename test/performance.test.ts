import { describe, expect, it } from 'vitest';
import { Parallel } from '../';

describe('Performance', () => {
  it(`.map() should be using multi-threading`, async () => {
    const slowSquare = (n: number): number => {
      let i = 0;
      while (++i < n * n) { }
      return i;
    };

    const p = new Parallel({}, [10000, 20000, 30000]);
    const p2 = new Parallel({}, [10000, 20000, 30000]);

    const start_seq = Date.now();
    const time_seq = await p.spawn(data => {
      for (let i = 0; i < data.length; ++i) {
        const n = data[i];
        var square;
        for (square = 0; square < n * n; ++square) { }
        data[i] = square;
      }
      return data;
    }).finally(() => Date.now() - start_seq);

    const start_par = Date.now();
    const time_par = await p2.map(slowSquare).finally(() => Date.now() - start_par);

    expect(time_par).toBeLessThan(time_seq * 0.8);
  });
});
    
