import { IServiceWorker } from '@microservices/core';

export class ServiceWorker implements IServiceWorker {
  static getServiceName(): string {
    return this.constructor.name;
  }
}
