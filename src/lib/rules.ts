/**
 * Business rules shared by the app: plain constants, no import, so that any layer can use
 * them (catalogue, repositories, screens) without loading anything else.
 */

/** Steps needed to reveal one pixel, that is one cell of an image (R1). */
export const STEPS_PER_PIXEL = 100

/** Reset times the user can pick (R4), `HH:MM`: from 00:00 to 23:30, every 30 minutes. */
export const RESET_TIMES: readonly string[] = Array.from({ length: 48 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, '0')
  return `${hours}:${index % 2 === 0 ? '00' : '30'}`
})

/** Shortest password accepted for an account (#33), checked by the app before the sign-up is sent. */
export const PASSWORD_MIN_LENGTH = 8
