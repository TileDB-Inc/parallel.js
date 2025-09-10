const isNode = () =>
  typeof process !== 'undefined' &&
  !!process.versions &&
  !!process.versions.node;

if (isNode()) {
  process.once('message', (code: string) => {
    eval(JSON.parse(code).data);
  });
} else {
  self.onmessage = (code: MessageEvent<string>) => {
    eval(code.data);
  };
}
