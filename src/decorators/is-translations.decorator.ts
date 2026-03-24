import { registerDecorator, ValidationOptions } from "class-validator";
import {
  IsTranslationsConstraint,
  IsTranslationsOptions,
} from "../validators/is-translations.constraint";

export function IsTranslations(
  options?: IsTranslationsOptions,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      target: object.constructor,
      propertyName: String(propertyName),
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
