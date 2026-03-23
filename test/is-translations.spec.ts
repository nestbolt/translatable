import { describe, it, expect } from "vitest";
import "reflect-metadata";
import { validate } from "class-validator";
import { IsTranslations } from "../src/decorators/is-translations.decorator";
import { IsTranslationsConstraint } from "../src/validators/is-translations.constraint";

class BasicDto {
  @IsTranslations()
  name!: Record<string, string>;
}

class RequiredLocalesDto {
  @IsTranslations({ requiredLocales: ["en"] })
  name!: Record<string, string>;
}

class MultiRequiredDto {
  @IsTranslations({ requiredLocales: ["en", "ar"] })
  name!: Record<string, string>;
}

class CustomMessageDto {
  @IsTranslations(undefined, { message: "Invalid translations format" })
  name!: Record<string, string>;
}

describe("IsTranslations decorator", () => {
  describe("basic validation", () => {
    it("should pass for valid translation map", async () => {
      const dto = new BasicDto();
      dto.name = { en: "Hello", fr: "Bonjour" };
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass for empty object", async () => {
      const dto = new BasicDto();
      dto.name = {};
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass for null values in map", async () => {
      const dto = new BasicDto();
      dto.name = { en: "Hello", fr: null } as any;
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should fail for string value", async () => {
      const dto = new BasicDto();
      (dto as any).name = "just a string";
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });

    it("should fail for array value", async () => {
      const dto = new BasicDto();
      (dto as any).name = ["en", "fr"];
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });

    it("should fail for null value", async () => {
      const dto = new BasicDto();
      (dto as any).name = null;
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });

    it("should fail for number value", async () => {
      const dto = new BasicDto();
      (dto as any).name = 42;
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });

    it("should fail when value contains non-string values", async () => {
      const dto = new BasicDto();
      (dto as any).name = { en: "Hello", fr: 123 };
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });
  });

  describe("required locales", () => {
    it("should pass when required locale is present", async () => {
      const dto = new RequiredLocalesDto();
      dto.name = { en: "Hello" };
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should fail when required locale is missing", async () => {
      const dto = new RequiredLocalesDto();
      dto.name = { fr: "Bonjour" };
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });

    it("should fail when required locale has empty string", async () => {
      const dto = new RequiredLocalesDto();
      dto.name = { en: "" };
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });

    it("should fail when required locale has null value", async () => {
      const dto = new RequiredLocalesDto();
      dto.name = { en: null } as any;
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });

    it("should validate multiple required locales", async () => {
      const dto = new MultiRequiredDto();
      dto.name = { en: "Hello", ar: "مرحبا" };
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should fail when one of multiple required locales is missing", async () => {
      const dto = new MultiRequiredDto();
      dto.name = { en: "Hello" };
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });
  });

  describe("custom message", () => {
    it("should use custom validation message", async () => {
      const dto = new CustomMessageDto();
      (dto as any).name = "invalid";
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toBeDefined();
      const constraints = errors[0].constraints ?? {};
      const message = Object.values(constraints)[0];
      expect(message).toBe("Invalid translations format");
    });
  });

  describe("IsTranslationsConstraint standalone", () => {
    it("should validate without service injection", () => {
      const constraint = new IsTranslationsConstraint();
      expect(constraint.validate({ en: "Hello" })).toBe(true);
      expect(constraint.validate("invalid")).toBe(false);
    });

    it("should return default message", () => {
      const constraint = new IsTranslationsConstraint();
      expect(constraint.defaultMessage()).toContain("valid translation map");
    });

    it("should return message with required locales when specified", () => {
      const constraint = new IsTranslationsConstraint();
      const args = {
        constraints: [{ requiredLocales: ["en", "ar"] }],
      } as any;
      const message = constraint.defaultMessage(args);
      expect(message).toContain("required locales");
      expect(message).toContain("en");
      expect(message).toContain("ar");
    });
  });
});
