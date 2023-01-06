import {
  ITaskRegistry,
  ITaskRegistryConfig,
  IWorkerConfig,
} from '@microservices/core';
import { ConsumeMessage } from 'amqplib';

export interface IAmqpCommonConfig {
  connectionUri: string;
  message?: {
    ttl?: number;
  };
  queue?: {
    ttl?: number;
    autoDelete?: boolean;
    messageTtl?: number;
  };
  consumer?: {
    noAck?: boolean;
  };
}

export interface IAmqpTaskRegistry extends ITaskRegistry {
  getQueueName(): string;
}

export interface IAmqpTaskRegistryConfig extends IAmqpCommonConfig, ITaskRegistryConfig {}

export interface IAmqpWorkerConfigSpecials {
  onMessageSuccess?: (msg: ConsumeMessage) => Promise<void>,
  onMessageFail?: (msg: ConsumeMessage) => Promise<void>,
}

export interface IAmqpWorkerConfig extends IWorkerConfig, IAmqpCommonConfig, IAmqpWorkerConfigSpecials {}
