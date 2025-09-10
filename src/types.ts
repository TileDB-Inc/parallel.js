export interface ParallelWorker {
  onmessage?: (payload: any) => void;
  onerror?: (err: ErrorEvent) => void;

  postMessage(payload: any): void;
  terminate(): void;
}

export type Timer = ReturnType<typeof setTimeout>;
export type JSONLike<T> =
  T extends string | number | boolean | null ? T :
  T extends Function ? never :
  T extends object ? { [K in keyof T]: JSONLike<T[K]> } :
  never;

export type Serializable<I> = I & JSONLike<I>

export type Callback<I, O> = (args: Serializable<I>) => Serializable<O>;
export type MapCallback<I, O> = I extends Array<infer L> ? ((arg: Serializable<L>) => Serializable<O>) : never;
export type ReduceCallback<I> = I extends Array<infer L> ? ((arg: [Serializable<L>, Serializable<L>]) => Serializable<L>) : never;
export type ElementOf<I> = I extends Array<infer L> ? Serializable<L> : never;
export type Done = (err?: Error, worker?: ParallelWorker) => void;

export interface Environment {
  timeout?: number;
  [key: string]: any;
}

export interface Options {
  maxWorkers: number;
  synchronous: boolean;
  env: Environment;
  envNamespace: string;
}