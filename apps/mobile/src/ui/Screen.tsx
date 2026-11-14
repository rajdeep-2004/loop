import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, space } from './theme';

type Props = { children: ReactNode; scroll?: boolean; padded?: boolean; edges?: Edge[]; color?: string };

/** Page wrapper: safe area, paper background, optional scrolling that stays clear of the keyboard. */
export function Screen({ children, scroll = false, padded = true, edges = ['top', 'left', 'right'], color = colors.paper }: Props) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[padded && styles.padded, styles.scrollContent]}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, padded && styles.padded]}>{children}</View>
  );
  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: color }]}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  padded: { padding: space.lg },
  scrollContent: { gap: space.lg, paddingBottom: space.xxl },
});
