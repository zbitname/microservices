import {
  TMessageDecodeFnc,
  TMessageEncodeFnc,
} from './message-codec';

export interface IInitable {
  init(): Promise<void>;
}

export interface IDestroyable {
  destroy(): Promise<void>;
}

export interface IUseMessageEncoder {
  // setMessageEncoder(fnc: TMessageEncodeFnc): void;
  getMessageEncoder(): TMessageEncodeFnc;
}

export interface IUseMessageDecoder {
  // setMessageDecoder(fnc: TMessageDecodeFnc): void;
  getMessageDecoder(): TMessageDecodeFnc;
}
