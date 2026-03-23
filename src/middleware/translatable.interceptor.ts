import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Request } from 'express';
import { TRANSLATABLE_METADATA_KEY } from '../translatable.constants';
import { TranslatableService } from '../translatable.service';

@Injectable()
export class TranslatableInterceptor implements NestInterceptor {
  constructor(private readonly translatableService: TranslatableService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const hasLocaleHeader = !!request.headers['accept-language'];

    return next.handle().pipe(
      map((data) => {
        if (!hasLocaleHeader) return data;

        const locale = this.translatableService.getLocale();
        return this.resolveTranslations(data, locale);
      }),
    );
  }

  private resolveTranslations(data: any, locale: string): any {
    if (data == null) return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.resolveTranslations(item, locale));
    }

    if (typeof data !== 'object') return data;

    // Check if data has translatable metadata (is a translatable entity)
    const fields = this.getTranslatableFields(data);
    if (fields.length > 0) {
      return this.resolveEntity(data, fields, locale);
    }

    // For plain objects, recursively check nested values
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          this.resolveTranslations(item, locale),
        );
      } else if (value != null && typeof value === 'object') {
        const nestedFields = this.getTranslatableFields(value);
        if (nestedFields.length > 0) {
          result[key] = this.resolveEntity(value, nestedFields, locale);
        } else {
          result[key] = value;
        }
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private resolveEntity(
    entity: any,
    fields: string[],
    locale: string,
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const key of Object.keys(entity)) {
      if (typeof entity[key] === 'function') continue;

      if (fields.includes(key)) {
        const translations = entity[key];
        if (
          translations != null &&
          typeof translations === 'object' &&
          !Array.isArray(translations)
        ) {
          result[key] = this.resolveValue(translations, locale);
        } else {
          result[key] = translations;
        }
      } else {
        result[key] = entity[key];
      }
    }

    return result;
  }

  private resolveValue(
    translations: Record<string, string>,
    locale: string,
  ): string | null {
    const translatedLocales = Object.keys(translations).filter(
      (l) => translations[l] != null && translations[l] !== '',
    );

    const resolved = this.translatableService.resolveLocale(
      locale,
      translatedLocales,
      true,
    );

    const value = translations[resolved];
    if (value == null || value === '') return null;
    return value;
  }

  private getTranslatableFields(obj: any): string[] {
    if (!obj || !obj.constructor) return [];
    return (
      Reflect.getMetadata(TRANSLATABLE_METADATA_KEY, obj.constructor) || []
    );
  }
}
