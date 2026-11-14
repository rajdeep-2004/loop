/** Design tokens. See DESIGN.md at the repo root. Screens must not hardcode values that live here. */
export const colors = {
  ink: '#0B0B0B',
  paper: '#FFFDF6',
  white: '#FFFFFF',
  yellow: '#FFE14D',
  mint: '#1FE0A0',
  red: '#FF4D4D',
  gray: '#6B6B6B',
  blue: '#3D5AFE',
  violet: '#9B5CFF',
  pink: '#FF3D8B',
  orange: '#FF7A1A',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const BORDER = 3;
export const SHADOW = 4;
export const TOUCH = 48;

export const fonts = {
  display: 'ArchivoBlack_400Regular',
  body: 'Archivo_500Medium',
  bold: 'Archivo_700Bold',
} as const;

/** Color for a student with no school yet (before onboarding). */
export const NEUTRAL_SCHOOL_COLOR = colors.yellow;
