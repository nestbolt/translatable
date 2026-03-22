export class TranslationHasBeenSetEvent {
  constructor(
    public readonly entity: any,
    public readonly key: string,
    public readonly locale: string,
    public readonly oldValue: string | null,
    public readonly newValue: string | null,
  ) {}
}
