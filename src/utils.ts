export const isNode = () =>
  typeof process !== 'undefined' &&
  !!process.versions &&
  !!process.versions.node;

export const child_process: () => Promise<string> = async () => new Promise(resolve => resolve('child_process'));
