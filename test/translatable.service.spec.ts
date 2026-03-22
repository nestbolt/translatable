import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { TranslatableService } from '../src/translatable.service';
import { TRANSLATABLE_OPTIONS } from '../src/translatable.constants';
import { TranslatableModuleOptions } from '../src/interfaces';

describe('TranslatableService', () => {
  let service: TranslatableService;

  async function createService(
    options: TranslatableModuleOptions = {},
    eventEmitter?: any,
  ): Promise<TranslatableService> {
    const providers: any[] = [
      { provide: TRANSLATABLE_OPTIONS, useValue: options },
      TranslatableService,
    ];

    if (eventEmitter) {
      providers.push({ provide: 'EventEmitter2', useValue: eventEmitter });
    }

    const module: TestingModule = await Test.createTestingModule({
      providers,
    }).compile();

    const svc = module.get<TranslatableService>(TranslatableService);
    svc.onModuleInit();
    return svc;
  }

  afterEach(() => {
    TranslatableService.resetInstance();
  });

  describe('initialization', () => {
    it('should use default values when no options provided', async () => {
      service = await createService();

      expect(service.getDefaultLocale()).toBe('en');
      expect(service.getFallbackLocale()).toBe('en');
      expect(service.getFallbackAny()).toBe(false);
    });

    it('should use provided options', async () => {
      service = await createService({
        defaultLocale: 'ar',
        fallbackLocale: 'fr',
        fallbackAny: true,
      });

      expect(service.getDefaultLocale()).toBe('ar');
      expect(service.getFallbackLocale()).toBe('fr');
      expect(service.getFallbackAny()).toBe(true);
    });

    it('should fallback locale to defaultLocale when not specified', async () => {
      service = await createService({ defaultLocale: 'fr' });

      expect(service.getFallbackLocale()).toBe('fr');
    });

    it('should set static instance on module init', async () => {
      service = await createService();

      expect(TranslatableService.getInstance()).toBe(service);
    });
  });

  describe('locale management', () => {
    beforeEach(async () => {
      service = await createService({ defaultLocale: 'en' });
    });

    it('should return default locale when no context is set', () => {
      expect(service.getLocale()).toBe('en');
    });

    it('should return context locale inside runWithLocale', () => {
      service.runWithLocale('fr', () => {
        expect(service.getLocale()).toBe('fr');
      });
    });

    it('should restore locale after runWithLocale completes', () => {
      service.runWithLocale('ar', () => {
        // inside context
      });
      expect(service.getLocale()).toBe('en');
    });

    it('should support nested runWithLocale calls', () => {
      service.runWithLocale('fr', () => {
        expect(service.getLocale()).toBe('fr');

        service.runWithLocale('ar', () => {
          expect(service.getLocale()).toBe('ar');
        });

        expect(service.getLocale()).toBe('fr');
      });
    });

    it('should return value from runWithLocale callback', () => {
      const result = service.runWithLocale('fr', () => 'hello');
      expect(result).toBe('hello');
    });
  });

  describe('resolveLocale', () => {
    it('should return requested locale when it exists', async () => {
      service = await createService({ fallbackLocale: 'en' });

      const result = service.resolveLocale('fr', ['en', 'fr', 'ar'], true);
      expect(result).toBe('fr');
    });

    it('should fall back to fallback locale when requested is missing', async () => {
      service = await createService({ fallbackLocale: 'en' });

      const result = service.resolveLocale('de', ['en', 'fr'], true);
      expect(result).toBe('en');
    });

    it('should return requested locale without fallback when useFallback is false', async () => {
      service = await createService({ fallbackLocale: 'en' });

      const result = service.resolveLocale('de', ['en', 'fr'], false);
      expect(result).toBe('de');
    });

    it('should fall back to any available locale when fallbackAny is true', async () => {
      service = await createService({
        fallbackLocale: 'de',
        fallbackAny: true,
      });

      const result = service.resolveLocale('es', ['fr', 'ar'], true);
      expect(result).toBe('fr');
    });

    it('should not fall back to any when fallbackAny is false', async () => {
      service = await createService({
        fallbackLocale: 'de',
        fallbackAny: false,
      });

      const result = service.resolveLocale('es', ['fr', 'ar'], true);
      expect(result).toBe('es');
    });

    it('should return requested locale when translatedLocales is empty', async () => {
      service = await createService({ fallbackAny: true });

      const result = service.resolveLocale('fr', [], true);
      expect(result).toBe('fr');
    });
  });

  describe('event emission', () => {
    it('should emit event when eventEmitter is available', async () => {
      const emitFn = vi.fn();
      const mockEmitter = { emit: emitFn };

      service = await createService({}, mockEmitter);

      service.emitTranslationSet({}, 'name', 'en', null, 'Hello');

      expect(emitFn).toHaveBeenCalledOnce();
      expect(emitFn).toHaveBeenCalledWith(
        'translatable.translation-set',
        expect.objectContaining({
          key: 'name',
          locale: 'en',
          oldValue: null,
          newValue: 'Hello',
        }),
      );
    });

    it('should not throw when eventEmitter is not available', async () => {
      service = await createService();

      expect(() => {
        service.emitTranslationSet({}, 'name', 'en', null, 'Hello');
      }).not.toThrow();
    });
  });

  describe('static instance', () => {
    it('should return null before initialization', () => {
      expect(TranslatableService.getInstance()).toBeNull();
    });

    it('should reset instance', async () => {
      service = await createService();
      expect(TranslatableService.getInstance()).toBe(service);

      TranslatableService.resetInstance();
      expect(TranslatableService.getInstance()).toBeNull();
    });
  });
});
