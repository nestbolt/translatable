export interface TranslatableModuleOptions {
  defaultLocale?: string;
  /** @deprecated Use `fallbackLocales` instead. Kept for backward compatibility. */
  fallbackLocale?: string;
  fallbackLocales?: string[];
  fallbackAny?: boolean;
}

export interface TranslatableAsyncOptions {
  imports?: any[];
  inject?: any[];
  useFactory: (
    ...args: any[]
  ) => Promise<TranslatableModuleOptions> | TranslatableModuleOptions;
}
