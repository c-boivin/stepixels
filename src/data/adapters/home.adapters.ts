import type { HomeDayParams } from '~/components/views/Home'

// French thousands separator: 1230 → "1 230"
const COUNT_FORMAT = new Intl.NumberFormat('fr-FR')

export interface HomeDayRaw {
  /** Steps walked since the last validation, in the current day. */
  stepsToValidate: number
  /** Unvalidated steps of the previous day, `null` when there is no loss to show. */
  lostSteps: number | null
  nextReset: Date
}

/** The day shown on the home screen (counter, "DOMMAGE", countdown), ready to display. */
export function homeDayAdapter({ stepsToValidate, lostSteps, nextReset }: HomeDayRaw): HomeDayParams {
  return {
    // the big counter has no thousands separator, as in the design (`4230`)
    counter: String(stepsToValidate),
    lostSteps: lostSteps === null ? null : COUNT_FORMAT.format(lostSteps),
    nextReset,
  }
}
