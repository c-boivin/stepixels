import { formatDistance } from '~/data/adapters/home.adapters'
import { imageFactAdapter } from '~/data/adapters/facts.adapters'
import { i18n } from '~/lib/i18n'

import type { HomeCarouselItemParams } from '~/components/views/Home/HomeCarousel'
import type { HomeFinishedModalParams } from '~/components/views/Home/HomeFinishedModal'
import type { CatalogueImage } from '~/data/images/catalogue'
import type { ImageProgress } from '~/lib/progress'

// French thousands separator: 25600 → "25 600"
const COUNT_FORMAT = new Intl.NumberFormat('fr-FR')

/** One image of the home carousel, ready to display: title, tag, steps and the label read by the screen reader. */
export function imageCardAdapter({ image, revealed, state }: ImageProgress<CatalogueImage>): HomeCarouselItemParams {
  const title = i18n.t('home.image.title', {
    number: String(image.number).padStart(2, '0'),
    name: i18n.t(`${image.textKey}.name`),
  })
  const steps = COUNT_FORMAT.format(image.steps)

  return {
    number: image.number,
    width: image.width,
    height: image.height,
    palette: image.palette,
    cells: image.cells,
    // nothing of the locked image is shown: only its dots, under the padlock
    revealed,
    state,
    title,
    tag: state === 'locked' ? null : i18n.t(`home.image.tag.${state}`),
    steps: state === 'finished' ? steps : null,
    fact: state === 'finished' ? imageFactAdapter(image.steps) : null,
    summary:
      state === 'locked'
        ? i18n.t('home.image.summary.locked', { title })
        : state === 'finished'
          ? i18n.t('home.image.summary.finished', { title, steps })
          : i18n.t('home.image.summary.in_progress', {
              title,
              count: revealed,
              revealed: COUNT_FORMAT.format(revealed),
              total: COUNT_FORMAT.format(image.cells.length),
            }),
  }
}

export interface ImageFinishedRaw {
  image: CatalogueImage
  /** Game days with a validation of this image (OQ-14). */
  days: number
  /** Number of the image `SUIVANT` unlocks; `null` for the last image of the catalogue. */
  next: number | null
}

/** The "image finished" modal (#31): the whole image, its name, and steps · days · km. */
export function imageFinishedAdapter({ image, days, next }: ImageFinishedRaw): HomeFinishedModalParams {
  return {
    width: image.width,
    height: image.height,
    palette: image.palette,
    cells: image.cells,
    // the original image, every cell revealed (OQ-3)
    revealed: image.cells.length,
    name: i18n.t(`${image.textKey}.name`),
    summary: i18n.t('home.finished_modal.summary', {
      steps: COUNT_FORMAT.format(image.steps),
      days: i18n.t('home.finished_modal.days', { count: days }),
      distance: formatDistance(image.steps),
    }),
    next,
  }
}
