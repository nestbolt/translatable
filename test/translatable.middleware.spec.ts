import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "reflect-metadata";
import { Test, TestingModule } from "@nestjs/testing";
import { TranslatableMiddleware } from "../src/middleware/translatable.middleware";
import { TranslatableService } from "../src/translatable.service";
import { TRANSLATABLE_OPTIONS } from "../src/translatable.constants";

function createMockReq(acceptLanguage?: string) {
  return {
    headers: acceptLanguage ? { "accept-language": acceptLanguage } : {},
  } as any;
}

function createMockRes() {
  return {} as any;
}

describe("TranslatableMiddleware", () => {
  let middleware: TranslatableMiddleware;
  let service: TranslatableService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: TRANSLATABLE_OPTIONS,
          useValue: { defaultLocale: "en", fallbackLocale: "en" },
        },
        TranslatableService,
        TranslatableMiddleware,
      ],
    }).compile();

    service = module.get<TranslatableService>(TranslatableService);
    middleware = module.get<TranslatableMiddleware>(TranslatableMiddleware);
    service.onModuleInit();
  });

  afterEach(() => {
    TranslatableService.resetInstance();
  });

  it("should set locale from Accept-Language header", () => {
    const req = createMockReq("ar");
    const res = createMockRes();
    let capturedLocale: string | undefined;

    middleware.use(req, res, () => {
      capturedLocale = service.getLocale();
    });

    expect(capturedLocale).toBe("ar");
  });

  it("should parse first locale from comma-separated header", () => {
    const req = createMockReq("fr,en;q=0.9,ar;q=0.8");
    const res = createMockRes();
    let capturedLocale: string | undefined;

    middleware.use(req, res, () => {
      capturedLocale = service.getLocale();
    });

    expect(capturedLocale).toBe("fr");
  });

  it("should strip quality value from locale", () => {
    const req = createMockReq("en-US;q=0.9");
    const res = createMockRes();
    let capturedLocale: string | undefined;

    middleware.use(req, res, () => {
      capturedLocale = service.getLocale();
    });

    expect(capturedLocale).toBe("en-US");
  });

  it("should use default locale when no Accept-Language header", () => {
    const req = createMockReq();
    const res = createMockRes();
    let capturedLocale: string | undefined;

    middleware.use(req, res, () => {
      capturedLocale = service.getLocale();
    });

    // No runWithLocale called, so it falls back to default
    expect(capturedLocale).toBe("en");
  });

  it("should use default locale when Accept-Language is empty string", () => {
    const req = createMockReq("");
    const res = createMockRes();
    let capturedLocale: string | undefined;

    middleware.use(req, res, () => {
      capturedLocale = service.getLocale();
    });

    expect(capturedLocale).toBe("en");
  });

  it("should call next()", () => {
    const req = createMockReq("ar");
    const res = createMockRes();
    const next = vi.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("should call next() even without header", () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("should restore locale after request completes", () => {
    const req = createMockReq("ar");
    const res = createMockRes();

    middleware.use(req, res, () => {
      expect(service.getLocale()).toBe("ar");
    });

    // Outside the middleware context, back to default
    expect(service.getLocale()).toBe("en");
  });

  it("should handle header with only commas", () => {
    const req = createMockReq(",,,");
    const res = createMockRes();
    let capturedLocale: string | undefined;

    middleware.use(req, res, () => {
      capturedLocale = service.getLocale();
    });

    // Empty after split → falls back to default
    expect(capturedLocale).toBe("en");
  });

  it("should handle header with only semicolons", () => {
    const req = createMockReq(";q=0.9");
    const res = createMockRes();
    let capturedLocale: string | undefined;

    middleware.use(req, res, () => {
      capturedLocale = service.getLocale();
    });

    // Empty locale after splitting on semicolons → falls back to default
    expect(capturedLocale).toBe("en");
  });
});
