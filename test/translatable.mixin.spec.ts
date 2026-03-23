import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { Translatable } from '../src/decorators/translatable.decorator';
import { TranslatableMixin } from '../src/mixins/translatable.mixin';
import { TranslatableService } from '../src/translatable.service';
import { TRANSLATABLE_OPTIONS } from '../src/translatable.constants';
import { AttributeIsNotTranslatableException } from '../src/exceptions';
import { TranslationMap } from '../src/interfaces';

class TestEntity extends TranslatableMixin(class {}) {
  @Translatable()
  name: TranslationMap = {};

  @Translatable()
  description: TranslationMap = {};

  slug: string = '';
}

async function setupService(options = {}): Promise<TranslatableService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      {
        provide: TRANSLATABLE_OPTIONS,
        useValue: { defaultLocale: 'en', fallbackLocale: 'en', ...options },
      },
      TranslatableService,
    ],
  }).compile();

  const svc = module.get<TranslatableService>(TranslatableService);
  svc.onModuleInit();
  return svc;
}

describe('TranslatableMixin', () => {
  let entity: TestEntity;

  beforeEach(() => {
    entity = new TestEntity();
  });

  afterEach(() => {
    TranslatableService.resetInstance();
  });

  describe('getTranslatableAttributes', () => {
    it('should return all fields decorated with @Translatable()', () => {
      expect(entity.getTranslatableAttributes()).toEqual([
        'name',
        'description',
      ]);
    });
  });

  describe('isTranslatableAttribute', () => {
    it('should return true for translatable fields', () => {
      expect(entity.isTranslatableAttribute('name')).toBe(true);
      expect(entity.isTranslatableAttribute('description')).toBe(true);
    });

    it('should return false for non-translatable fields', () => {
      expect(entity.isTranslatableAttribute('slug')).toBe(false);
    });
  });

  describe('setTranslation / getTranslation', () => {
    it('should set and get a single translation', async () => {
      await setupService();

      entity.setTranslation('name', 'en', 'Hello');
      expect(entity.getTranslation('name', 'en')).toBe('Hello');
    });

    it('should be chainable', async () => {
      await setupService();

      const result = entity
        .setTranslation('name', 'en', 'Hello')
        .setTranslation('name', 'ar', 'مرحبا')
        .setTranslation('name', 'fr', 'Bonjour');

      expect(result).toBe(entity);
      expect(entity.getTranslation('name', 'en')).toBe('Hello');
      expect(entity.getTranslation('name', 'ar')).toBe('مرحبا');
      expect(entity.getTranslation('name', 'fr')).toBe('Bonjour');
    });

    it('should return null for missing translation', async () => {
      await setupService();

      entity.setTranslation('name', 'en', 'Hello');
      expect(entity.getTranslation('name', 'de', false)).toBeNull();
    });

    it('should store translation data in the property', async () => {
      await setupService();

      entity.setTranslation('name', 'en', 'Hello');
      entity.setTranslation('name', 'fr', 'Bonjour');

      expect(entity.name).toEqual({ en: 'Hello', fr: 'Bonjour' });
    });

    it('should remove translation when value is null', async () => {
      await setupService();

      entity.setTranslation('name', 'en', 'Hello');
      entity.setTranslation('name', 'fr', 'Bonjour');
      entity.setTranslation('name', 'fr', null);

      expect(entity.name).toEqual({ en: 'Hello' });
    });

    it('should remove translation when value is empty string', async () => {
      await setupService();

      entity.setTranslation('name', 'en', 'Hello');
      entity.setTranslation('name', 'fr', 'Bonjour');
      entity.setTranslation('name', 'fr', '');

      expect(entity.name).toEqual({ en: 'Hello' });
    });

    it('should throw for non-translatable attribute', async () => {
      await setupService();

      expect(() => entity.setTranslation('slug', 'en', 'test')).toThrow(
        AttributeIsNotTranslatableException,
      );
      expect(() => entity.getTranslation('slug', 'en')).toThrow(
        AttributeIsNotTranslatableException,
      );
    });
  });

  describe('fallback locale', () => {
    it('should fall back to fallback locale when translation is missing', async () => {
      await setupService({ fallbackLocale: 'en' });

      entity.setTranslation('name', 'en', 'Hello');
      expect(entity.getTranslation('name', 'de')).toBe('Hello');
    });

    it('should not fall back when useFallback is false', async () => {
      await setupService({ fallbackLocale: 'en' });

      entity.setTranslation('name', 'en', 'Hello');
      expect(entity.getTranslation('name', 'de', false)).toBeNull();
    });

    it('should fall back to any locale when fallbackAny is true', async () => {
      await setupService({ fallbackLocale: 'de', fallbackAny: true });

      entity.setTranslation('name', 'fr', 'Bonjour');
      expect(entity.getTranslation('name', 'en')).toBe('Bonjour');
    });

    it('should not fall back to any when fallbackAny is false', async () => {
      await setupService({ fallbackLocale: 'de', fallbackAny: false });

      entity.setTranslation('name', 'fr', 'Bonjour');
      expect(entity.getTranslation('name', 'en')).toBeNull();
    });
  });

  describe('current locale', () => {
    it('should use current locale when no locale is specified', async () => {
      const service = await setupService({ defaultLocale: 'en' });

      entity
        .setTranslation('name', 'en', 'Hello')
        .setTranslation('name', 'fr', 'Bonjour');

      expect(entity.getTranslation('name')).toBe('Hello');

      service.runWithLocale('fr', () => {
        expect(entity.getTranslation('name')).toBe('Bonjour');
      });
    });
  });

  describe('setTranslations', () => {
    it('should set multiple translations at once', async () => {
      await setupService();

      entity.setTranslations('name', {
        en: 'Hello',
        ar: 'مرحبا',
        fr: 'Bonjour',
      });

      expect(entity.getTranslation('name', 'en')).toBe('Hello');
      expect(entity.getTranslation('name', 'ar')).toBe('مرحبا');
      expect(entity.getTranslation('name', 'fr')).toBe('Bonjour');
    });

    it('should be chainable', async () => {
      await setupService();

      const result = entity.setTranslations('name', { en: 'Hello' });
      expect(result).toBe(entity);
    });
  });

  describe('getTranslations', () => {
    it('should return all translations for a field', async () => {
      await setupService();

      entity.setTranslations('name', { en: 'Hello', fr: 'Bonjour' });

      expect(entity.getTranslations('name')).toEqual({
        en: 'Hello',
        fr: 'Bonjour',
      });
    });

    it('should return all translations for all fields when no key given', async () => {
      await setupService();

      entity.setTranslations('name', { en: 'Hello' });
      entity.setTranslations('description', { en: 'A greeting' });

      const result = entity.getTranslations() as Record<string, TranslationMap>;
      expect(result).toEqual({
        name: { en: 'Hello' },
        description: { en: 'A greeting' },
      });
    });

    it('should filter by allowed locales', async () => {
      await setupService();

      entity.setTranslations('name', {
        en: 'Hello',
        fr: 'Bonjour',
        ar: 'مرحبا',
      });

      expect(entity.getTranslations('name', ['en', 'fr'])).toEqual({
        en: 'Hello',
        fr: 'Bonjour',
      });
    });

    it('should exclude null/empty values', async () => {
      await setupService();

      entity.name = { en: 'Hello', fr: '', ar: 'مرحبا' };

      expect(entity.getTranslations('name')).toEqual({
        en: 'Hello',
        ar: 'مرحبا',
      });
    });
  });

  describe('forgetTranslation', () => {
    it('should remove a specific translation', async () => {
      await setupService();

      entity.setTranslations('name', { en: 'Hello', fr: 'Bonjour' });
      entity.forgetTranslation('name', 'fr');

      expect(entity.name).toEqual({ en: 'Hello' });
    });

    it('should be chainable', async () => {
      await setupService();

      entity.setTranslations('name', {
        en: 'Hello',
        fr: 'Bonjour',
        ar: 'مرحبا',
      });

      const result = entity
        .forgetTranslation('name', 'fr')
        .forgetTranslation('name', 'ar');

      expect(result).toBe(entity);
      expect(entity.name).toEqual({ en: 'Hello' });
    });

    it('should not throw when forgetting non-existent locale', async () => {
      await setupService();

      entity.setTranslation('name', 'en', 'Hello');

      expect(() => entity.forgetTranslation('name', 'de')).not.toThrow();
      expect(entity.name).toEqual({ en: 'Hello' });
    });
  });

  describe('forgetAllTranslations', () => {
    it('should remove a locale across all translatable fields', async () => {
      await setupService();

      entity.setTranslations('name', { en: 'Hello', fr: 'Bonjour' });
      entity.setTranslations('description', { en: 'Greeting', fr: 'Salut' });

      entity.forgetAllTranslations('fr');

      expect(entity.name).toEqual({ en: 'Hello' });
      expect(entity.description).toEqual({ en: 'Greeting' });
    });

    it('should be chainable', async () => {
      await setupService();

      entity.setTranslations('name', { en: 'Hello', fr: 'Bonjour' });
      const result = entity.forgetAllTranslations('fr');
      expect(result).toBe(entity);
    });
  });

  describe('replaceTranslations', () => {
    it('should replace all translations for a field', async () => {
      await setupService();

      entity.setTranslations('name', { en: 'Hello', fr: 'Bonjour' });
      entity.replaceTranslations('name', { ar: 'مرحبا', de: 'Hallo' });

      expect(entity.name).toEqual({ ar: 'مرحبا', de: 'Hallo' });
    });

    it('should be chainable', async () => {
      await setupService();

      const result = entity.replaceTranslations('name', { en: 'Hi' });
      expect(result).toBe(entity);
    });
  });

  describe('hasTranslation', () => {
    it('should return true when translation exists', async () => {
      await setupService();

      entity.setTranslation('name', 'en', 'Hello');
      expect(entity.hasTranslation('name', 'en')).toBe(true);
    });

    it('should return false when translation is missing', async () => {
      await setupService();

      entity.setTranslation('name', 'en', 'Hello');
      expect(entity.hasTranslation('name', 'fr')).toBe(false);
    });

    it('should use current locale when no locale specified', async () => {
      const service = await setupService({ defaultLocale: 'en' });

      entity.setTranslation('name', 'en', 'Hello');
      expect(entity.hasTranslation('name')).toBe(true);

      service.runWithLocale('fr', () => {
        expect(entity.hasTranslation('name')).toBe(false);
      });
    });
  });

  describe('getTranslatedLocales', () => {
    it('should return locales that have translations', async () => {
      await setupService();

      entity.setTranslations('name', {
        en: 'Hello',
        fr: 'Bonjour',
        ar: 'مرحبا',
      });

      expect(entity.getTranslatedLocales('name')).toEqual([
        'en',
        'fr',
        'ar',
      ]);
    });

    it('should exclude empty values', async () => {
      await setupService();

      entity.name = { en: 'Hello', fr: '', ar: 'مرحبا' };

      expect(entity.getTranslatedLocales('name')).toEqual(['en', 'ar']);
    });
  });

  describe('locales', () => {
    it('should return union of locales across all fields', async () => {
      await setupService();

      entity.setTranslations('name', { en: 'Hello', fr: 'Bonjour' });
      entity.setTranslations('description', { en: 'Greeting', ar: 'تحية' });

      const result = entity.locales();
      expect(result.sort()).toEqual(['ar', 'en', 'fr']);
    });

    it('should return empty array when no translations exist', () => {
      expect(entity.locales()).toEqual([]);
    });
  });

  describe('without service (standalone)', () => {
    it('should work without TranslatableService initialized', () => {
      entity.setTranslation('name', 'en', 'Hello');
      expect(entity.getTranslation('name', 'en')).toBe('Hello');
    });

    it('should use first available locale as fallback without service', () => {
      entity.setTranslation('name', 'fr', 'Bonjour');
      expect(entity.getTranslation('name', 'en')).toBe('Bonjour');
    });

    it('should return null for missing translation without fallback and without service', () => {
      entity.setTranslation('name', 'fr', 'Bonjour');
      expect(entity.getTranslation('name', 'en', false)).toBeNull();
    });

    it('should default to "en" locale when no locale arg and no service', () => {
      entity.setTranslation('name', 'en', 'English');
      // No locale argument, no service → defaults to 'en'
      expect(entity.getTranslation('name')).toBe('English');
    });

    it('should default to "en" locale for hasTranslation without locale or service', () => {
      entity.setTranslation('name', 'en', 'Hello');
      // No locale argument, no service → defaults to 'en'
      expect(entity.hasTranslation('name')).toBe(true);
    });

    it('should return false for hasTranslation when "en" default is missing', () => {
      entity.setTranslation('name', 'fr', 'Bonjour');
      // No locale argument, no service → defaults to 'en', which is missing
      expect(entity.hasTranslation('name')).toBe(false);
    });

    it('should return null when no translations exist and no service (fallback path)', () => {
      // No translations set at all, no service
      // Tests line 68: translatedLocales[0] ?? requestedLocale (empty array → requestedLocale)
      expect(entity.getTranslation('name', 'en')).toBeNull();
    });

    it('should return empty array for getTranslatableAttributes on class without decorators', () => {
      class Plain extends TranslatableMixin(class {}) {
        title: string = '';
      }
      const plain = new Plain();
      // No @Translatable() decorators → Reflect.getMetadata returns undefined → || []
      expect(plain.getTranslatableAttributes()).toEqual([]);
    });
  });

  describe('zero value handling', () => {
    it('should preserve zero string as a valid translation', async () => {
      await setupService();

      entity.setTranslation('name', 'en', '0');
      expect(entity.getTranslation('name', 'en')).toBe('0');
      expect(entity.hasTranslation('name', 'en')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle entity with null property', async () => {
      await setupService();

      (entity as any).name = null;
      expect(entity.getTranslation('name', 'en', false)).toBeNull();
    });

    it('should handle entity with undefined property', async () => {
      await setupService();

      (entity as any).name = undefined;
      expect(entity.getTranslation('name', 'en', false)).toBeNull();
    });

    it('should work with multiple independent entities', async () => {
      await setupService();

      const entity1 = new TestEntity();
      const entity2 = new TestEntity();

      entity1.setTranslation('name', 'en', 'First');
      entity2.setTranslation('name', 'en', 'Second');

      expect(entity1.getTranslation('name', 'en')).toBe('First');
      expect(entity2.getTranslation('name', 'en')).toBe('Second');
    });

    it('should return empty map when field value is an array', async () => {
      await setupService();

      (entity as any).name = ['not', 'an', 'object'];
      expect(entity.getTranslations('name')).toEqual({});
    });
  });
});
