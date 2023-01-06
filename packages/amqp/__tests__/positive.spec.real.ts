import {
  IDestroyable,
  IInitable,
  jsonDecode,
  jsonEncode,
  ServiceClass,
  ServiceMethod,
  ServiceWorker,
  UseMessageDecoder,
  UseMessageEncoder,
} from '@microservices/core';

import {
  TaskRegistry as BaseTaskRegistry,
} from '../src/task-registry';
import {
  AmqpWorker,
} from '../src/worker';

const AMQP_CONNECTION_URI = process.env['AMQP_CONNECTION_URI'] as string;

if (!AMQP_CONNECTION_URI) {
  throw new Error('You need to set "AMQP_CONNECTION_URI" env');
}

// TaskRegistry for project
@UseMessageDecoder(jsonDecode)
class TaskRegistry extends BaseTaskRegistry {}

// Worker for project
@UseMessageEncoder(jsonEncode)
@UseMessageDecoder(jsonDecode)
class Worker extends AmqpWorker {}

// Service classes for project
@ServiceClass({})
class ServiceWorkerTest extends ServiceWorker {
  @ServiceMethod()
  public async ping() {
    return 'pong';
  }
}

@ServiceClass({})
class ServiceWorkerText extends ServiceWorker {
  @ServiceMethod()
  public async reverse(text: string) {
    return text.split('').reverse().join('');
  }

  @ServiceMethod()
  public async upper(text: string) {
    return text.toUpperCase();
  }
}

@ServiceClass({})
class ServiceWorkerError extends ServiceWorker {
  @ServiceMethod()
  public async throwSomeError() {
    throw new Error('some error');
  }
}

// constants
const TASK_REGISTRY = {
  TEST_PING: 'test-ping',
  TEST_FOO: 'test-foo',
  TEXT_REVERSE: 'text-reverse',
  TEXT_UPPER: 'text-upper',
  SOME_ERROR: 'some-error',
};

// Client's part
class ServiceClient implements IDestroyable, IInitable {
  private trPing = new TaskRegistry({
    id: TASK_REGISTRY.TEST_PING,
    connectionUri: AMQP_CONNECTION_URI,
    class: ServiceWorkerTest.getServiceName(),
    method: 'ping',
  });

  private trTextReverse = new TaskRegistry({
    id: TASK_REGISTRY.TEXT_REVERSE,
    connectionUri: AMQP_CONNECTION_URI,
    class: ServiceWorkerText.getServiceName(),
    method: 'reverse',
  });

  private trTextUpper = new TaskRegistry({
    id: TASK_REGISTRY.TEXT_UPPER,
    connectionUri: AMQP_CONNECTION_URI,
    class: ServiceWorkerText.getServiceName(),
    method: 'upper',
  });

  private trError = new TaskRegistry({
    id: TASK_REGISTRY.SOME_ERROR,
    connectionUri: AMQP_CONNECTION_URI,
    class: ServiceWorkerError.getServiceName(),
    method: 'throwSomeError',
  });

  async init() {
    await Promise.all([
      this.trPing.init(),
      this.trTextReverse.init(),
      this.trTextUpper.init(),
      this.trError.init(),
    ]);
  }

  async destroy() {
    await Promise.all([
      this.trPing.destroy(),
      this.trTextReverse.destroy(),
      this.trTextUpper.destroy(),
      this.trError.destroy(),
    ]);
  }

  async ping(): Promise<string> {
    return (await this.trPing.pub({
      payload: JSON.stringify([]),
      ttl: 2000,
    })).result as Promise<string>;
  }

  async textReverse(text: string): Promise<string> {
    return (await this.trTextReverse.pub({
      payload: JSON.stringify([text]),
      ttl: 2000,
    })).result as Promise<string>;
  }

  async textUpper(text: string): Promise<string> {
    return (await this.trTextUpper.pub({
      payload: JSON.stringify([text]),
      ttl: 2000,
    })).result as Promise<string>;
  }

  async throwSomeError() {
    return (await this.trError.pub({
      payload: JSON.stringify([]),
      ttl: 2000,
    })).result as Promise<string>;
  }
}

// Using
const w = new Worker({
  id: 'test',
  connectionUri: AMQP_CONNECTION_URI,
});

const serviceClient = new ServiceClient();

(async () => {
  await serviceClient.init();

  console.log('ping', await serviceClient.ping());
  console.log('reverse', await serviceClient.textReverse('some text'));
  console.log('upper', await serviceClient.textUpper('some text'));

  try {
    await serviceClient.throwSomeError();
  } catch (e) {
    console.error('throwSomeError', e);
  }
})();

(async () => {
  await w.init();
  w.register(new ServiceWorkerTest());
  w.register(new ServiceWorkerText());
  w.register(new ServiceWorkerError());
})();

// Destroying
setTimeout(() => {
  serviceClient.destroy();
  w.destroy();
}, 2000);
