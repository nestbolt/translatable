# Changelog

All notable changes to `@nestbolt/translatable` will be documented in this file.

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
