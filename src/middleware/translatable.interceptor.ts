import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, map } from "rxjs";
import { Request } from "express";
import {
  SKIP_TRANSLATION_KEY,
  TRANSLATABLE_METADATA_KEY,
} from "../translatable.constants";
import { TranslatableService } from "../translatable.service";

@Injectable()
export class TranslatableInterceptor implements NestInterceptor {
  constructor(
    private readonly translatableService: TranslatableService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_TRANSLATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skip) return next.handle();

    const acceptLanguage = this.extractAcceptLanguage(context);

    return next.handle().pipe(
      map((data) => {
        if (!acceptLanguage) return data;

        const locale = this.translatableService.getLocale();
        return this.resolveTranslations(data, locale);
      }),
    );
  }

  private extractAcceptLanguage(context: ExecutionContext): string | undefined {
    const type = context.getType<string>();

    if (type === "http") {
      const request = context.switchToHttp().getRequest<Request>();
      return request.headers["accept-language"] as string | undefined;
    }

    if (type === "graphql") {
      const gqlContext = context.getArgs()[2];
      return gqlContext?.req?.headers?.["accept-language"] as
        | string
        | undefined;
    }

    return undefined;
  }

  private resolveTranslations(data: any, locale: string): any {
    if (data == null) return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.resolveTranslations(item, locale));
    }

    if (typeof data !== "object") return data;

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
      } else if (value != null && typeof value === "object") {
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
      if (typeof entity[key] === "function") continue;

      if (fields.includes(key)) {
        const translations = entity[key];
        if (
          translations != null &&
          typeof translations === "object" &&
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
      (l) => translations[l] != null && translations[l] !== "",
    );

    const resolved = this.translatableService.resolveLocale(
      locale,
      translatedLocales,
      true,
    );

    const value = translations[resolved];
    if (value == null || value === "") return null;
    return value;
  }

  private getTranslatableFields(obj: any): string[] {
    if (!obj || !obj.constructor) return [];
    return (
      Reflect.getMetadata(TRANSLATABLE_METADATA_KEY, obj.constructor) || []
    );
  }
}
