import {
  constants,
  InternalError,
  ITaskRequest,
  ITaskResponse,
  ITaskResult,
  IUseMessageDecoder,
  TimeoutExceededError,
  TMessageDecodeFnc,
} from '@microservices/core';
import {
  Channel,
  connect,
  Connection,
  ConsumeMessage,
} from 'amqplib';
import { generateRandomString, getQueueName } from '../helpers';
import {
  IAmqpTaskRegistry,
  IAmqpTaskRegistryConfig,
} from '../interfaces';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export class TaskRegistry implements IAmqpTaskRegistry, IUseMessageDecoder {
  private channel?: Channel;
  private connection?: Connection;
  private readonly queueName: string;
  private readonly observables = new Map<string, Observable>();

  constructor(
    private config: IAmqpTaskRegistryConfig,
  ) {
    this.queueName = `${this.config.id}.${generateRandomString(10, ALPHABET)}`;
  }

  public getQueueName() {
    return this.queueName;
  }

  async init(): Promise<void> {
    this.connection = await connect(this.config.connectionUri);
    this.channel = await this.connection.createChannel();
    await this.channel.assertQueue(this.getQueueName(), {
      autoDelete: this.config.queue?.autoDelete ?? constants.DEFAULT_QUEUE_AUTODELETE,
      messageTtl: this.config.queue?.messageTtl,
    });
    this.sub();
  }

  async destroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  async pub(task: ITaskRequest): Promise<ITaskResult> {
    if (!this.channel) {
      throw new InternalError();
    }

    const obs = new Observable({
      ttl: task.ttl,
    });

    const taskId = task.id ?? generateRandomString(8);

    this.observables.set(taskId, obs);

    const result = new Promise((resolve, reject) => {
      obs.setOnComplete<ConsumeMessage>(async (msg) => {
        if (!this.config.consumer?.noAck) {
          this.channel?.ack(msg);
        }

        this.observables.delete(taskId);

        const decoder = this.getMessageDecoder();
        const res = await decoder(msg.content.toString());

        if (res.meta.status >= 200 && res.meta.status < 300) {
          resolve(res.data);
        } else {
          reject(new InternalError(res.meta.msg));
        }
      });
      obs.setOnError((err) => {
        this.observables.delete(taskId);
        reject(err);
      });
    });

    this.channel.publish('', getQueueName(this.config), Buffer.from(task.payload), {
      expiration: task.ttl,
      messageId: taskId,
      replyTo: this.getQueueName(),
    });

    return {
      id: taskId,
      result,
    };
  }

  async sub() {
    if (!this.channel) {
      throw new InternalError();
    }

    this.channel.consume(this.getQueueName(), msg => {
      if (!msg) {
        return;
      }

      this.observables.get(msg.properties.messageId)?.complete(msg);
    }, {
      noAck: this.config.consumer?.noAck,
    });
  }

  public getMessageDecoder(): TMessageDecodeFnc<ITaskResponse> {
    throw new InternalError('Method "getMessageDecoder" is not implemented.');
  }
}

interface IObservableOpts {
  ttl?: number;
}

interface IObservable {
  setOnComplete<T = unknown>(fnc: (value: T) => void): void;
  setOnError(fnc: (err: Error) => void): void;
  complete<T = unknown>(value: T): void;
  error(err: Error): void;
}

class Observable implements IObservable {
  private isCompleted = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onComplete?: (value: any) => void;
  private onError?: (err: Error) => void;
  private timeout?: NodeJS.Timeout;

  constructor(opts: IObservableOpts) {
    if (opts.ttl) {
      this.timeout = setTimeout(() => {
        this.error(new TimeoutExceededError());
      }, opts.ttl);
    }
  }

  setOnComplete<T = unknown>(fnc: (value: T) => void) {
    this.onComplete = fnc;
  }

  setOnError(fnc: (err: Error) => void) {
    this.onError = fnc;
  }

  complete<T = unknown>(value: T) {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    if (!this.onError) {
      throw new Error('Have no handler for "onError" method. Please use method ".setOnError" for fix it.');
    }

    if (!this.onComplete) {
      this.onError(new Error('Have no handler for "onComplete" method. Please use method ".setOnComplete" for fix it.'));
      return;
    }

    if (this.isCompleted) {
      this.onError(new Error('Already completed'));
      return;
    }

    this.isCompleted = true;
    this.onComplete(value);
  }

  error(err: Error) {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    if (!this.onError) {
      throw new Error('Have no handler for "onError" method. Please use method ".setOnError" for fix it.');
    }

    if (this.isCompleted) {
      this.onError(new Error('Already completed'));
      return;
    }

    this.isCompleted = true;
    this.onError(err);
  }
}
