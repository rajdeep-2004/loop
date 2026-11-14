import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BORDER, SHADOW, colors } from './theme';

type Props = {
  children: ReactNode;
  color?: string;
  /** Draw the hard offset shadow. Flat blocks (no shadow) are used inside other blocks. */
  raised?: boolean;
  style?: StyleProp<ViewStyle>;
  outerStyle?: StyleProp<ViewStyle>;
};

/** A bordered surface sitting on a solid, un-blurred shadow. The basic brutalist building block. */
export function Block({ children, color = colors.white, raised = true, style, outerStyle }: Props) {
  return (
    <View style={[raised && styles.room, outerStyle]}>
      {raised ? <View style={styles.shadow} /> : null}
      <View style={[styles.face, { backgroundColor: color }, style]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  room: { marginRight: SHADOW, marginBottom: SHADOW },
  shadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
    transform: [{ translateX: SHADOW }, { translateY: SHADOW }],
  },
  face: { borderWidth: BORDER, borderColor: colors.ink },
});
