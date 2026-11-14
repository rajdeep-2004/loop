import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER, colors } from './theme';
import { Txt } from './Txt';

export type TabItem = { key: string; label: string; active: boolean; onPress: () => void; badge?: number };

/** Typographic tab bar: one bordered cell per tab, the active cell filled yellow. No icons. */
export function TabBar({ items }: { items: TabItem[] }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]} accessibilityRole="tablist">
      {items.map((item, index) => (
        <Pressable
          key={item.key}
          onPress={item.onPress}
          accessibilityRole="tab"
          accessibilityLabel={item.badge ? `${item.label}, ${item.badge} new` : item.label}
          accessibilityState={{ selected: item.active }}
          style={[styles.cell, index > 0 && styles.divider, item.active && styles.active]}>
          <Txt variant="label">{item.label}</Txt>
          {item.badge ? (
            <View style={styles.badge}>
              <Txt variant="label" style={styles.badgeText}>
                {item.badge > 99 ? '99+' : item.badge}
              </Txt>
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.white, borderTopWidth: BORDER, borderTopColor: colors.ink },
  cell: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  divider: { borderLeftWidth: BORDER, borderLeftColor: colors.ink },
  active: { backgroundColor: colors.yellow },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    backgroundColor: colors.pink,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12 },
});
