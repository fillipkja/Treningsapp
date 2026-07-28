/**
 * Hjelpere for ruteparametere. expo-router gir `string | string[]` fordi en
 * dyplenke kan inneholde samme parameter flere ganger — [id]-skjermene skal
 * alltid normalisere til den første verdien før den brukes i spørringer.
 */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
