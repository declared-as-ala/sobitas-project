import type { Locale } from '.';

type LocalizedEntity = object | null | undefined;

export function localizedField(
  entity: LocalizedEntity,
  field: string,
  locale: Locale,
  fallback = '',
): string {
  if (!entity) return fallback;
  const values = entity as Record<string, unknown>;
  const localized = values[`${field}_${locale}`];
  const french = values[`${field}_fr`];
  const plain = values[field];
  return String(localized || french || plain || fallback);
}

export function localizedName(entity: LocalizedEntity, locale: Locale, fallback = ''): string {
  if (!entity) return fallback;
  const values = entity as Record<string, unknown>;
  return localizedField(entity, 'designation', locale, String(values.name || fallback));
}
