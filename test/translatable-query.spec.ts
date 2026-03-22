import { describe, it, expect, vi } from 'vitest';
import {
  whereTranslation,
  whereTranslationLike,
  whereLocale,
  whereLocales,
  orderByTranslation,
} from '../src/query/translatable-query.helpers';

function createMockQueryBuilder(alias: string = 'entity') {
  const qb: any = {
    alias,
    andWhere: vi.fn().mockReturnThis(),
    addOrderBy: vi.fn().mockReturnThis(),
  };
  return qb;
}

describe('Query helpers', () => {
  describe('whereTranslation', () => {
    it('should add WHERE clause with jsonb extraction and exact value', () => {
      const qb = createMockQueryBuilder('news');

      whereTranslation(qb, 'name', 'en', 'Hello');

      expect(qb.andWhere).toHaveBeenCalledWith(
        `"news"."name"->>'en' = :name_en_val`,
        { name_en_val: 'Hello' },
      );
    });

    it('should use custom alias', () => {
      const qb = createMockQueryBuilder('news');

      whereTranslation(qb, 'name', 'en', 'Hello', 'n');

      expect(qb.andWhere).toHaveBeenCalledWith(
        `"n"."name"->>'en' = :name_en_val`,
        { name_en_val: 'Hello' },
      );
    });
  });

  describe('whereTranslationLike', () => {
    it('should add ILIKE clause for pattern matching', () => {
      const qb = createMockQueryBuilder('news');

      whereTranslationLike(qb, 'name', 'en', '%breaking%');

      expect(qb.andWhere).toHaveBeenCalledWith(
        `"news"."name"->>'en' ILIKE :name_en_like`,
        { name_en_like: '%breaking%' },
      );
    });
  });

  describe('whereLocale', () => {
    it('should add IS NOT NULL clause for locale existence', () => {
      const qb = createMockQueryBuilder('news');

      whereLocale(qb, 'name', 'en');

      expect(qb.andWhere).toHaveBeenCalledWith(
        `"news"."name"->>'en' IS NOT NULL`,
      );
    });
  });

  describe('whereLocales', () => {
    it('should add OR clause for multiple locale existence', () => {
      const qb = createMockQueryBuilder('news');

      whereLocales(qb, 'name', ['en', 'fr']);

      expect(qb.andWhere).toHaveBeenCalledWith(
        `("news"."name"->>'en' IS NOT NULL OR "news"."name"->>'fr' IS NOT NULL)`,
      );
    });

    it('should work with single locale', () => {
      const qb = createMockQueryBuilder('news');

      whereLocales(qb, 'name', ['en']);

      expect(qb.andWhere).toHaveBeenCalledWith(
        `("news"."name"->>'en' IS NOT NULL)`,
      );
    });
  });

  describe('orderByTranslation', () => {
    it('should add ORDER BY clause defaulting to ASC', () => {
      const qb = createMockQueryBuilder('news');

      orderByTranslation(qb, 'name', 'en');

      expect(qb.addOrderBy).toHaveBeenCalledWith(
        `"news"."name"->>'en'`,
        'ASC',
      );
    });

    it('should accept DESC order', () => {
      const qb = createMockQueryBuilder('news');

      orderByTranslation(qb, 'name', 'en', 'DESC');

      expect(qb.addOrderBy).toHaveBeenCalledWith(
        `"news"."name"->>'en'`,
        'DESC',
      );
    });

    it('should use custom alias', () => {
      const qb = createMockQueryBuilder('news');

      orderByTranslation(qb, 'name', 'en', 'ASC', 'n');

      expect(qb.addOrderBy).toHaveBeenCalledWith(
        `"n"."name"->>'en'`,
        'ASC',
      );
    });
  });

  describe('chaining', () => {
    it('should support chaining multiple helpers', () => {
      const qb = createMockQueryBuilder('news');

      const result = whereLocale(qb, 'name', 'en');
      whereTranslation(result, 'name', 'en', 'Hello');
      orderByTranslation(result, 'name', 'en', 'ASC');

      expect(qb.andWhere).toHaveBeenCalledTimes(2);
      expect(qb.addOrderBy).toHaveBeenCalledTimes(1);
    });
  });
});
