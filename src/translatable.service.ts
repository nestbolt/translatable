import { AsyncLocalStorage } from 'node:async_hooks';
import { Inject, Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { TRANSLATABLE_OPTIONS } from './translatable.constants';
import { TranslatableModuleOptions } from './interfaces';
import { TranslationHasBeenSetEvent } from './events';

let EventEmitter2: any;
try {
  EventEmitter2 = require('@nestjs/event-emitter').EventEmitter2;
} catch /* v8 ignore next */ {
  EventEmitter2 = null;
}

@Injectable()
export class TranslatableService implements OnModuleInit {
  private static instance: TranslatableService | null = null;

  private readonly logger = new Logger(TranslatableService.name);
  private readonly localeStorage = new AsyncLocalStorage<string>();

  private readonly defaultLocale: string;
  private readonly fallbackLocale: string;
  private readonly fallbackAny: boolean;

  private eventEmitter: any = null;

  constructor(
    @Inject(TRANSLATABLE_OPTIONS)
    options: TranslatableModuleOptions,
    @Optional() @Inject('EventEmitter2') eventEmitter?: any,
  ) {
    this.defaultLocale = options.defaultLocale ?? 'en';
    this.fallbackLocale = options.fallbackLocale ?? this.defaultLocale;
    this.fallbackAny = options.fallbackAny ?? false;

    if (eventEmitter) {
      this.eventEmitter = eventEmitter;
    }
  }

  onModuleInit(): void {
    TranslatableService.instance = this;
    this.logger.log(
      `Initialized with defaultLocale="${this.defaultLocale}", fallbackLocale="${this.fallbackLocale}"`,
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
    return this.fallbackLocale;
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

    if (translatedLocales.includes(this.fallbackLocale)) {
      return this.fallbackLocale;
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
      'translatable.translation-set',
      new TranslationHasBeenSetEvent(entity, key, locale, oldValue, newValue),
    );
  }
}
