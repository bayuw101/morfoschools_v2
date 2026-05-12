export function fieldError(errors: Record<string, string> | undefined, ...names: string[]) {
  return names.map((name) => errors?.[name]).find(Boolean);
}
