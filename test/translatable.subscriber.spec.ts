import { describe, it, expect, beforeEach } from 'vitest';
import 'reflect-metadata';
import { Translatable } from '../src/decorators/translatable.decorator';
import { TranslatableSubscriber } from '../src/translatable.subscriber';
import { TranslationMap } from '../src/interfaces';

class TestProduct {
  @Translatable()
  name: TranslationMap | string | null = {};

  @Translatable()
  description: TranslationMap | string | null = {};

  slug: string = '';
}

describe('TranslatableSubscriber', () => {
  let subscriber: TranslatableSubscriber;

  beforeEach(() => {
    subscriber = new TranslatableSubscriber();
  });

  describe('afterLoad', () => {
    it('should parse JSON string fields into objects', () => {
      const entity = new TestProduct();
      entity.name = '{"en":"Hello","fr":"Bonjour"}';

      subscriber.afterLoad(entity);

      expect(entity.name).toEqual({ en: 'Hello', fr: 'Bonjour' });
    });

    it('should set null fields to empty object', () => {
      const entity = new TestProduct();
      entity.name = null;

      subscriber.afterLoad(entity);

      expect(entity.name).toEqual({});
    });

    it('should leave valid objects as-is', () => {
      const entity = new TestProduct();
      entity.name = { en: 'Hello' };

      subscriber.afterLoad(entity);

      expect(entity.name).toEqual({ en: 'Hello' });
    });

    it('should set invalid JSON strings to empty object', () => {
      const entity = new TestProduct();
      entity.name = 'not-json';

      subscriber.afterLoad(entity);

      expect(entity.name).toEqual({});
    });

    it('should not affect non-translatable fields', () => {
      const entity = new TestProduct();
      entity.slug = 'hello-world';

      subscriber.afterLoad(entity);

      expect(entity.slug).toBe('hello-world');
    });
  });

  describe('beforeInsert', () => {
    it('should strip null/empty values from translation maps', () => {
      const entity = new TestProduct();
      entity.name = { en: 'Hello', fr: '', ar: 'مرحبا' } as any;

      subscriber.beforeInsert({ entity } as any);

      expect(entity.name).toEqual({ en: 'Hello', ar: 'مرحبا' });
    });

    it('should preserve valid translations', () => {
      const entity = new TestProduct();
      entity.name = { en: 'Hello', fr: 'Bonjour' };

      subscriber.beforeInsert({ entity } as any);

      expect(entity.name).toEqual({ en: 'Hello', fr: 'Bonjour' });
    });

    it('should handle zero string values', () => {
      const entity = new TestProduct();
      entity.name = { en: '0', fr: 'Bonjour' };

      subscriber.beforeInsert({ entity } as any);

      expect(entity.name).toEqual({ en: '0', fr: 'Bonjour' });
    });
  });

  describe('beforeUpdate', () => {
    it('should strip null/empty values from translation maps', () => {
      const entity = new TestProduct();
      entity.name = { en: 'Hello', fr: '' } as any;

      subscriber.beforeUpdate({ entity } as any);

      expect(entity.name).toEqual({ en: 'Hello' });
    });

    it('should handle missing entity gracefully', () => {
      expect(() => {
        subscriber.beforeUpdate({ entity: undefined } as any);
      }).not.toThrow();
    });
  });

  describe('non-translatable entity', () => {
    it('should not affect entities without @Translatable fields', () => {
      class PlainEntity {
        name: string = 'hello';
      }

      const entity = new PlainEntity();
      subscriber.afterLoad(entity);
      expect(entity.name).toBe('hello');
    });
  });
});
