import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import { AsyncLocalStorage } from "node:async_hooks";
import { TranslationHasBeenSetEvent } from "./events";
import { TranslatableModuleOptions } from "./interfaces";
import { TRANSLATABLE_OPTIONS } from "./translatable.constants";

@Injectable()
export class TranslatableService implements OnModuleInit {
  private static instance: TranslatableService | null = null;

  private readonly logger = new Logger(TranslatableService.name);
  private readonly localeStorage = new AsyncLocalStorage<string>();

  private readonly defaultLocale: string;
  private readonly fallbackLocales: string[];
  private readonly fallbackAny: boolean;

  private eventEmitter: any = null;

  constructor(
    @Inject(TRANSLATABLE_OPTIONS)
    options: TranslatableModuleOptions,
    @Optional() @Inject("EventEmitter2") eventEmitter?: any,
  ) {
    this.defaultLocale = options.defaultLocale ?? "en";
    this.fallbackLocales =
      options.fallbackLocales ??
      (options.fallbackLocale
        ? [options.fallbackLocale]
        : [this.defaultLocale]);
    this.fallbackAny = options.fallbackAny ?? false;

    if (eventEmitter) {
      this.eventEmitter = eventEmitter;
    }
  }

  onModuleInit(): void {
    TranslatableService.instance = this;
    this.logger.log(
      `Initialized with defaultLocale="${this.defaultLocale}", fallbackLocales=[${this.fallbackLocales.map((l) => `"${l}"`).join(", ")}]`,
    );
  }

  static getInstance(): TranslatableService | null {
    return TranslatableService.instance;
  }

  static resetInstance(): void {
    TranslatableService.instance = null;
  }

  getDefaultLocale(): string {
    return this.defaultLocale;
  }

  getFallbackLocale(): string {
    return this.fallbackLocales[0] ?? this.defaultLocale;
  }

  getFallbackLocales(): string[] {
    return [...this.fallbackLocales];
  }

  getFallbackAny(): boolean {
    return this.fallbackAny;
  }

  getLocale(): string {
    return this.localeStorage.getStore() ?? this.defaultLocale;
  }

  runWithLocale<T>(locale: string, fn: () => T): T {
    return this.localeStorage.run(locale, fn);
  }

  resolveLocale(
    requestedLocale: string,
    translatedLocales: string[],
    useFallback: boolean,
  ): string {
    if (translatedLocales.includes(requestedLocale)) {
      return requestedLocale;
    }

    if (!useFallback) {
      return requestedLocale;
    }

    for (const fallback of this.fallbackLocales) {
      if (translatedLocales.includes(fallback)) {
        return fallback;
      }
    }

    if (this.fallbackAny && translatedLocales.length > 0) {
      return translatedLocales[0];
    }

    return requestedLocale;
  }

  emitTranslationSet(
    entity: any,
    key: string,
    locale: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (!this.eventEmitter) return;

    this.eventEmitter.emit(
      "translatable.translation-set",
      new TranslationHasBeenSetEvent(entity, key, locale, oldValue, newValue),
    );
  }
}
