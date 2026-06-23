export function decodeResourceName(value: unknown): string {
  const name = String(value);

  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}
