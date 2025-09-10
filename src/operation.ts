export enum OperationState {
  PENDING,
  SUCCESS,
  FAILED
}

export class Operation<I> {
  callbacks: Array<(payload?: I) => void>;
  errCallbacks: Array<(err?: Error) => void>;

  status: OperationState;

  result?: I;
  error?: Error;

  constructor() {
    this.callbacks = [];
    this.errCallbacks = [];

    this.status = OperationState.PENDING;
    this.result = undefined;
    this.error = undefined;
  }

  resolve(result?: I, error?: Error) {
    if (error) {
      this.status = OperationState.FAILED;
      this.error = error;

      this.errCallbacks.forEach(x => x(error));
    } else {
      this.status = OperationState.SUCCESS;
      this.result = result;

      this.callbacks.forEach(x => x(result));
    }

    this.callbacks = [];
    this.errCallbacks = [];
  }

  then(callback?: (payload?: I) => void, errCallback?: (err?: Error) => void) {
    if (this.status === OperationState.PENDING) {
      if (callback) {
        this.callbacks.push(callback);
      }

      if (errCallback) {
        this.errCallbacks.push(errCallback);
      }
    } else if (this.status === OperationState.SUCCESS) {
      callback?.(this.result);
    } else if (this.status === OperationState.FAILED) {
      errCallback?.(this.error);
    }

    return this;
  };
}