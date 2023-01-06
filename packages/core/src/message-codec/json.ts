import { InternalError } from '../errors';
import { TMessageDecodeFnc, TMessageEncodeFnc } from './interfaces';

export const jsonEncode: TMessageEncodeFnc = async <T>(val: T): Promise<string> => JSON.stringify(val);

export const jsonDecode: TMessageDecodeFnc = async <T>(val: string | Buffer): Promise<T> => {
  if (typeof val === 'string') {
    return JSON.parse(val) as T;
  }

  if (Buffer.isBuffer(val)) {
    return JSON.parse(val.toString()) as T;
  }

  throw new InternalError('Unknown message format');
};
