import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable, Optional } from '@nestjs/common';
import { TranslatableService } from '../translatable.service';

export interface IsTranslationsOptions {
  requiredLocales?: string[];
}

@ValidatorConstraint({ name: 'isTranslations', async: false })
@Injectable()
export class IsTranslationsConstraint
  implements ValidatorConstraintInterface
{
  private requiredLocales: string[] = [];

  constructor(
    @Optional() private readonly service?: TranslatableService,
  ) {}

  validate(value: unknown, args?: ValidationArguments): boolean {
    this.requiredLocales =
      (args?.constraints?.[0] as IsTranslationsOptions)?.requiredLocales ?? [];

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    const entries = Object.entries(value);
    for (const [, val] of entries) {
      if (typeof val !== 'string' && val !== null) return false;
    }

    for (const locale of this.requiredLocales) {
      const val = (value as Record<string, unknown>)[locale];
      if (val == null || val === '') return false;
    }

    return true;
  }

  defaultMessage(args?: ValidationArguments): string {
    const opts =
      (args?.constraints?.[0] as IsTranslationsOptions) ?? {};

    if (opts.requiredLocales?.length) {
      return `Must be a valid translation map with required locales: ${opts.requiredLocales.join(', ')}`;
    }

    return 'Must be a valid translation map (e.g. { "en": "Hello", "fr": "Bonjour" })';
  }
}
