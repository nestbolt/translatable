<p align="center">
    <h1 align="center">@nestbolt/translatable</h1>
    <p align="center">JSON-based model translations for NestJS + TypeORM with locale-aware getters, fallback resolution, and query helpers.</p>
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@nestbolt/translatable"><img src="https://img.shields.io/npm/v/@nestbolt/translatable.svg?style=flat-square" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/@nestbolt/translatable"><img src="https://img.shields.io/npm/dt/@nestbolt/translatable.svg?style=flat-square" alt="npm downloads"></a>
    <a href="https://github.com/nestbolt/translatable/actions"><img src="https://img.shields.io/github/actions/workflow/status/nestbolt/translatable/tests.yml?branch=main&style=flat-square&label=tests" alt="tests"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square" alt="license"></a>
</p>

<hr>

This package provides **automatic locale-aware API responses** for [NestJS](https://nestjs.com) + TypeORM. Translations are stored as JSON objects in your database columns — no separate translations table needed.

Send an `Accept-Language` header and your API returns resolved strings automatically:

```
GET /products/1
Accept-Language: ar

→ { "name": "حاسوب محمول", "slug": "laptop" }
```

No header? You get the full translation map:

```
GET /products/1

→ { "name": { "en": "Laptop", "ar": "حاسوب محمول" }, "slug": "laptop" }
```

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Automatic Locale Resolution (Middleware + Interceptor)](#automatic-locale-resolution-middleware--interceptor)
- [Module Configuration](#module-configuration)
  - [Static Configuration (forRoot)](#static-configuration-forroot)
  - [Async Configuration (forRootAsync)](#async-configuration-forrootasync)
- [Using the Mixin](#using-the-mixin)
- [Translation Methods](#translation-methods)
- [Translation Completeness](#translation-completeness)
- [Skip Translation (Admin Routes)](#skip-translation-admin-routes)
- [Using the Service Directly](#using-the-service-directly)
- [Validation](#validation)
- [Query Helpers](#query-helpers)
- [Events](#events)
- [Configuration Options](#configuration-options)
- [Standalone Usage](#standalone-usage)
- [Testing](#testing)
- [Changelog](#changelog)
- [Contributing](#contributing)
- [Security](#security)
- [Credits](#credits)
- [License](#license)

## Installation

Install the package via npm:

```bash
npm install @nestbolt/translatable
```

Or via yarn:

```bash
yarn add @nestbolt/translatable
```

Or via pnpm:

```bash
pnpm add @nestbolt/translatable
```

### Peer Dependencies

This package requires the following peer dependencies, which you likely already have in a NestJS + TypeORM project:

```
@nestjs/common    ^10.0.0 || ^11.0.0
@nestjs/core      ^10.0.0 || ^11.0.0
class-validator   ^0.14.0
class-transformer ^0.5.0
reflect-metadata  ^0.1.13 || ^0.2.0
typeorm           ^0.3.0
```

**Optional:** Install `@nestjs/event-emitter` to enable translation change events.

## Quick Start

**1. Register the module in your `AppModule`:**

```typescript
import { TranslatableModule } from "@nestbolt/translatable";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      /* ... */
    }),
    TranslatableModule.forRoot({
      defaultLocale: "en",
      fallbackLocales: ["en"],
    }),
  ],
})
export class AppModule {}
```

**2. Create a translatable entity:**

```typescript
import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";
import { TranslatableMixin, Translatable } from "@nestbolt/translatable";

@Entity()
export class NewsItem extends TranslatableMixin(BaseEntity) {
  @PrimaryGeneratedColumn()
  id: number;

  @Translatable()
  @Column({ type: "jsonb", default: {} })
  name: Record<string, string>;

  @Translatable()
  @Column({ type: "jsonb", default: {} })
  description: Record<string, string>;

  @Column()
  slug: string;
}
```

**3. Use it in your service:**

```typescript
const item = new NewsItem();
item
  .setTranslation("name", "en", "Breaking News")
  .setTranslation("name", "ar", "أخبار عاجلة")
  .setTranslation("name", "fr", "Dernières nouvelles");
item.slug = "breaking-news";

await repo.save(item);

// Get a translation
item.getTranslation("name", "en"); // 'Breaking News'
item.getTranslation("name", "ar"); // 'أخبار عاجلة'

// Get all translations
item.getTranslations("name");
// { en: 'Breaking News', ar: 'أخبار عاجلة', fr: 'Dernières nouvelles' }

// Get available locales
item.locales(); // ['en', 'ar', 'fr']
```

## Automatic Locale Resolution (Middleware + Interceptor)

The recommended way to use this package is with the built-in `TranslatableMiddleware` and `TranslatableInterceptor`. This gives you automatic locale-aware API responses with zero boilerplate in your controllers.

### How it works

1. **`TranslatableMiddleware`** reads the `Accept-Language` header and sets the locale for the request via `AsyncLocalStorage`
2. **`TranslatableInterceptor`** (already registered globally by the module) auto-resolves translatable fields in your API responses

**With `Accept-Language` header** — translatable fields are resolved to a single string in the requested locale:

```json
// GET /products/1 — Accept-Language: ar
{ "id": 1, "name": "حاسوب محمول", "slug": "laptop" }
```

**Without `Accept-Language` header** — translatable fields return the full JSON translation map:

```json
// GET /products/1 — no Accept-Language header
{ "id": 1, "name": { "en": "Laptop", "ar": "حاسوب محمول" }, "slug": "laptop" }
```

### Setup

**1. Apply the middleware in your `AppModule`:**

```typescript
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import {
  TranslatableModule,
  TranslatableMiddleware,
} from "@nestbolt/translatable";

@Module({
  imports: [
    TranslatableModule.forRoot({
      defaultLocale: "en",
      fallbackLocales: ["en"],
    }),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TranslatableMiddleware).forRoutes("*");
  }
}
```

That's it! The `TranslatableInterceptor` is automatically registered as a global provider by `TranslatableModule`. Your controllers need no changes:

```typescript
@Controller("products")
export class ProductController {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  @Get()
  findAll() {
    return this.repo.find();
  }

  @Get(":id")
  findOne(@Param("id") id: number) {
    return this.repo.findOneBy({ id });
  }
}
```

### Fallback Behavior

When the requested locale is missing for a field, the system tries each locale in the `fallbackLocales` chain in order:

```typescript
TranslatableModule.forRoot({
  fallbackLocales: ['en', 'fr', 'ar'],  // tries each in order
})

// Request 'de', entity has { fr: 'Bonjour', ar: 'مرحبا' }
entity.getTranslation('name', 'de'); // 'Bonjour' — skipped 'en', found 'fr'
```

Resolution order:
1. The requested locale
2. Each locale in `fallbackLocales` in order (default: `['en']`)
3. Any available locale (if `fallbackAny: true` is configured)
4. `null` if no translation is found

### Wrapped Responses

The interceptor handles nested structures automatically:

```typescript
// Paginated response
@Get()
async findAll() {
  const [data, total] = await this.repo.findAndCount();
  return { data, total };
}

// With Accept-Language: ar →
// { "data": [{ "name": "حاسوب محمول", ... }], "total": 5 }
```

## Module Configuration

### Static Configuration (forRoot)

```typescript
TranslatableModule.forRoot({
  defaultLocale: "en",
  fallbackLocales: ["en", "fr", "ar"],
  fallbackAny: false,
});
```

### Async Configuration (forRootAsync)

```typescript
TranslatableModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    defaultLocale: config.get("DEFAULT_LOCALE"),
    fallbackLocales: config.get("FALLBACK_LOCALES"),
  }),
  inject: [ConfigService],
});
```

> The module is registered as **global** — you don't need to import it in every module.

## Using the Mixin

`TranslatableMixin` is a function that extends any base class with translation methods:

```typescript
// Extend BaseEntity
class Product extends TranslatableMixin(BaseEntity) {
  /* ... */
}

// Extend a plain class
class Product extends TranslatableMixin(class {}) {
  /* ... */
}
```

## Translation Methods

| Method                                       | Returns                                            | Description                          |
| -------------------------------------------- | -------------------------------------------------- | ------------------------------------ |
| `setTranslation(key, locale, value)`         | `this`                                             | Set a translation (chainable)        |
| `setTranslations(key, translations)`         | `this`                                             | Set multiple translations at once    |
| `getTranslation(key, locale?, useFallback?)` | `string \| null`                                   | Get translation for a locale         |
| `getTranslations(key?, allowedLocales?)`     | `TranslationMap \| Record<string, TranslationMap>` | Get all translations                 |
| `forgetTranslation(key, locale)`             | `this`                                             | Remove a translation                 |
| `forgetAllTranslations(locale)`              | `this`                                             | Remove a locale across all fields    |
| `replaceTranslations(key, translations)`     | `this`                                             | Replace all translations for a field |
| `hasTranslation(key, locale?)`               | `boolean`                                          | Check if a translation exists        |
| `getTranslatedLocales(key)`                  | `string[]`                                         | Get locales with translations        |
| `locales()`                                  | `string[]`                                         | Get all locales across all fields    |
| `isTranslatableAttribute(key)`               | `boolean`                                          | Check if a field is translatable     |
| `getTranslatableAttributes()`                | `string[]`                                         | Get all translatable field names     |
| `getMissingLocales(key, locales)`            | `string[]`                                         | Get locales missing for a field      |
| `isFullyTranslated(locales)`                 | `boolean`                                          | Check all fields have all locales    |
| `getTranslationCompleteness(locales)`        | `Record<string, Record<string, boolean>>`          | Completeness report per field/locale |

## Translation Completeness

Check which locales are missing translations — useful for admin dashboards and CI checks:

```typescript
const item = new NewsItem();
item
  .setTranslation("name", "en", "Hello")
  .setTranslation("name", "ar", "مرحبا")
  .setTranslation("description", "en", "A greeting");

// What's missing for a specific field?
item.getMissingLocales("name", ["en", "ar", "fr"]); // ['fr']

// Are all fields fully translated?
item.isFullyTranslated(["en", "ar"]); // false (description missing 'ar')

// Get a full report
item.getTranslationCompleteness(["en", "ar", "fr"]);
// {
//   name:        { en: true, ar: true,  fr: false },
//   description: { en: true, ar: false, fr: false }
// }
```

## Skip Translation (Admin Routes)

Use `@SkipTranslation()` to bypass auto-resolution on specific routes. This is useful for admin panels that need the full JSON translation map for editing:

```typescript
import { SkipTranslation } from "@nestbolt/translatable";

@Controller("products")
export class ProductController {
  @Get()
  findAll() {
    return this.repo.find();
    // With Accept-Language: ar → { "name": "حاسوب محمول" }
  }

  @SkipTranslation()
  @Get("admin")
  findAllAdmin() {
    return this.repo.find();
    // Always returns full JSON → { "name": { "en": "Laptop", "ar": "حاسوب محمول" } }
  }
}
```

You can also apply it to an entire controller:

```typescript
@SkipTranslation()
@Controller("admin/products")
export class AdminProductController {
  @Get()
  findAll() {
    return this.repo.find();
    // Always returns full JSON, regardless of Accept-Language header
  }
}
```

## Using the Service Directly

```typescript
import { TranslatableService } from "@nestbolt/translatable";

@Injectable()
export class MyService {
  constructor(private translatableService: TranslatableService) {}

  doSomething() {
    const locale = this.translatableService.getLocale();
    const fallback = this.translatableService.getFallbackLocale();
  }
}
```

| Method                                             | Returns  | Description                                            |
| -------------------------------------------------- | -------- | ------------------------------------------------------ |
| `getLocale()`                                      | `string` | Get current locale (from AsyncLocalStorage or default) |
| `getDefaultLocale()`                               | `string` | Get configured default locale                          |
| `getFallbackLocale()`                              | `string`   | Get first fallback locale (backward compat)            |
| `getFallbackLocales()`                             | `string[]` | Get the full fallback locale chain                     |
| `runWithLocale(locale, fn)`                        | `T`      | Execute a function with a specific locale context      |
| `resolveLocale(requested, available, useFallback)` | `string` | Resolve the best locale to use                         |

## Validation

Use the `@IsTranslations()` decorator to validate translation map DTOs:

```typescript
import { IsTranslations } from "@nestbolt/translatable";

class CreateNewsDto {
  @IsTranslations({ requiredLocales: ["en"] })
  name: Record<string, string>;

  @IsTranslations()
  description: Record<string, string>;
}
```

Validation rules:

- Value must be a plain object
- All values must be strings (or null)
- Required locales must be present and non-empty

## Query Helpers

PostgreSQL jsonb query helpers for TypeORM `SelectQueryBuilder`:

```typescript
import {
  whereTranslation,
  whereTranslationLike,
  whereLocale,
  whereLocales,
  orderByTranslation,
} from "@nestbolt/translatable";

const qb = repo.createQueryBuilder("news");

// Filter by exact translation value
whereTranslation(qb, "name", "en", "Breaking News");

// Filter by pattern (ILIKE)
whereTranslationLike(qb, "name", "en", "%breaking%");

// Filter rows that have a translation in a locale
whereLocale(qb, "name", "en");

// Filter rows that have a translation in any of the locales
whereLocales(qb, "name", ["en", "fr"]);

// Order by translation value
orderByTranslation(qb, "name", "en", "ASC");

const results = await qb.getMany();
```

## Events

If `@nestjs/event-emitter` is installed, `TranslationHasBeenSetEvent` is emitted whenever a translation is set:

```typescript
import { OnEvent } from "@nestjs/event-emitter";
import { TranslationHasBeenSetEvent } from "@nestbolt/translatable";

@Injectable()
export class TranslationListener {
  @OnEvent("translatable.translation-set")
  handleTranslationSet(event: TranslationHasBeenSetEvent) {
    console.log(
      `${event.key}[${event.locale}]: ${event.oldValue} -> ${event.newValue}`,
    );
  }
}
```

## Configuration Options

| Option            | Type       | Default            | Description                                                                            |
| ----------------- | ---------- | ------------------ | -------------------------------------------------------------------------------------- |
| `defaultLocale`   | `string`   | `'en'`             | Default locale when none is set                                                        |
| `fallbackLocales` | `string[]` | `[defaultLocale]`  | Ordered list of fallback locales to try when a translation is missing                  |
| `fallbackLocale`  | `string`   | —                  | Shorthand for a single fallback (sets `fallbackLocales: [value]`). Deprecated.         |
| `fallbackAny`     | `boolean`  | `false`            | If true, fall back to any available locale when the chain is exhausted                 |

## Standalone Usage

The mixin works without the module for basic use cases:

```typescript
const entity = new Product();
entity.setTranslation("name", "en", "Laptop");
entity.getTranslation("name", "en"); // 'Laptop'
```

Without `TranslatableModule`, locale resolution defaults to `'en'` and events are not emitted.

## Testing

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:cov
```

## Changelog

Please see [CHANGELOG](CHANGELOG.md) for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md) for details.

## Security

If you discover any security-related issues, please report them via [GitHub Issues](https://github.com/nestbolt/translatable/issues) with the **security** label instead of using the public issue tracker.

## Credits

- [All Contributors](../../contributors)

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
