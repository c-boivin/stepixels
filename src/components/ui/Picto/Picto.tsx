import { StyleSheet, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { useColors } from '~/styles/theme'

/**
 * Path of each picto, exported from Figma as SVG: cells of 8 × 8 on a 12 × 12 grid (96 × 96).
 * To add a picto: export it as SVG from Figma and copy the `d` of its path here.
 */
const PICTO_PATHS = {
  heart:
    'M28 24H36V32H28V24ZM36 24H44V32H36V24ZM52 24H60V32H52V24ZM60 24H68V32H60V24ZM20 32H28V40H20V32ZM28 32H36V40H28V32ZM36 32H44V40H36V32ZM44 32H52V40H44V32ZM52 32H60V40H52V32ZM60 32H68V40H60V32ZM68 32H76V40H68V32ZM20 40H28V48H20V40ZM28 40H36V48H28V40ZM36 40H44V48H36V40ZM44 40H52V48H44V40ZM52 40H60V48H52V40ZM60 40H68V48H60V40ZM68 40H76V48H68V40ZM28 48H36V56H28V48ZM36 48H44V56H36V48ZM44 48H52V56H44V48ZM52 48H60V56H52V48ZM60 48H68V56H60V48ZM36 56H44V64H36V56ZM44 56H52V64H44V56ZM52 56H60V64H52V56ZM44 64H52V72H44V64Z',
}

/** Size of a picto box in the design (picto/taille 96). */
const PICTO_SIZE = 96

export type PictoName = keyof typeof PICTO_PATHS

export interface PictoProps {
  name: PictoName
  /** Active pictos are orange; inactive ones are gray at 60% opacity (Figma notes). Default: active. */
  active?: boolean
  /** Side of the square, in points. Default: 96, as in the design. */
  size?: number
}

/** A pixel art picto of the design, colored with the theme. Decorative: hidden from the screen reader. */
export function Picto({ name, active = true, size = PICTO_SIZE }: PictoProps) {
  const colors = useColors()

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={!active && STYLES.inactive}>
      <Svg width={size} height={size} viewBox={`0 0 ${PICTO_SIZE} ${PICTO_SIZE}`}>
        <Path d={PICTO_PATHS[name]} fill={active ? colors.accent : colors.muted} />
      </Svg>
    </View>
  )
}

const STYLES = StyleSheet.create({
  inactive: { opacity: 0.6 },
})
