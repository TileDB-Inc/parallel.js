import { describe, expect, it } from "vitest";
import Parallel from "../";

const isNode = () =>
  typeof process !== 'undefined' &&
  !!process.versions &&
  !!process.versions.node;

describe('Regression tests', () => {
  if (!isNode()) {
    it('should be possible to use XmlHttpRequest', async () => {
      let done = false;
      const p = new Parallel({},
        [`http://${window.location.host}${window.location.pathname}`],
      );

      await p.map(url => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.send(null);

        return true;
      }).finally((x) => {
        expect(x).toStrictEqual([true]);
      });
    
    });
  }
});
