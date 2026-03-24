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
    if (typeof propertyName === "symbol") {
      throw new Error(
        "@IsTranslations() cannot be applied to symbol-keyed properties — class-validator only supports string property names",
      );
    }

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
