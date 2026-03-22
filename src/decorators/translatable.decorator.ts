import 'reflect-metadata';
import { TRANSLATABLE_METADATA_KEY } from '../translatable.constants';

export function Translatable(): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const fields: string[] =
      Reflect.getMetadata(TRANSLATABLE_METADATA_KEY, target.constructor) || [];
    const key = String(propertyKey);
    if (!fields.includes(key)) {
      fields.push(key);
    }
    Reflect.defineMetadata(
      TRANSLATABLE_METADATA_KEY,
      fields,
      target.constructor,
    );
  };
}

export function getTranslatableFields(target: Function): string[] {
  return Reflect.getMetadata(TRANSLATABLE_METADATA_KEY, target) || [];
}
