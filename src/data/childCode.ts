export const CHILD_CODE_MAX_LENGTH = 32;

const CHILD_CODE_PATTERN = /^(?=.*\d)[A-Z0-9_-]{3,32}$/;

export function normalizeChildCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, CHILD_CODE_MAX_LENGTH);
}

export function isValidChildCode(value: string): boolean {
  return CHILD_CODE_PATTERN.test(value);
}
