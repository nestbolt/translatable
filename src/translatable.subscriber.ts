import { Injectable } from "@nestjs/common";
import "reflect-metadata";
import { EntitySubscriberInterface, InsertEvent, UpdateEvent } from "typeorm";
import { TRANSLATABLE_METADATA_KEY } from "./translatable.constants";

@Injectable()
export class TranslatableSubscriber implements EntitySubscriberInterface {
  afterLoad(entity: any): void {
    this.ensureTranslationMaps(entity);
  }

  beforeInsert(event: InsertEvent<any>): void {
    this.serializeTranslationMaps(event.entity);
  }

  beforeUpdate(event: UpdateEvent<any>): void {
    if (event.entity) {
      this.serializeTranslationMaps(event.entity);
    }
  }

  private getTranslatableFields(entity: any): string[] {
    if (!entity || !entity.constructor) return [];
    return (
      Reflect.getMetadata(TRANSLATABLE_METADATA_KEY, entity.constructor) || []
    );
  }

  private ensureTranslationMaps(entity: any): void {
    const fields = this.getTranslatableFields(entity);
    for (const field of fields) {
      const value = entity[field];
      if (typeof value === "string") {
        try {
          entity[field] = JSON.parse(value);
        } catch {
          entity[field] = {};
        }
      } else if (value == null) {
        entity[field] = {};
      }
    }
  }

  private serializeTranslationMaps(entity: any): void {
    const fields = this.getTranslatableFields(entity);
    for (const field of fields) {
      const value = entity[field];
      if (value != null && typeof value === "object" && !Array.isArray(value)) {
        const cleaned: Record<string, string> = {};
        for (const [locale, text] of Object.entries(value)) {
          if (text != null && text !== "") {
            cleaned[locale] = text as string;
          }
        }
        entity[field] = cleaned;
      }
    }
  }
}
