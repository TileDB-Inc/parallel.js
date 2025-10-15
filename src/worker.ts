import type { ChildProcess } from 'node:child_process';
import type { ParallelWorker } from './types';

const fork = require('child_process').fork as (url: URL) => ChildProcess;

class NodeWorker implements ParallelWorker {
  private process: ChildProcess;
  onmessage?: (payload: any) => void;
  onerror?: (err: ErrorEvent) => void;

  constructor(url: URL) {
    this.process = fork(url);
    this.process.on('message', (message) => {
      if (this.onmessage) {
        this.onmessage({data: JSON.parse(message.toString())});
      }
    });
    this.process.on('error', err => {
      if (this.onerror) {
        this.onerror(new ErrorEvent(err.name, {error: err}));
      }
    })
  }

  public postMessage(payload: any) {
    this.process.send(JSON.stringify({data: payload}));
  }

  public terminate() {
    this.process.kill();
  }
}

export default NodeWorker;
