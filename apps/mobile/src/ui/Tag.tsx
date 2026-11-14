import { Pressable, StyleSheet, View } from 'react-native';
import { colors, space } from './theme';
import { Txt } from './Txt';

type TagProps = { label: string; color?: string };

/** Small bordered label. Used for skills, interests, roles and audiences. */
export function Tag({ label, color = colors.white }: TagProps) {
  return (
    <View style={[styles.tag, { backgroundColor: color }]}>
      <Txt variant="label">{label}</Txt>
    </View>
  );
}

type ChoiceProps = { label: string; selected: boolean; onPress: () => void; color?: string };

/** A tag you can select. Used for pickers such as school, year and audience. */
export function Choice({ label, selected, onPress, color = colors.yellow }: ChoiceProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[styles.choice, { backgroundColor: selected ? color : colors.white }]}>
      <Txt variant="label">{label}</Txt>
    </Pressable>
  );
}

export function TagRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  tag: { borderWidth: 2, borderColor: colors.ink, paddingHorizontal: space.sm, paddingVertical: space.xs },
  choice: {
    borderWidth: 3,
    borderColor: colors.ink,
    paddingHorizontal: space.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
