/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  constants,
  InternalError,
  IServiceWorker,
  IServiceWorkerStatic,
  ITaskResponse,
  IUseMessageDecoder,
  IUseMessageEncoder,
  IWorker,
  TMessageDecodeFnc,
  TMessageEncodeFnc,
} from '@microservices/core';
import {
  Channel,
  connect,
  Connection,
} from 'amqplib';

import {
  IAmqpWorkerConfig,
} from '../interfaces';
import {
  getQueueName,
} from '../helpers';

export class AmqpWorker implements IWorker, IUseMessageEncoder, IUseMessageDecoder {
  private channel?: Channel;
  private connection?: Connection;

  constructor(
    private config: IAmqpWorkerConfig,
  ) {}

  public async init(): Promise<void> {
    this.connection = await connect(this.config.connectionUri);
    this.channel = await this.connection.createChannel();
  }

  public async destroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  public async register(service: IServiceWorker): Promise<void> {
    if (!this.channel) {
      throw new InternalError('You need to setup channel. Maybe you miss to call of "init" method.');
    }

    const serviceConstructor = service.constructor as unknown as IServiceWorkerStatic;

    for (const methodName of serviceConstructor.externalMethods) {
      if (!service[methodName as keyof typeof service]) {
        throw new InternalError(`Service "${serviceConstructor.getServiceName()}" has no method "${methodName}".`);
      }

      const queueName = this.getQueueNameByEventName(serviceConstructor.getServiceName(), methodName);

      await this.channel.assertQueue(queueName, {
        autoDelete: this.config.queue?.autoDelete ?? constants.DEFAULT_QUEUE_AUTODELETE,
        messageTtl: this.config.queue?.messageTtl,
      });

      this.channel.consume(queueName, async (msg) => {
        if (!msg) {
          return;
        }

        const answerFnc = async (meta: ITaskResponse['meta'], data?: ITaskResponse['data']) => {
          let replyMsg = await this.getMessageEncoder()({meta, data});
          if (typeof replyMsg === 'string') {
            replyMsg = Buffer.from(replyMsg);
          }

          this.channel?.publish('', msg.properties.replyTo, replyMsg, {
            messageId: msg.properties.messageId,
          });
        };

        let decodedMessage: unknown;

        try {
          decodedMessage = await this.getMessageDecoder()(msg.content);
        } catch (e) {
          const error = e as Error;

          answerFnc({
            status: 500,
            data: error,
            msg: error.message,
          });
          return;
        }

        if (!Array.isArray(decodedMessage)) {
          answerFnc({
            status: 500,
            msg: 'Incorrect type of message. Array is expected.',
          });
          return;
        }

        try {
          const response = await (service[methodName as keyof typeof service] as unknown as (...args: any) => Promise<void>)(
            ...decodedMessage,
          );

          await answerFnc({
            status: 200,
          }, response);
        } catch (e) {
          const error = e as Error;

          if (this.config.onMessageFail) {
            this.config.onMessageFail(msg);
          } else {
            this.channel?.nack(msg, false, false);
          }

          answerFnc({
            status: 500,
            data: error,
            msg: error.message,
          });
          return;
        }

        if (this.config.onMessageSuccess) {
          this.config.onMessageSuccess(msg);
        } else {
          this.channel?.ack(msg);
        }
      });
    }
  }

  private getQueueNameByEventName(className: string, methodName: string) {
    return getQueueName({
      class: className,
      method: methodName,
    });
  }

  public getMessageDecoder(): TMessageDecodeFnc {
    throw new InternalError('Method "getMessageDecoder" is not implemented.');
  }

  public getMessageEncoder(): TMessageEncodeFnc<ITaskResponse> {
    throw new InternalError('Method "getMessageEncoder" is not implemented.');
  }
}
