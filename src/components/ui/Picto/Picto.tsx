import { StyleSheet, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { useColors } from '~/styles/theme'

/**
 * Each picto, exported from Figma as SVG: the `d` of its path, on a square grid of `grid` points
 * (picto/taille 96: cells of 8 × 8 on 12 × 12; the settings gear of the top bar: cells of 2 × 2 on 11 × 11).
 * To add a picto: export it as SVG from Figma, copy the `d` of its path and the size of its viewBox here.
 */
const PICTOS = {
  heart: {
    grid: 96,
    d: 'M28 24H36V32H28V24ZM36 24H44V32H36V24ZM52 24H60V32H52V24ZM60 24H68V32H60V24ZM20 32H28V40H20V32ZM28 32H36V40H28V32ZM36 32H44V40H36V32ZM44 32H52V40H44V32ZM52 32H60V40H52V32ZM60 32H68V40H60V32ZM68 32H76V40H68V32ZM20 40H28V48H20V40ZM28 40H36V48H28V40ZM36 40H44V48H36V40ZM44 40H52V48H44V40ZM52 40H60V48H52V40ZM60 40H68V48H60V40ZM68 40H76V48H68V40ZM28 48H36V56H28V48ZM36 48H44V56H36V48ZM44 48H52V56H44V48ZM52 48H60V56H52V48ZM60 48H68V56H60V48ZM36 56H44V64H36V56ZM44 56H52V64H44V56ZM52 56H60V64H52V56ZM44 64H52V72H44V64Z',
  },
  feet: {
    grid: 96,
    d: 'M16 0H8V8H16V0ZM24 0H16V8H24V0ZM32 0H24V8H32V0ZM8 8H0V16H8V8ZM16 8H8V16H16V8ZM24 8H16V16H24V8ZM32 8H24V16H32V8ZM40 8H32V16H40V8ZM8 16H0V24H8V16ZM16 16H8V24H16V16ZM24 16H16V24H24V16ZM32 16H24V24H32V16ZM40 16H32V24H40V16ZM8 24H0V32H8V24ZM16 24H8V32H16V24ZM24 24H16V32H24V24ZM32 24H24V32H32V24ZM40 24H32V32H40V24ZM16 32H8V40H16V32ZM24 32H16V40H24V32ZM32 32H24V40H32V32ZM16 48H8V56H16V48ZM24 48H16V56H24V48ZM32 48H24V56H32V48ZM16 56H8V64H16V56ZM24 56H16V64H24V56ZM32 56H24V64H32V56ZM72 32H64V40H72V32ZM80 32H72V40H80V32ZM88 32H80V40H88V32ZM64 40H56V48H64V40ZM72 40H64V48H72V40ZM80 40H72V48H80V40ZM88 40H80V48H88V40ZM96 40H88V48H96V40ZM64 48H56V56H64V48ZM72 48H64V56H72V48ZM80 48H72V56H80V48ZM88 48H80V56H88V48ZM96 48H88V56H96V48ZM64 56H56V64H64V56ZM72 56H64V64H72V56ZM80 56H72V64H80V56ZM88 56H80V64H88V56ZM96 56H88V64H96V56ZM72 64H64V72H72V64ZM80 64H72V72H80V64ZM88 64H80V72H88V64ZM72 80H64V88H72V80ZM80 80H72V88H80V80ZM88 80H80V88H88V80ZM72 88H64V96H72V88ZM80 88H72V96H80V88ZM88 88H80V96H88V88Z',
  },
  settings: {
    grid: 22,
    d: 'M8 0H14V2H8V0ZM2 2H6V4H2V2ZM8 2H14V4H8V2ZM16 2H20V4H16V2ZM2 4H20V6H2V4ZM4 6H8V8H4V6ZM14 6H18V8H14V6ZM0 8H6V14H0V8ZM16 8H22V14H16V8ZM4 14H8V16H4V14ZM14 14H18V16H14V14ZM2 16H20V18H2V16ZM2 18H6V20H2V18ZM8 18H14V20H8V18ZM16 18H20V20H16V18ZM8 20H14V22H8V20Z',
  },
}

export type PictoName = keyof typeof PICTOS

export interface PictoProps {
  name: PictoName
  /** Active pictos are orange; inactive ones are gray at 60% opacity (Figma notes). Default: active. */
  active?: boolean
  /** Color of the picto when it is not orange, like the settings gear in the text color. Default: the `active` rule. */
  color?: string
  /** Side of the square, in points. Default: the size of the picto in the design (96, or 22 for the gear). */
  size?: number
}

/** A pixel art picto of the design, colored with the theme. Decorative: hidden from the screen reader. */
export function Picto({ name, active = true, color, size }: PictoProps) {
  const colors = useColors()
  const { grid, d } = PICTOS[name]

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={!active && STYLES.inactive}>
      <Svg width={size ?? grid} height={size ?? grid} viewBox={`0 0 ${grid} ${grid}`}>
        <Path d={d} fill={color ?? (active ? colors.accent : colors.muted)} />
      </Svg>
    </View>
  )
}

const STYLES = StyleSheet.create({
  inactive: { opacity: 0.6 },
})
