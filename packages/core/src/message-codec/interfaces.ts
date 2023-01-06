type TEncodedMessage = Buffer | string;

export type TMessageEncodeFnc = <T = unknown>(val: T) => Promise<TEncodedMessage>;
export type TMessageDecodeFnc = <T = unknown>(val: TEncodedMessage) => Promise<T>;
