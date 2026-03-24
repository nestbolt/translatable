import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "reflect-metadata";
import { of, firstValueFrom } from "rxjs";
import { Test, TestingModule } from "@nestjs/testing";
import { Controller } from "@nestjs/common";
import { Translatable } from "../src/decorators/translatable.decorator";
import { SkipTranslation } from "../src/decorators/skip-translation.decorator";
import { TranslatableMixin } from "../src/mixins/translatable.mixin";
import { TranslatableInterceptor } from "../src/middleware/translatable.interceptor";
import { TranslatableService } from "../src/translatable.service";
import { TRANSLATABLE_OPTIONS } from "../src/translatable.constants";
import { TranslationMap } from "../src/interfaces";

class TestProduct extends TranslatableMixin(class {}) {
  @Translatable()
  name: TranslationMap = {};

  @Translatable()
  description: TranslationMap = {};

  slug: string = "";
}

function createGqlContext(acceptLanguage?: string) {
  return {
    getType: () => "graphql",
    getArgs: () => [
      {}, // root
      {}, // args
      {
        // graphql context
        req: {
          headers: acceptLanguage ? { "accept-language": acceptLanguage } : {},
        },
      },
      {}, // info
    ],
    getHandler: () => () => null,
    getClass: () => class {},
  } as any;
}

function createMockHandler(data: any) {
  return { handle: () => of(data) } as any;
}

describe("TranslatableInterceptor — GraphQL support", () => {
  let interceptor: TranslatableInterceptor;
  let service: TranslatableService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: TRANSLATABLE_OPTIONS,
          useValue: { defaultLocale: "en", fallbackLocale: "en" },
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

  describe("with Accept-Language in GraphQL context", () => {
    it("should resolve translatable fields from GQL context headers", async () => {
      const entity = new TestProduct();
      entity.name = { en: "Hello", ar: "مرحبا" };
      entity.description = { en: "A greeting", ar: "تحية" };
      entity.slug = "hello";

      const context = createGqlContext("ar");

      const result = await new Promise<any>((resolve) => {
        service.runWithLocale("ar", () => {
          firstValueFrom(
            interceptor.intercept(context, createMockHandler(entity)),
          ).then(resolve);
        });
      });

      expect(result.name).toBe("مرحبا");
      expect(result.description).toBe("تحية");
      expect(result.slug).toBe("hello");
    });

    it("should resolve an array of entities in GQL", async () => {
      const entity1 = new TestProduct();
      entity1.name = { en: "Hello", fr: "Bonjour" };
      entity1.slug = "hello";

      const entity2 = new TestProduct();
      entity2.name = { en: "World", fr: "Monde" };
      entity2.slug = "world";

      const context = createGqlContext("fr");

      const result = await new Promise<any>((resolve) => {
        service.runWithLocale("fr", () => {
          firstValueFrom(
            interceptor.intercept(
              context,
              createMockHandler([entity1, entity2]),
            ),
          ).then(resolve);
        });
      });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Bonjour");
      expect(result[1].name).toBe("Monde");
    });

    it("should use fallback locale when requested locale is missing in GQL", async () => {
      const entity = new TestProduct();
      entity.name = { en: "Hello" };
      entity.slug = "hello";

      const context = createGqlContext("de");

      const result = await new Promise<any>((resolve) => {
        service.runWithLocale("de", () => {
          firstValueFrom(
            interceptor.intercept(context, createMockHandler(entity)),
          ).then(resolve);
        });
      });

      expect(result.name).toBe("Hello");
    });
  });

  describe("without Accept-Language in GraphQL context", () => {
    it("should return full JSON translation maps", async () => {
      const entity = new TestProduct();
      entity.name = { en: "Hello", ar: "مرحبا" };
      entity.slug = "hello";

      const context = createGqlContext(); // no header

      const result = await firstValueFrom(
        interceptor.intercept(context, createMockHandler(entity)),
      );

      expect(result.name).toEqual({ en: "Hello", ar: "مرحبا" });
      expect(result.slug).toBe("hello");
    });
  });

  describe("GraphQL context edge cases", () => {
    it("should handle GQL context without req", async () => {
      const context = {
        getType: () => "graphql",
        getArgs: () => [{}, {}, {}, {}], // context has no req
        getHandler: () => () => null,
        getClass: () => class {},
      } as any;

      const entity = new TestProduct();
      entity.name = { en: "Hello", ar: "مرحبا" };

      const result = await firstValueFrom(
        interceptor.intercept(context, createMockHandler(entity)),
      );

      // No locale header → full JSON
      expect(result.name).toEqual({ en: "Hello", ar: "مرحبا" });
    });

    it("should handle GQL context with null context arg", async () => {
      const context = {
        getType: () => "graphql",
        getArgs: () => [{}, {}, null, {}],
        getHandler: () => () => null,
        getClass: () => class {},
      } as any;

      const entity = new TestProduct();
      entity.name = { en: "Hello" };

      const result = await firstValueFrom(
        interceptor.intercept(context, createMockHandler(entity)),
      );

      expect(result.name).toEqual({ en: "Hello" });
    });
  });

  describe("@SkipTranslation in GraphQL context", () => {
    class MockResolver {
      products() {
        return [];
      }

      @SkipTranslation()
      adminProducts() {
        return [];
      }
    }

    @SkipTranslation()
    @Controller("admin")
    class SkippedResolver {
      products() {
        return [];
      }
    }

    it("should skip resolution when @SkipTranslation() is on the handler", async () => {
      const entity = new TestProduct();
      entity.name = { en: "Hello", ar: "مرحبا" };

      const context = {
        getType: () => "graphql",
        getArgs: () => [
          {},
          {},
          { req: { headers: { "accept-language": "ar" } } },
          {},
        ],
        getHandler: () => MockResolver.prototype.adminProducts,
        getClass: () => MockResolver,
      } as any;

      const result = await new Promise<any>((resolve) => {
        service.runWithLocale("ar", () => {
          firstValueFrom(
            interceptor.intercept(context, createMockHandler(entity)),
          ).then(resolve);
        });
      });

      // Full JSON returned, not resolved
      expect(result.name).toEqual({ en: "Hello", ar: "مرحبا" });
    });

    it("should skip resolution when @SkipTranslation() is on the class", async () => {
      const entity = new TestProduct();
      entity.name = { en: "Hello", ar: "مرحبا" };

      const context = {
        getType: () => "graphql",
        getArgs: () => [
          {},
          {},
          { req: { headers: { "accept-language": "ar" } } },
          {},
        ],
        getHandler: () => SkippedResolver.prototype.products,
        getClass: () => SkippedResolver,
      } as any;

      const result = await new Promise<any>((resolve) => {
        service.runWithLocale("ar", () => {
          firstValueFrom(
            interceptor.intercept(context, createMockHandler(entity)),
          ).then(resolve);
        });
      });

      expect(result.name).toEqual({ en: "Hello", ar: "مرحبا" });
    });
  });

  describe("unknown context type", () => {
    it("should pass through data for unknown context types", async () => {
      const context = {
        getType: () => "ws",
        getHandler: () => () => null,
        getClass: () => class {},
      } as any;

      const entity = new TestProduct();
      entity.name = { en: "Hello", ar: "مرحبا" };

      const result = await firstValueFrom(
        interceptor.intercept(context, createMockHandler(entity)),
      );

      // Unknown type → no locale → full JSON passthrough
      expect(result.name).toEqual({ en: "Hello", ar: "مرحبا" });
    });
  });
});
