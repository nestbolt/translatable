import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "reflect-metadata";
import { of, firstValueFrom } from "rxjs";
import { Test, TestingModule } from "@nestjs/testing";
import { Controller, Get } from "@nestjs/common";
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

  slug: string = "";
}

@Controller("products")
class ProductController {
  @Get()
  findAll() {
    return [];
  }

  @SkipTranslation()
  @Get("admin")
  findAllAdmin() {
    return [];
  }
}

@SkipTranslation()
@Controller("admin")
class AdminController {
  @Get("products")
  findAll() {
    return [];
  }
}

function createMockContext(
  acceptLanguage: string | undefined,
  handler: (...args: any[]) => any,
  controller: new (...args: any[]) => any,
) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: acceptLanguage ? { "accept-language": acceptLanguage } : {},
      }),
    }),
    getHandler: () => handler,
    getClass: () => controller,
  } as any;
}

function createMockHandler(data: any) {
  return { handle: () => of(data) } as any;
}

describe("SkipTranslation decorator", () => {
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

  it("should resolve translations on normal routes", async () => {
    const entity = new TestProduct();
    entity.name = { en: "Hello", ar: "مرحبا" };
    entity.slug = "hello";

    const context = createMockContext(
      "ar",
      ProductController.prototype.findAll,
      ProductController,
    );

    const result = await new Promise<any>((resolve) => {
      service.runWithLocale("ar", () => {
        firstValueFrom(
          interceptor.intercept(context, createMockHandler(entity)),
        ).then(resolve);
      });
    });

    expect(result.name).toBe("مرحبا");
  });

  it("should skip resolution when @SkipTranslation() is on the route handler", async () => {
    const entity = new TestProduct();
    entity.name = { en: "Hello", ar: "مرحبا" };
    entity.slug = "hello";

    const context = createMockContext(
      "ar",
      ProductController.prototype.findAllAdmin,
      ProductController,
    );

    const result = await new Promise<any>((resolve) => {
      service.runWithLocale("ar", () => {
        firstValueFrom(
          interceptor.intercept(context, createMockHandler(entity)),
        ).then(resolve);
      });
    });

    // Full JSON returned, not resolved
    expect(result.name).toEqual({ en: "Hello", ar: "مرحبا" });
    expect(result.slug).toBe("hello");
  });

  it("should skip resolution when @SkipTranslation() is on the controller class", async () => {
    const entity = new TestProduct();
    entity.name = { en: "Hello", ar: "مرحبا" };
    entity.slug = "hello";

    const context = createMockContext(
      "ar",
      AdminController.prototype.findAll,
      AdminController,
    );

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

  it("should return arrays untouched when skipped", async () => {
    const entity = new TestProduct();
    entity.name = { en: "Hello", ar: "مرحبا" };

    const context = createMockContext(
      "ar",
      ProductController.prototype.findAllAdmin,
      ProductController,
    );

    const result = await new Promise<any>((resolve) => {
      service.runWithLocale("ar", () => {
        firstValueFrom(
          interceptor.intercept(context, createMockHandler([entity])),
        ).then(resolve);
      });
    });

    expect(result[0].name).toEqual({ en: "Hello", ar: "مرحبا" });
  });
});
