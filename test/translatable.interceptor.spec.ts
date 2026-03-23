import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'reflect-metadata';
import { of, firstValueFrom } from 'rxjs';
import { Test, TestingModule } from '@nestjs/testing';
import { Translatable } from '../src/decorators/translatable.decorator';
import { TranslatableMixin } from '../src/mixins/translatable.mixin';
import { TranslatableInterceptor } from '../src/middleware/translatable.interceptor';
import { TranslatableService } from '../src/translatable.service';
import { TRANSLATABLE_OPTIONS } from '../src/translatable.constants';
import { TranslationMap } from '../src/interfaces';

class TestProduct extends TranslatableMixin(class {}) {
  @Translatable()
  name: TranslationMap = {};

  @Translatable()
  description: TranslationMap = {};

  slug: string = '';
}

function createMockContext(acceptLanguage?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: acceptLanguage
          ? { 'accept-language': acceptLanguage }
          : {},
      }),
    }),
  } as any;
}

function createMockHandler(data: any) {
  return {
    handle: () => of(data),
  } as any;
}

describe('TranslatableInterceptor', () => {
  let interceptor: TranslatableInterceptor;
  let service: TranslatableService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: TRANSLATABLE_OPTIONS,
          useValue: { defaultLocale: 'en', fallbackLocale: 'en' },
        },
        TranslatableService,
        TranslatableInterceptor,
      ],
    }).compile();

    service = module.get<TranslatableService>(TranslatableService);
    interceptor = module.get<TranslatableInterceptor>(TranslatableInterceptor);
    service.onModuleInit();
  });

  afterEach(() => {
    TranslatableService.resetInstance();
  });

  describe('with Accept-Language header', () => {
    it('should resolve translatable fields to the requested locale', async () => {
      const entity = new TestProduct();
      entity.name = { en: 'Hello', ar: 'مرحبا' };
      entity.description = { en: 'A greeting', ar: 'تحية' };
      entity.slug = 'hello';

      const context = createMockContext('ar');

      const result = await new Promise<any>((resolve) => {
        service.runWithLocale('ar', () => {
          firstValueFrom(
            interceptor.intercept(context, createMockHandler(entity)),
          ).then(resolve);
        });
      });

      expect(result.name).toBe('مرحبا');
      expect(result.description).toBe('تحية');
      expect(result.slug).toBe('hello');
    });

    it('should resolve an array of entities', async () => {
      const entity1 = new TestProduct();
      entity1.name = { en: 'Hello', fr: 'Bonjour' };
      entity1.slug = 'hello';

      const entity2 = new TestProduct();
      entity2.name = { en: 'World', fr: 'Monde' };
      entity2.slug = 'world';

      const context = createMockContext('fr');

      const result = await new Promise<any>((resolve) => {
        service.runWithLocale('fr', () => {
          firstValueFrom(
            interceptor.intercept(context, createMockHandler([entity1, entity2])),
          ).then(resolve);
        });
      });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Bonjour');
      expect(result[0].slug).toBe('hello');
      expect(result[1].name).toBe('Monde');
    });

    it('should use fallback locale when requested locale is missing', async () => {
      const entity = new TestProduct();
      entity.name = { en: 'Hello' };
      entity.slug = 'hello';

      const context = createMockContext('de');

      const result = await new Promise<any>((resolve) => {
        service.runWithLocale('de', () => {
          firstValueFrom(
            interceptor.intercept(context, createMockHandler(entity)),
          ).then(resolve);
        });
      });

      // Falls back to 'en' (configured fallbackLocale)
      expect(result.name).toBe('Hello');
    });

    it('should return null for missing translations with no fallback match', async () => {
      const entity = new TestProduct();
      entity.name = { fr: 'Bonjour' };
      entity.slug = 'hello';

      const context = createMockContext('de');

      // Default fallback is 'en', which is also missing
      const result = await new Promise<any>((resolve) => {
        service.runWithLocale('de', () => {
          firstValueFrom(
            interceptor.intercept(context, createMockHandler(entity)),
          ).then(resolve);
        });
      });

      expect(result.name).toBeNull();
    });

    it('should handle nested entity in plain object wrapper', async () => {
      const entity = new TestProduct();
      entity.name = { en: 'Hello', ar: 'مرحبا' };
      entity.slug = 'hello';

      const wrapped = { data: entity, total: 1 };
      const context = createMockContext('ar');

      const result = await new Promise<any>((resolve) => {
        service.runWithLocale('ar', () => {
          firstValueFrom(
            interceptor.intercept(context, createMockHandler(wrapped)),
          ).then(resolve);
        });
      });

      expect(result.data.name).toBe('مرحبا');
      expect(result.total).toBe(1);
    });

    it('should handle array of entities inside wrapper', async () => {
      const entity = new TestProduct();
      entity.name = { en: 'Hello', ar: 'مرحبا' };

      const wrapped = { data: [entity], total: 1 };
      const context = createMockContext('ar');

      const result = await new Promise<any>((resolve) => {
        service.runWithLocale('ar', () => {
          firstValueFrom(
            interceptor.intercept(context, createMockHandler(wrapped)),
          ).then(resolve);
        });
      });

      expect(result.data[0].name).toBe('مرحبا');
      expect(result.total).toBe(1);
    });
  });

  describe('without Accept-Language header', () => {
    it('should return full JSON translation maps', async () => {
      const entity = new TestProduct();
      entity.name = { en: 'Hello', ar: 'مرحبا' };
      entity.description = { en: 'A greeting', ar: 'تحية' };
      entity.slug = 'hello';

      const context = createMockContext(); // no header

      const result = await firstValueFrom(
        interceptor.intercept(context, createMockHandler(entity)),
      );

      expect(result.name).toEqual({ en: 'Hello', ar: 'مرحبا' });
      expect(result.description).toEqual({ en: 'A greeting', ar: 'تحية' });
      expect(result.slug).toBe('hello');
    });

    it('should return full JSON for array of entities', async () => {
      const entity = new TestProduct();
      entity.name = { en: 'Hello', fr: 'Bonjour' };

      const context = createMockContext(); // no header

      const result = await firstValueFrom(
        interceptor.intercept(context, createMockHandler([entity])),
      );

      expect(result[0].name).toEqual({ en: 'Hello', fr: 'Bonjour' });
    });
  });

  describe('edge cases', () => {
    it('should handle null data', async () => {
      const context = createMockContext('en');

      const result = await new Promise<any>((resolve) => {
        service.runWithLocale('en', () => {
          firstValueFrom(
            interceptor.intercept(context, createMockHandler(null)),
          ).then(resolve);
        });
      });

      expect(result).toBeNull();
    });

    it('should handle primitive data', async () => {
      const context = createMockContext('en');

      const result = await new Promise<any>((resolve) => {
        service.runWithLocale('en', () => {
          firstValueFrom(
            interceptor.intercept(context, createMockHandler('just a string')),
          ).then(resolve);
        });
      });

      expect(result).toBe('just a string');
    });

    it('should handle plain objects without translatable metadata', async () => {
      const context = createMockContext('en');
      const data = { foo: 'bar', count: 42 };

      const result = await new Promise<any>((resolve) => {
        service.runWithLocale('en', () => {
          firstValueFrom(
            interceptor.intercept(context, createMockHandler(data)),
          ).then(resolve);
        });
      });

      expect(result).toEqual({ foo: 'bar', count: 42 });
    });

    it('should handle nested plain objects without translatable metadata', async () => {
      const context = createMockContext('en');
      const data = { meta: { page: 1, limit: 10 }, count: 42 };

      const result = await new Promise<any>((resolve) => {
        service.runWithLocale('en', () => {
          firstValueFrom(
            interceptor.intercept(context, createMockHandler(data)),
          ).then(resolve);
        });
      });

      expect(result.meta).toEqual({ page: 1, limit: 10 });
      expect(result.count).toBe(42);
    });

    it('should handle translatable field with non-object value', async () => {
      const entity = new TestProduct();
      (entity as any).name = 'raw string';
      entity.slug = 'test';

      const context = createMockContext('en');

      const result = await new Promise<any>((resolve) => {
        service.runWithLocale('en', () => {
          firstValueFrom(
            interceptor.intercept(context, createMockHandler(entity)),
          ).then(resolve);
        });
      });

      expect(result.name).toBe('raw string');
    });

    it('should skip function properties on entities', async () => {
      const entity = new TestProduct();
      entity.name = { en: 'Hello', ar: 'مرحبا' };
      entity.slug = 'test';

      const context = createMockContext('ar');

      const result = await new Promise<any>((resolve) => {
        service.runWithLocale('ar', () => {
          firstValueFrom(
            interceptor.intercept(context, createMockHandler(entity)),
          ).then(resolve);
        });
      });

      // Functions should be skipped, only data properties present
      expect(result.name).toBe('مرحبا');
      expect(result.slug).toBe('test');
    });

    it('should handle entity with own function property', async () => {
      const entity = new TestProduct();
      entity.name = { en: 'Hello', ar: 'مرحبا' };
      entity.slug = 'test';
      // Add an own function property (not on prototype)
      (entity as any).toJSON = () => ({ custom: true });

      const context = createMockContext('ar');

      const result = await new Promise<any>((resolve) => {
        service.runWithLocale('ar', () => {
          firstValueFrom(
            interceptor.intercept(context, createMockHandler(entity)),
          ).then(resolve);
        });
      });

      // Function property should be skipped
      expect(result.name).toBe('مرحبا');
      expect(result.slug).toBe('test');
      expect(result.toJSON).toBeUndefined();
    });

    it('should handle entity with null constructor', async () => {
      const context = createMockContext('en');
      const data = Object.create(null);
      data.foo = 'bar';

      const result = await new Promise<any>((resolve) => {
        service.runWithLocale('en', () => {
          firstValueFrom(
            interceptor.intercept(context, createMockHandler(data)),
          ).then(resolve);
        });
      });

      expect(result.foo).toBe('bar');
    });
  });
});
