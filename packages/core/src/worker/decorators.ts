/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { DEFAULT_CLASS_NAME } from '../constants';

export const ServiceClass = ({
  className,
}: {
  className?: string;
}) => {
  return <T extends { new (...args: any[]): {} }>(constructor: T) => {
    const actualClassName = className || constructor.name || DEFAULT_CLASS_NAME;

    return class extends constructor {
      static getServiceName(): string {
        return actualClassName;
      }
    };
  };
};

export const ServiceMethod = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    if (!target.constructor.externalMethods) {
      target.constructor.externalMethods = [];
    }

    target.constructor.externalMethods.push(propertyKey);
  };
}
