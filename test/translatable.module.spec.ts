import { describe, it, expect, afterEach } from 'vitest';
import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TranslatableModule } from '../src/translatable.module';
import { TranslatableService } from '../src/translatable.service';
import { TranslatableSubscriber } from '../src/translatable.subscriber';
import { IsTranslationsConstraint } from '../src/validators';

describe('TranslatableModule', () => {
  afterEach(() => {
    TranslatableService.resetInstance();
  });

  describe('forRoot', () => {
    it('should create module with default options', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [TranslatableModule.forRoot()],
      }).compile();

      const service = module.get<TranslatableService>(TranslatableService);
      expect(service).toBeDefined();
      expect(service.getDefaultLocale()).toBe('en');
    });

    it('should create module with custom options', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          TranslatableModule.forRoot({
            defaultLocale: 'ar',
            fallbackLocale: 'en',
            fallbackAny: true,
          }),
        ],
      }).compile();

      const service = module.get<TranslatableService>(TranslatableService);
      expect(service.getDefaultLocale()).toBe('ar');
      expect(service.getFallbackLocale()).toBe('en');
      expect(service.getFallbackAny()).toBe(true);
    });

    it('should export TranslatableService', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [TranslatableModule.forRoot()],
      }).compile();

      expect(
        module.get<TranslatableService>(TranslatableService),
      ).toBeDefined();
    });

    it('should export TranslatableSubscriber', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [TranslatableModule.forRoot()],
      }).compile();

      expect(
        module.get<TranslatableSubscriber>(TranslatableSubscriber),
      ).toBeDefined();
    });

    it('should export IsTranslationsConstraint', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [TranslatableModule.forRoot()],
      }).compile();

      expect(
        module.get<IsTranslationsConstraint>(IsTranslationsConstraint),
      ).toBeDefined();
    });

    it('should be a global module', () => {
      const dynamicModule = TranslatableModule.forRoot();
      expect(dynamicModule.global).toBe(true);
    });
  });

  describe('forRootAsync', () => {
    it('should create module with async factory', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          TranslatableModule.forRootAsync({
            useFactory: () => ({
              defaultLocale: 'fr',
              fallbackLocale: 'en',
            }),
          }),
        ],
      }).compile();

      const service = module.get<TranslatableService>(TranslatableService);
      expect(service.getDefaultLocale()).toBe('fr');
      expect(service.getFallbackLocale()).toBe('en');
    });

    it('should support inject parameter', async () => {
      const CONFIG_TOKEN = 'APP_CONFIG';

      @Module({
        providers: [
          { provide: CONFIG_TOKEN, useValue: { locale: 'de' } },
        ],
        exports: [CONFIG_TOKEN],
      })
      class ConfigModule {}

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          TranslatableModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (config: any) => ({
              defaultLocale: config.locale,
            }),
            inject: [CONFIG_TOKEN],
          }),
        ],
      }).compile();

      const service = module.get<TranslatableService>(TranslatableService);
      expect(service.getDefaultLocale()).toBe('de');
    });

    it('should be a global module', () => {
      const dynamicModule = TranslatableModule.forRootAsync({
        useFactory: () => ({}),
      });
      expect(dynamicModule.global).toBe(true);
    });
  });
});
