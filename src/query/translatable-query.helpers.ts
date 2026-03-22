import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export function whereTranslation<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  column: string,
  locale: string,
  value: string,
  alias?: string,
): SelectQueryBuilder<T> {
  const tableAlias = alias ?? qb.alias;
  const paramKey = `${column}_${locale}_val`.replace(/[^a-zA-Z0-9_]/g, '_');
  return qb.andWhere(
    `"${tableAlias}"."${column}"->>'${locale}' = :${paramKey}`,
    { [paramKey]: value },
  );
}

export function whereTranslationLike<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  column: string,
  locale: string,
  pattern: string,
  alias?: string,
): SelectQueryBuilder<T> {
  const tableAlias = alias ?? qb.alias;
  const paramKey = `${column}_${locale}_like`.replace(/[^a-zA-Z0-9_]/g, '_');
  return qb.andWhere(
    `"${tableAlias}"."${column}"->>'${locale}' ILIKE :${paramKey}`,
    { [paramKey]: pattern },
  );
}

export function whereLocale<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  column: string,
  locale: string,
  alias?: string,
): SelectQueryBuilder<T> {
  const tableAlias = alias ?? qb.alias;
  return qb.andWhere(
    `"${tableAlias}"."${column}"->>'${locale}' IS NOT NULL`,
  );
}

export function whereLocales<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  column: string,
  locales: string[],
  alias?: string,
): SelectQueryBuilder<T> {
  const tableAlias = alias ?? qb.alias;
  const conditions = locales
    .map((l) => `"${tableAlias}"."${column}"->>'${l}' IS NOT NULL`)
    .join(' OR ');
  return qb.andWhere(`(${conditions})`);
}

export function orderByTranslation<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  column: string,
  locale: string,
  order: 'ASC' | 'DESC' = 'ASC',
  alias?: string,
): SelectQueryBuilder<T> {
  const tableAlias = alias ?? qb.alias;
  return qb.addOrderBy(
    `"${tableAlias}"."${column}"->>'${locale}'`,
    order,
  );
}
