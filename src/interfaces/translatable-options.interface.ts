export interface TranslatableModuleOptions {
  defaultLocale?: string;
  fallbackLocale?: string;
  fallbackAny?: boolean;
}

export interface TranslatableAsyncOptions {
  imports?: any[];
  inject?: any[];
  useFactory: (
    ...args: any[]
  ) => Promise<TranslatableModuleOptions> | TranslatableModuleOptions;
}
