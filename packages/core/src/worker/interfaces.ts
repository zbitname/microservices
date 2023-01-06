/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  IDestroyable,
  IInitable,
} from '../interfaces';

export interface IWorker extends IInitable, IDestroyable {
  register(service: IServiceWorker): void;
}

export interface IServiceWorker {}

export interface IServiceWorkerStatic {
  externalMethods: string[];
  getServiceName(): string;
}

export interface IWorkerActionConfig {}

export interface IWorkerConfig extends IWorkerActionConfig {
  id: string;
}
