import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BORDER, SHADOW, TOUCH, colors, space } from './theme';
import { Txt } from './Txt';

type Props = {
  label: string;
  onPress: () => void;
  color?: string;
  /** Shows a spinner and blocks presses, so a slow request cannot be submitted twice. */
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Button({ label, onPress, color = colors.yellow, loading = false, disabled = false, small = false, style, testID }: Props) {
  const blocked = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      testID={testID}
      style={[styles.room, style]}>
      {({ pressed }) => (
        <>
          <View style={styles.shadow} />
          <View
            style={[
              styles.face,
              small && styles.small,
              { backgroundColor: color },
              pressed && styles.pressed,
              disabled && styles.disabled,
            ]}>
            {loading ? <ActivityIndicator color={colors.ink} /> : <Txt variant="label">{label}</Txt>}
          </View>
        </>
      )}
    </Pressable>
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
  face: {
    minHeight: TOUCH,
    paddingHorizontal: space.lg,
    borderWidth: BORDER,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { minHeight: 36, paddingHorizontal: space.md },
  pressed: { transform: [{ translateX: SHADOW }, { translateY: SHADOW }] },
  disabled: { opacity: 0.45 },
});
