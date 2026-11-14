import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Block } from './Block';
import { Button } from './Button';
import { colors, space } from './theme';
import { Txt } from './Txt';

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.ink} size="large" />
      <Txt variant="label">{label}</Txt>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Block color={colors.red} style={styles.box}>
        <Txt variant="label">Something broke</Txt>
        <Txt>{message}</Txt>
      </Block>
      {onRetry ? <Button label="Retry" onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.center}>
      <Txt variant="title" style={styles.centerText}>
        {title}
      </Txt>
      {hint ? (
        <Txt color={colors.gray} style={styles.centerText}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  box: { padding: space.lg, gap: space.xs },
  centerText: { textAlign: 'center' },
});
