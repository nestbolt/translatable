# Changelog

All notable changes to `@nestbolt/translatable` will be documented in this file.

## v0.2.0 — Automatic Locale Resolution

### Features

- **TranslatableMiddleware** — Reads `Accept-Language` header and sets request-scoped locale via AsyncLocalStorage
- **TranslatableInterceptor** — Auto-resolves translatable fields in API responses based on the current locale
  - With `Accept-Language` header: returns resolved strings (e.g. `"name": "حاسوب محمول"`)
  - Without header: returns full JSON translation maps (e.g. `"name": { "en": "Laptop", "ar": "حاسوب محمول" }`)
  - Handles arrays, nested entities, and paginated wrapper objects
  - Falls back to configured `fallbackLocale` when requested locale is missing

## v0.1.0 — Initial Release

### Features

- **TranslatableMixin** — Mixin function that adds translation methods to any TypeORM entity
- **@Translatable() decorator** — Mark entity properties as translatable via metadata
- **TranslatableService** — Locale state management with AsyncLocalStorage for request-scoped locale
- **TranslatableModule** — NestJS DynamicModule with forRoot/forRootAsync registration
- **TranslatableSubscriber** — TypeORM subscriber for JSON serialization/deserialization
- **@IsTranslations() validator** — class-validator decorator for translation map DTOs
- **Query helpers** — whereTranslation, whereTranslationLike, whereLocale, whereLocales, orderByTranslation (PostgreSQL jsonb)
- **TranslationHasBeenSetEvent** — Event emitted when translations change (requires optional @nestjs/event-emitter)
- **Fallback resolution** — Configurable fallback locale with fallbackAny support
