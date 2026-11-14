import { Pressable, StyleSheet, View } from 'react-native';
import type { PublicUser, UserChip } from '@campus/shared';
import { placeLine } from '@/features/profile/ProfileCard';
import { Avatar, BORDER, Txt, colors, space } from '@/ui';

type Person = Pick<PublicUser, 'id' | 'name' | 'username' | 'avatarUrl'> & Partial<Pick<PublicUser, 'school' | 'program' | 'year' | 'classSection'>> & Partial<Pick<UserChip, 'color'>>;

/** One student in a list. `right` holds an optional tag or action. */
export function PersonRow({ person, onPress, right }: { person: Person; onPress?: () => void; right?: React.ReactNode }) {
  const place = person.program ? placeLine({ program: person.program, year: person.year ?? null, classSection: person.classSection ?? null }) : null;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={person.name}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Avatar name={person.name} avatarUrl={person.avatarUrl} color={person.school?.color ?? person.color} />
      <View style={styles.text}>
        <Txt variant="heading" numberOfLines={1}>
          {person.name}
        </Txt>
        <Txt variant="small" color={colors.gray} numberOfLines={1}>
          @{person.username}
          {place ? ` · ${place}` : ''}
        </Txt>
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderBottomWidth: BORDER,
    borderBottomColor: colors.ink,
    backgroundColor: colors.white,
  },
  pressed: { backgroundColor: colors.yellow },
  text: { flex: 1, gap: 2 },
});
