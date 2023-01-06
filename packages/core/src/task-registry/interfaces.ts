import {
  IDestroyable,
  IInitable,
} from '../interfaces';

export interface ITaskRequest {
  id: string;
  payload: string;
  ttl?: number;
}

export interface ITaskResult {
  id: string;
  result: Promise<unknown>;
}

export interface ITaskActionConfig {
  class: string;
  method: string;
}

export interface ITaskRegistryConfig extends ITaskActionConfig {
  id: string;
}

export interface ITaskRegistry extends IInitable, IDestroyable {
  pub(task: ITaskRequest): Promise<ITaskResult>;
}
