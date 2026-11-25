/**
 * Converts the pixel art PNGs into the JSON the app draws (issue #18).
 *
 * Run with `pnpm images:convert`: every PNG of `assets/images/pixel-art/` gives a
 * JSON with the same name in `src/data/images/`, with the image number read from the file name. A PNG that breaks a rule (file
 * name, size, transparency, number of colors) or cannot be read is refused with a message.
 * The drawing rules themselves are in `pixel-image.ts`, tested with Jest.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PNG } from 'pngjs'

// The .ts extension is required by Node, which runs this file without a build step
import { convertImage, formatImage } from './pixel-image.ts'

const SOURCE_DIR = 'assets/images/pixel-art'
const OUTPUT_DIR = 'src/data/images'

/** `<two-digit number>-<name>.png`, for example `01-champignon.png`. */
const FILE_NAME = /^\d{2}-[a-z0-9-]+\.png$/i

function main() {
  const files = readdirSync(SOURCE_DIR)
    .filter((file) => file.toLowerCase().endsWith('.png'))
    .sort()
  let refused = 0
  mkdirSync(OUTPUT_DIR, { recursive: true })

  for (const file of files) {
    const errors = convertFile(file)

    if (errors.length > 0) {
      refused++
      for (const error of errors) console.error(`✗ ${file}: ${error}`)
    }
  }

  // A JSON whose PNG was renamed or deleted is not removed: warn, so it is not imported by mistake
  const names = new Set(files.map(withoutExtension))
  for (const json of readdirSync(OUTPUT_DIR).filter((file) => file.endsWith('.json'))) {
    if (!names.has(withoutExtension(json))) console.warn(`! ${join(OUTPUT_DIR, json)} has no PNG in ${SOURCE_DIR}`)
  }

  console.log(`${files.length - refused} converted, ${refused} refused`)
  if (refused > 0) process.exitCode = 1
}

/** Converts one PNG of `SOURCE_DIR` and writes its JSON. Returns the broken rules, empty when it is written. */
function convertFile(file: string): string[] {
  if (!FILE_NAME.test(file)) return ['name must be <two-digit number>-<name>.png, for example 01-champignon.png']

  let png: PNG
  try {
    png = PNG.sync.read(readFileSync(join(SOURCE_DIR, file)))
  } catch (error) {
    return [`not a readable PNG (${error instanceof Error ? error.message : String(error)})`]
  }

  // The file name is the only place the number is written: the catalogue reads it from the JSON
  const number = Number(file.slice(0, 2))
  const result = convertImage(png, { smallAllowed: number === 1 })
  if ('errors' in result) return result.errors

  const output = join(OUTPUT_DIR, `${withoutExtension(file)}.json`)
  writeFileSync(output, formatImage({ number, ...result.image }))
  console.log(`✓ ${file} → ${output} (${result.image.width} × ${result.image.height}, ${result.image.palette.length} colors)`)
  return []
}

/** `01-champignon.PNG` → `01-champignon`, whatever the case of the extension. */
function withoutExtension(file: string): string {
  return file.replace(/\.(png|json)$/i, '')
}

main()
