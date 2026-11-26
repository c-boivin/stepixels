import type { HomeDayParams } from '~/components/views/Home'
import type { StepsAccess } from '~/lib/steps'

// French thousands separator: 1230 → "1 230"
const COUNT_FORMAT = new Intl.NumberFormat('fr-FR')

export interface HomeDayRaw {
  /** Access to the phone's steps: when it is not `granted`, the steps are `null`. */
  stepsAccess: StepsAccess
  /** Steps walked since the last validation, in the current day; `null` when they cannot be read. */
  stepsToValidate: number | null
  /** Unvalidated steps of the previous day, `null` when there is no loss to show. */
  lostSteps: number | null
  nextReset: Date
}

/** The day shown on the home screen (counter, "DOMMAGE", countdown), ready to display. */
export function homeDayAdapter({ stepsAccess, stepsToValidate, lostSteps, nextReset }: HomeDayRaw): HomeDayParams {
  return {
    stepsAccess,
    // the big counter has no thousands separator, as in the design (`4230`)
    counter: stepsToValidate === null ? null : String(stepsToValidate),
    lostSteps: lostSteps === null ? null : COUNT_FORMAT.format(lostSteps),
    nextReset,
  }
}
