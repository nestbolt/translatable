# Changelog

All notable changes to `@nestbolt/translatable` will be documented in this file.

## v0.3.1 — Validation Fixes

### Fixes

- **@IsTranslations()** — Now throws a clear error when applied to symbol-keyed properties instead of silently registering validators that never run
- **IsTranslationsConstraint** — Made stateless by removing instance field; uses local variable in `validate()` to be safe as a singleton

## v0.3.0 — Completeness Helpers & Skip Translation

### Features

- **Translation Completeness Helpers** — New mixin methods for checking translation coverage
  - `getMissingLocales(key, locales)` — returns locales missing translations for a field
  - `isFullyTranslated(locales)` — checks if all fields have all requested locales
  - `getTranslationCompleteness(locales)` — returns a per-field, per-locale boolean report
- **@SkipTranslation() decorator** — Bypass auto-resolution on specific routes or controllers
  - Apply to a route handler to return full JSON translation maps regardless of `Accept-Language` header
  - Apply to a controller class to skip resolution for all routes in that controller
  - Useful for admin panels and CMS dashboards that need to edit translations

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
