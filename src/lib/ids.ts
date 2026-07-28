let counter = 0;

/** Kort, kollisjonstrygg id for lokal bruk */
export function uid(prefix = 'id'): string {
  counter = (counter + 1) % 1000;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}
