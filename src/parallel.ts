import { Operation, OperationState } from "./operation";
import { isNode } from "./utils";
import type { ParallelWorker, Timer, Serializable, Callback, MapCallback, ReduceCallback, ElementOf, Done, Options, Environment } from "./types";

const Worker = isNode() ? await import('./worker').then(x => x.default) : self.Worker;

class Parallel<I> {
  options: Options;
  operation: Operation<Serializable<I>>;
  requiredScripts: Array<string>;
  requiredFunctions: Array<Function>;
  requiredObjects: Array<Object>;

  constructor(options: Partial<Options>, data?: Serializable<I>, operation?: Operation<Serializable<I>>) {
    this.options = {
      maxWorkers: options.maxWorkers || typeof navigator === 'undefined' ? 4 : navigator.hardwareConcurrency,
      synchronous: options.synchronous || true,
      env: options.env || {},
      envNamespace: options.envNamespace || 'env',
    }

    if (operation) {
      this.operation = operation;
    } else if (data) {
      this.operation = new Operation();
      this.operation.resolve(data);
    } else {
      throw new Error("One of 'data' or 'operation' is required.");
    }

    this.requiredScripts = [];
    this.requiredFunctions = [];
    this.requiredObjects = [];
  }

  static isSupported() {
    return !!Worker;
  };

  getWorkerSource(callback: Function, env?: Environment) {
    let code = '';
    if (!isNode() && this.requiredScripts.length !== 0) {
      code += `importScripts("${this.requiredScripts.join('","')}");\r\n`;
    }

    this.requiredFunctions.forEach(x => {
      code += x.toString();
    })

    this.requiredObjects.forEach(x => {
      if (Object.hasOwn(x, "name")) {
        code += `var ${Object(x)['name']} = ${x.toString()};`;
      }
    });

    const ns = this.options.envNamespace;

    if (isNode()) {
      return `${code}process.on('message', function(e) {global.${ns} = ${JSON.stringify(env || {})};process.send(JSON.stringify((${callback.toString()})(JSON.parse(e).data)))})`;
    }
    return `${code}self.onmessage = function(e) {var global = {}; global.${ns} = ${JSON.stringify(env || {})};self.postMessage((${callback.toString()})(e.data))}`;
  };

  require(...args: Array<string | Function | Object>) {
    args.forEach(x => {
      if (typeof x === 'string') {
        this.requiredScripts.push(x);
      } else if (typeof x === 'function') {
        this.requiredFunctions.push(x);
      } else if (typeof x === 'object') {
        this.requiredObjects.push(x);
      }
    })

    return this;
  };

  spawn<O>(callback: Callback<I, O>, env?: Environment): Parallel<O> {
    const newOperation = new Operation<Serializable<O>>();
    let timeout: Timer;

    env = { ...this.options.env, ...(env || {}) };

    this.operation.then(() => {
      if (env.timeout) {
        timeout = setTimeout(() => {
          if (newOperation.status === OperationState.PENDING) {
            worker?.terminate();
            newOperation.resolve(undefined, new Error('Operation timed out!'));
          }
        }, env.timeout);
      }

      const worker = this.spawnWorker(callback, env);
      if (worker !== undefined) {
        worker.onmessage = (msg: MessageEvent<Serializable<O>>) => {
          if (timeout) clearTimeout(timeout);
          worker.terminate();
          newOperation.resolve(msg.data);
        };
        worker.onerror = (e: ErrorEvent) => {
          if (timeout) clearTimeout(timeout);
          worker.terminate();
          newOperation.resolve(undefined, e.error);
        };
        worker.postMessage(this.operation.result);
      } else if (this.options.synchronous) {
        setImmediate(() => {
          try {
            newOperation.resolve(callback(this.operation.result));
          } catch (e) {
            newOperation.resolve(undefined, e);
          }
        });
      } else {
        throw new Error(
          'Workers do not exist and synchronous operation not allowed!'
        );
      }
    });

    return new Parallel<O>(this.options, undefined, newOperation);
  }

  private spawnWorker(callback: Function, env?: Environment): ParallelWorker | undefined {
    const src = this.getWorkerSource(callback, env);

    if (isNode()) {
      const worker = new Worker(new URL('./eval.ts', import.meta.url));
      worker.postMessage(src);

      return worker;
    }

    if (Worker === undefined) {
      return undefined;
    }

    if (this.requiredScripts.length !== 0) {
      const worker = new Worker(new URL('./eval.ts', import.meta.url));
      worker.postMessage(src);
      return worker;
    } else {
      try {
        const blob = new Blob([src], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);

        return new Worker(new URL(url));
      } catch (e) {
        // blob/url unsupported, cross-origin error
        const worker = new Worker(new URL('./eval.ts', import.meta.url));
        worker.postMessage(src);

        return worker;
      }
    }
  }

  private spawnMapWorker<O>(i: number, callback: MapCallback<I, O>, result: Array<O>, done: Done, env?: Environment, worker?: ParallelWorker) {
    worker ??= this.spawnWorker(callback, env);

    const data = this.operation.result as Array<ElementOf<I>>;

    if (worker !== undefined) {
      worker.onmessage = (msg: MessageEvent<O>) => {
        result[i] = msg.data;
        done(undefined, worker);
      };
      worker.onerror = (e: ErrorEvent) => {
        worker.terminate();
        done(e.error);
      };
      worker.postMessage(data[i]);
    } else if (this.options.synchronous) {
      setImmediate(() => {
        result[i] = callback(data[i]);
        done();
      });
    } else {
      throw new Error(
        'Workers do not exist and synchronous operation not allowed!'
      );
    }
  }

  map<O>(callback: MapCallback<I, O>, env?: Object): Parallel<Array<O>> {
    env = { ...this.options.env, ...(env || {}) };

    const result: Serializable<Array<O>> = [];

    let newOperation = new Operation<Serializable<Array<O>>>();
    let startedOps = 0;
    let doneOps = 0;

    const done = (err?: Error, worker?: ParallelWorker): void => {
      const length = (this.operation.result as Array<ElementOf<I>>).length;

      if (err) {
        newOperation.resolve(undefined, err);
      } else if (++doneOps === length) {
        newOperation.resolve(result);
        worker?.terminate();
      } else if (startedOps < length) {
        this.spawnMapWorker(startedOps++, callback, result, done, env, worker);
      } else {
        worker?.terminate();
      }
    }

    this.operation.then(
      () => {

        if (!Array.isArray(this.operation.result)) {
          throw new Error('Data should be of type Array to apply a map function');
        }

        const length = (this.operation.result as Array<ElementOf<I>>).length;

        for (
          ;
          startedOps - doneOps < this.options.maxWorkers &&
          startedOps < length;
          ++startedOps
        ) {
          this.spawnMapWorker(startedOps, callback, result, done, env);
        }
      },
      err => {
        newOperation.resolve(undefined, err);
      }
    );

    return new Parallel(this.options, undefined, newOperation);
  }

  private spawnReduceWorker(data: [ElementOf<I>, ElementOf<I>], callback: ReduceCallback<I>, done: (err?: Error, worker?: ParallelWorker) => void, env?: Environment, worker?: ParallelWorker) {
    worker ??= this.spawnWorker(callback, env);

    if (!Array.isArray(this.operation.result)) {
      throw new Error('Data should be of type Array to apply a reduce function');
    }

    const result = this.operation.result as Array<ElementOf<I>>;

    if (worker) {
      worker.onmessage = (msg) => {
        result[result.length] = msg.data;
        done(undefined, worker);
      };
      worker.onerror = (e: ErrorEvent) => {
        worker.terminate();
        done(e.error, undefined);
      };
      worker.postMessage(data);
    } else if (this.options.synchronous) {
      setImmediate(() => {
        result[result.length] = callback(data);
        done();
      });
    } else {
      throw new Error(
        'Workers do not exist and synchronous operation not allowed!'
      );
    }
  }

  reduce(callback: ReduceCallback<I>, env?: Environment): Parallel<ElementOf<I>> {
    env = { ...this.options.env, ...(env || {}) };

    let runningWorkers = 0;
    let newOperation = new Operation<ElementOf<I>>();

    const done = (err?: Error, worker?: ParallelWorker) => {
      const data = (this.operation.result as Array<ElementOf<I>>);

      --runningWorkers;
      if (err) {
        newOperation.resolve(undefined, err);
      } else if (data.length === 1 && runningWorkers === 0) {
        newOperation.resolve(data[0]);
        worker?.terminate();
      } else if (data.length > 1) {
        ++runningWorkers;
        this.spawnReduceWorker(
          [data[0], data[1]],
          callback,
          done,
          env,
          worker
        );
        data.splice(0, 2);
      } else {
        worker?.terminate();
      }
    }

    this.operation.then(() => {
      if (!Array.isArray(this.operation.result)) {
        throw new Error('Data should be of type Array to apply a reduce function');
      }

      const data = (this.operation.result as Array<ElementOf<I>>);

      if (data.length === 1) {
        newOperation.resolve(undefined, data[0]);
      } else {
        let i = 0;
        for (; i < this.options.maxWorkers && i < Math.floor(data.length / 2); ++i) {
          ++runningWorkers;
          this.spawnReduceWorker([data[i * 2], data[i * 2 + 1]], callback, done, env);
        }

        data.splice(0, i * 2);
      }
    });

    return new Parallel<ElementOf<I>>(this.options, undefined, newOperation);
  }

  then<O>(callback: Callback<I, O>, errCallback?: (err?: Error) => Serializable<O>): Parallel<O> {
    const newOperation = new Operation<Serializable<O>>();

    this.operation.then(
      () => {
        try {
          newOperation.resolve(callback?.(this.operation.result!));
        } catch (e) {
          if (errCallback) {
            newOperation.resolve(errCallback(e), undefined);
          } else {
            newOperation.resolve(undefined, e);
          }
        }
      },
      err => {
        if (errCallback) {
          newOperation.resolve(errCallback(err));
        } else {
          newOperation.resolve(undefined, err);
        }
      }
    );

    return new Parallel(this.options, undefined, newOperation);
  }

  finally<O>(callback: (args: Serializable<I>) => O) : Promise<O> {
    return new Promise<O>((resolve, reject) => {
        this.operation.then(
        () => {
          try {
            resolve(callback?.(this.operation.result!));
          } catch (e) {
            reject(e);
          }
        }
      );
    })
  }
}

export default Parallel;