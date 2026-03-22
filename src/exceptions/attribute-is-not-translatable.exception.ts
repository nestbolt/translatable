export class AttributeIsNotTranslatableException extends Error {
  constructor(key: string, translatableAttributes: string[]) {
    super(
      `Cannot translate attribute "${key}" as it's not one of the translatable attributes: ${translatableAttributes.join(', ')}`,
    );
    this.name = 'AttributeIsNotTranslatableException';
  }
}
