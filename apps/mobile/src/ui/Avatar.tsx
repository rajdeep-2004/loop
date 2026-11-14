import { StyleSheet, View } from 'react-native';
import { BORDER, NEUTRAL_SCHOOL_COLOR, colors } from './theme';
import { RemoteImage } from './RemoteImage';
import { Txt } from './Txt';

type Props = { name: string; avatarUrl?: string | null; color?: string | null; size?: number; online?: boolean };

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

/** Square avatar. Falls back to initials on the student's school color. */
export function Avatar({ name, avatarUrl, color, size = 48, online }: Props) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.frame, { backgroundColor: color ?? NEUTRAL_SCHOOL_COLOR }]}>
        {avatarUrl ? (
          <RemoteImage path={avatarUrl} style={styles.image} accessibilityLabel={`${name}'s picture`} />
        ) : (
          <Txt variant={size >= 64 ? 'title' : 'label'}>{initials(name)}</Txt>
        )}
      </View>
      {online ? <View style={styles.dot} accessibilityLabel="Online" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    borderWidth: BORDER,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  dot: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 14,
    height: 14,
    backgroundColor: colors.mint,
    borderWidth: 2,
    borderColor: colors.ink,
  },
});
