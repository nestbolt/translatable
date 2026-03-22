import { DynamicModule, Module } from '@nestjs/common';
import { TRANSLATABLE_OPTIONS } from './translatable.constants';
import {
  TranslatableModuleOptions,
  TranslatableAsyncOptions,
} from './interfaces';
import { TranslatableService } from './translatable.service';
import { TranslatableSubscriber } from './translatable.subscriber';
import { IsTranslationsConstraint } from './validators';

@Module({})
export class TranslatableModule {
  static forRoot(
    options: TranslatableModuleOptions = {},
  ): DynamicModule {
    return {
      module: TranslatableModule,
      global: true,
      providers: [
        { provide: TRANSLATABLE_OPTIONS, useValue: options },
        TranslatableService,
        TranslatableSubscriber,
        IsTranslationsConstraint,
      ],
      exports: [
        TranslatableService,
        TranslatableSubscriber,
        IsTranslationsConstraint,
      ],
    };
  }

  static forRootAsync(options: TranslatableAsyncOptions): DynamicModule {
    return {
      module: TranslatableModule,
      global: true,
      imports: options.imports ?? [],
      providers: [
        {
          provide: TRANSLATABLE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        TranslatableService,
        TranslatableSubscriber,
        IsTranslationsConstraint,
      ],
      exports: [
        TranslatableService,
        TranslatableSubscriber,
        IsTranslationsConstraint,
      ],
    };
  }
}
