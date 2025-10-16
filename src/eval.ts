import { isNode } from './utils';

if (isNode()) {
  process.once('message', (code: string) => {
    eval(JSON.parse(code).data);
  });
} else {
  self.onmessage = (code: MessageEvent<string>) => {
    eval(code.data);
  };
}
