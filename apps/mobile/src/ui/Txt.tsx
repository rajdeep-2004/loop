import { Text, type TextProps, type TextStyle } from 'react-native';
import { colors, fonts } from './theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'small' | 'label';

const styles: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 44, lineHeight: 46, letterSpacing: -1, textTransform: 'uppercase' },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, textTransform: 'uppercase' },
  heading: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 14, letterSpacing: 1.2, textTransform: 'uppercase' },
};

export type TxtProps = TextProps & { variant?: Variant; color?: string };

export function Txt({ variant = 'body', color = colors.ink, style, ...rest }: TxtProps) {
  return <Text {...rest} style={[styles[variant], { color }, style]} />;
}
