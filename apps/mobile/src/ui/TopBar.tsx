import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { BORDER, colors, space } from './theme';
import { Txt } from './Txt';

type Props = { title: string; back?: boolean; right?: ReactNode; color?: string };

/** Screen header: optional back key, uppercase title, optional action on the right. */
export function TopBar({ title, back = false, right, color = colors.paper }: Props) {
  return (
    <View style={[styles.bar, { backgroundColor: color }]}>
      {back ? (
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          style={styles.back}>
          <Txt variant="label">←</Txt>
        </Pressable>
      ) : null}
      <Txt variant="title" numberOfLines={1} style={styles.title}>
        {title}
      </Txt>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: BORDER,
    borderBottomColor: colors.ink,
  },
  back: {
    width: 40,
    height: 40,
    borderWidth: BORDER,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1 },
});
