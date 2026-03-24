import "reflect-metadata";
import { TRANSLATABLE_METADATA_KEY } from "../translatable.constants";
import { TranslatableService } from "../translatable.service";
import { AttributeIsNotTranslatableException } from "../exceptions";
import { TranslationMap } from "../interfaces";

type Constructor<T = object> = new (...args: any[]) => T;

export interface TranslatableEntity {
  getTranslatableAttributes(): string[];
  isTranslatableAttribute(key: string): boolean;
  getTranslation(
    key: string,
    locale?: string,
    useFallback?: boolean,
  ): string | null;
  getTranslations(
    key?: string,
    allowedLocales?: string[],
  ): TranslationMap | Record<string, TranslationMap>;
  setTranslation(key: string, locale: string, value: string | null): this;
  setTranslations(key: string, translations: TranslationMap): this;
  forgetTranslation(key: string, locale: string): this;
  forgetAllTranslations(locale: string): this;
  replaceTranslations(key: string, translations: TranslationMap): this;
  hasTranslation(key: string, locale?: string): boolean;
  getTranslatedLocales(key: string): string[];
  locales(): string[];
  getMissingLocales(key: string, locales: string[]): string[];
  isFullyTranslated(locales: string[]): boolean;
  getTranslationCompleteness(
    locales: string[],
  ): Record<string, Record<string, boolean>>;
}

export function TranslatableMixin<TBase extends Constructor>(Base: TBase) {
  class TranslatableEntityClass extends Base implements TranslatableEntity {
    getTranslatableAttributes(): string[] {
      return (
        Reflect.getMetadata(TRANSLATABLE_METADATA_KEY, this.constructor) || []
      );
    }

    isTranslatableAttribute(key: string): boolean {
      return this.getTranslatableAttributes().includes(key);
    }

    getTranslation(
      key: string,
      locale?: string,
      useFallback: boolean = true,
    ): string | null {
      this.guardTranslatableAttribute(key);

      const translations = this.getTranslationMap(key);
      const service = TranslatableService.getInstance();

      const requestedLocale = locale ?? service?.getLocale() ?? "en";

      const translatedLocales = Object.keys(translations).filter(
        (l) => translations[l] != null && translations[l] !== "",
      );

      const resolvedLocale = service
        ? service.resolveLocale(requestedLocale, translatedLocales, useFallback)
        : useFallback
          ? translatedLocales.includes(requestedLocale)
            ? requestedLocale
            : (translatedLocales[0] ?? requestedLocale)
          : requestedLocale;

      const value = translations[resolvedLocale];
      if (value == null || value === "") {
        return null;
      }

      return value;
    }

    getTranslations(
      key?: string,
      allowedLocales?: string[],
    ): TranslationMap | Record<string, TranslationMap> {
      if (key != null) {
        this.guardTranslatableAttribute(key);
        return this.filterTranslations(
          this.getTranslationMap(key),
          allowedLocales,
        );
      }

      const result: Record<string, TranslationMap> = {};
      for (const field of this.getTranslatableAttributes()) {
        result[field] = this.filterTranslations(
          this.getTranslationMap(field),
          allowedLocales,
        );
      }
      return result;
    }

    setTranslation(key: string, locale: string, value: string | null): this {
      this.guardTranslatableAttribute(key);

      const translations = this.getTranslationMap(key);
      const oldValue = translations[locale] ?? null;

      if (value == null || value === "") {
        delete translations[locale];
      } else {
        translations[locale] = value;
      }

      (this as any)[key] = { ...translations };

      const service = TranslatableService.getInstance();
      if (service) {
        service.emitTranslationSet(this, key, locale, oldValue, value);
      }

      return this;
    }

    setTranslations(key: string, translations: TranslationMap): this {
      this.guardTranslatableAttribute(key);

      for (const [locale, value] of Object.entries(translations)) {
        this.setTranslation(key, locale, value);
      }
      return this;
    }

    forgetTranslation(key: string, locale: string): this {
      this.guardTranslatableAttribute(key);

      const translations = this.getTranslationMap(key);
      delete translations[locale];
      (this as any)[key] = { ...translations };

      return this;
    }

    forgetAllTranslations(locale: string): this {
      for (const field of this.getTranslatableAttributes()) {
        this.forgetTranslation(field, locale);
      }
      return this;
    }

    replaceTranslations(key: string, translations: TranslationMap): this {
      this.guardTranslatableAttribute(key);

      (this as any)[key] = {};
      return this.setTranslations(key, translations);
    }

    hasTranslation(key: string, locale?: string): boolean {
      this.guardTranslatableAttribute(key);

      const translations = this.getTranslationMap(key);
      const checkLocale =
        locale ?? TranslatableService.getInstance()?.getLocale() ?? "en";

      const value = translations[checkLocale];
      return value != null && value !== "";
    }

    getTranslatedLocales(key: string): string[] {
      this.guardTranslatableAttribute(key);

      const translations = this.getTranslationMap(key);
      return Object.keys(translations).filter(
        (l) => translations[l] != null && translations[l] !== "",
      );
    }

    locales(): string[] {
      const allLocales = new Set<string>();
      for (const field of this.getTranslatableAttributes()) {
        for (const locale of this.getTranslatedLocales(field)) {
          allLocales.add(locale);
        }
      }
      return Array.from(allLocales);
    }

    getMissingLocales(key: string, locales: string[]): string[] {
      this.guardTranslatableAttribute(key);

      const translated = this.getTranslatedLocales(key);
      return locales.filter((l) => !translated.includes(l));
    }

    isFullyTranslated(locales: string[]): boolean {
      for (const field of this.getTranslatableAttributes()) {
        if (this.getMissingLocales(field, locales).length > 0) {
          return false;
        }
      }
      return true;
    }

    getTranslationCompleteness(
      locales: string[],
    ): Record<string, Record<string, boolean>> {
      const result: Record<string, Record<string, boolean>> = {};
      for (const field of this.getTranslatableAttributes()) {
        const translated = this.getTranslatedLocales(field);
        result[field] = {};
        for (const locale of locales) {
          result[field][locale] = translated.includes(locale);
        }
      }
      return result;
    }

    /** @internal */
    getTranslationMap(key: string): TranslationMap {
      const raw = (this as any)[key];
      if (raw == null) return {};
      if (typeof raw === "object" && !Array.isArray(raw)) return { ...raw };
      return {};
    }

    /** @internal */
    guardTranslatableAttribute(key: string): void {
      if (!this.isTranslatableAttribute(key)) {
        throw new AttributeIsNotTranslatableException(
          key,
          this.getTranslatableAttributes(),
        );
      }
    }

    /** @internal */
    filterTranslations(
      translations: TranslationMap,
      allowedLocales?: string[],
    ): TranslationMap {
      const result: TranslationMap = {};
      for (const [locale, value] of Object.entries(translations)) {
        if (value == null || value === "") continue;
        if (allowedLocales && !allowedLocales.includes(locale)) continue;
        result[locale] = value;
      }
      return result;
    }
  }

  return TranslatableEntityClass;
}
