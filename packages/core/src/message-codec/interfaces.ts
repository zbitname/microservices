/* eslint-disable @typescript-eslint/no-explicit-any */

type TEncodedMessage = Buffer | string;

export type TMessageEncodeFnc<T = any> = (val: T) => Promise<TEncodedMessage>;
export type TMessageDecodeFnc<T = any> = (val: TEncodedMessage) => Promise<T>;
