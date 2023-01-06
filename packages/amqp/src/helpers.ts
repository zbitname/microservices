import { ITaskActionConfig } from '@microservices/core';

export const generateRandomString = (length: number, alphabet: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') => {
  let result = '';
  const charactersLength = alphabet.length;

  for (let i = 0; i < length; i++) {
    result += alphabet.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
};

export const getQueueName = (v: ITaskActionConfig) => `${v.class}.${v.method}`;
