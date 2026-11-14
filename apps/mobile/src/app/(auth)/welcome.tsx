import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Block, Button, Screen, Txt, colors, space } from '@/ui';

const SCHOOL_STRIPES = [colors.blue, colors.violet, colors.pink, colors.orange];

export default function Welcome() {
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.top}>
        <View style={styles.stripes} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {SCHOOL_STRIPES.map((color) => (
            <View key={color} style={[styles.stripe, { backgroundColor: color }]} />
          ))}
        </View>
        <Txt variant="display" style={styles.logo}>
          Campus
        </Txt>
        <Block color={colors.yellow} style={styles.tagline}>
          <Txt variant="heading">Your university. Your people. Your clubs. One place.</Txt>
        </Block>
      </View>
      <View style={styles.actions}>
        <Button label="Create account" onPress={() => router.push('/signup')} />
        <Button label="Log in" color={colors.white} onPress={() => router.push('/login')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flex: 1, justifyContent: 'center', gap: space.xl },
  stripes: { flexDirection: 'row', height: 56, borderWidth: 3, borderColor: colors.ink },
  stripe: { flex: 1, borderRightWidth: 3, borderRightColor: colors.ink },
  logo: { fontSize: 72, lineHeight: 74 },
  tagline: { padding: space.lg },
  actions: { gap: space.md },
});
