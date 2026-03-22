import { registerDecorator, ValidationOptions } from 'class-validator';
import {
  IsTranslationsConstraint,
  IsTranslationsOptions,
} from '../validators/is-translations.constraint';

export function IsTranslations(
  options?: IsTranslationsOptions,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: {
        message:
          'Must be a valid translation map (e.g. { "en": "Hello", "fr": "Bonjour" })',
        ...validationOptions,
      },
      constraints: [options ?? {}],
      validator: IsTranslationsConstraint,
    });
  };
}
