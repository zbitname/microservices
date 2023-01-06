import {
  jsonDecode,
  jsonEncode,
  ServiceClass,
  ServiceMethod,
  ServiceWorker,
  UseMessageDecoder,
  UseMessageEncoder,
} from '@microservices/core';

import {
  TaskRegistry,
} from '../src/task-registry';
import {
  AmqpWorker,
} from '../src/worker';

const AMQP_CONNECTION_URI = process.env['AMQP_CONNECTION_URI'] as string;

if (!AMQP_CONNECTION_URI) {
  throw new Error('You need to set "AMQP_CONNECTION_URI" env');
}

@UseMessageEncoder(jsonEncode)
@UseMessageDecoder(jsonDecode)
class Worker extends AmqpWorker {}

@ServiceClass({})
class ServiceWorker1 extends ServiceWorker {
  @ServiceMethod()
  public async ping() {
    return 'pong';
  }
}

@ServiceClass({})
class ServiceWorker2 extends ServiceWorker {
  @ServiceMethod()
  public async foo() {
    return 'bar';
  }
}

const trPing = new TaskRegistry({
  id: 'test1',
  connectionUri: AMQP_CONNECTION_URI,
  class: ServiceWorker1.getServiceName(),
  method: 'ping',
});

const trFoo = new TaskRegistry({
  id: 'test2',
  connectionUri: AMQP_CONNECTION_URI,
  class: ServiceWorker2.getServiceName(),
  method: 'foo',
});

const w = new Worker({
  id: 'test',
  connectionUri: AMQP_CONNECTION_URI,
});

(async () => {
  await trPing.init();
  await trFoo.init();

  await trPing.pub({
    id: '1',
    payload: JSON.stringify({msg: '#1'}),
    ttl: 3000,
  })
  .then(async res => console.log('msg#1', res.id, await res.result))
  .catch(e => console.log(e));

  trFoo.pub({
    id: '2',
    payload: JSON.stringify({msg: '#2'}),
    ttl: 2000,
  })
  .then(async res => console.log('msg#2', res.id, await res.result))
  .catch(e => console.log(e));
})();

(async () => {
  await w.init();
  w.register(new ServiceWorker1());
  w.register(new ServiceWorker2());
})();

setTimeout(() => {
  w.destroy();
  trPing.destroy();
  trFoo.destroy();
}, 10000);
