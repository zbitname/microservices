/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */

import {
  TMessageDecodeFnc,
  TMessageEncodeFnc,
} from './interfaces';

export const UseMessageEncoder = (encoder: TMessageEncodeFnc) => {
  return <T extends { new (...args: any[]): {} }>(constructor: T) => {
    return class extends constructor {
      getMessageEncoder() {
        return encoder;
      }
    };
  };
};

export const UseMessageDecoder = (decoder: TMessageDecodeFnc) => {
  return <T extends { new (...args: any[]): {} }>(constructor: T) => {
    return class extends constructor {
      getMessageDecoder() {
        return decoder;
      }
    };
  };
};
