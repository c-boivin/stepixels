import { i18n } from '~/lib/i18n'

import type { HomeCarouselItemParams } from '~/components/views/Home/HomeCarousel'
import type { CatalogueImage } from '~/data/images/catalogue'
import type { ImageProgress } from '~/lib/progress'

// French thousands separator: 25600 → "25 600"
const COUNT_FORMAT = new Intl.NumberFormat('fr-FR')

/** One image of the home carousel, ready to display: title, tag, steps and the label read by the screen reader. */
export function imageCardAdapter({ image, revealed, state }: ImageProgress<CatalogueImage>): HomeCarouselItemParams {
  const title = i18n.t('home.image.title', {
    number: String(image.number).padStart(2, '0'),
    name: i18n.t(image.nameKey),
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
