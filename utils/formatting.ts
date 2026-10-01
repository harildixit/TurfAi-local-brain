
export const normalizeName = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '') // Remove country codes like (IRE)
    .trim();
};
