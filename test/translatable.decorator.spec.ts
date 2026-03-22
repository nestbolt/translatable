import { describe, it, expect } from 'vitest';
import 'reflect-metadata';
import {
  Translatable,
  getTranslatableFields,
} from '../src/decorators/translatable.decorator';
import { TRANSLATABLE_METADATA_KEY } from '../src/translatable.constants';

describe('Translatable decorator', () => {
  it('should register a single translatable field via metadata', () => {
    class TestEntity {
      @Translatable()
      name: Record<string, string> = {};
    }

    const fields = getTranslatableFields(TestEntity);
    expect(fields).toEqual(['name']);
  });

  it('should register multiple translatable fields', () => {
    class TestEntity {
      @Translatable()
      name: Record<string, string> = {};

      @Translatable()
      description: Record<string, string> = {};
    }

    const fields = getTranslatableFields(TestEntity);
    expect(fields).toEqual(['name', 'description']);
  });

  it('should not duplicate fields if decorator is applied twice', () => {
    class TestEntity {
      @Translatable()
      @Translatable()
      name: Record<string, string> = {};
    }

    const fields = getTranslatableFields(TestEntity);
    expect(fields).toEqual(['name']);
  });

  it('should return empty array for entities without translatable fields', () => {
    class TestEntity {
      slug: string = '';
    }

    const fields = getTranslatableFields(TestEntity);
    expect(fields).toEqual([]);
  });

  it('should store metadata under the correct key', () => {
    class TestEntity {
      @Translatable()
      title: Record<string, string> = {};
    }

    const fields = Reflect.getMetadata(
      TRANSLATABLE_METADATA_KEY,
      TestEntity,
    );
    expect(fields).toEqual(['title']);
  });

  it('should keep separate metadata per class', () => {
    class EntityA {
      @Translatable()
      name: Record<string, string> = {};
    }

    class EntityB {
      @Translatable()
      title: Record<string, string> = {};

      @Translatable()
      body: Record<string, string> = {};
    }

    expect(getTranslatableFields(EntityA)).toEqual(['name']);
    expect(getTranslatableFields(EntityB)).toEqual(['title', 'body']);
  });
});
