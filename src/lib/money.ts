/**
 * Exact money helpers.
 *
 * Financial arithmetic must not drift from binary floating point. We compute in
 * integer minor units (paise for INR, cents for USD) and only convert back to a
 * decimal for display/storage. Keep all sums in minor units; call `toMajor`
 * only at the edge.
 */

export const MINOR_PER_MAJOR = 100;

/** Round a major-unit amount to the nearest minor unit, returning minor units (integer). */
export function toMinor(amount: number): number {
  return Math.round(amount * MINOR_PER_MAJOR);
}

/** Convert integer minor units back to a major-unit decimal (2 dp). */
export function toMajor(minor: number): number {
  return Math.round(minor) / MINOR_PER_MAJOR;
}

/**
 * Sum a list of major-unit line amounts exactly in minor units and return the
 * major-unit total. Avoids the float drift you get from adding `0.1 + 0.2`.
 */
export function sumExact(amounts: number[]): number {
  const minor = amounts.reduce<number>((acc, a) => acc + toMinor(a), 0);
  return toMajor(minor);
}

/**
 * Compute tax on a taxable major-unit amount at `ratePct` percent, exactly in
 * minor units, then return the major-unit tax. e.g. taxOn(100, 18) === 18.
 */
export function taxOn(taxable: number, ratePct: number): number {
  const minor = Math.round((toMinor(taxable) * Math.min(Math.max(ratePct, 0), 100)) / 100);
  return toMajor(minor);
}
