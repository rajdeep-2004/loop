import { StyleSheet, View } from 'react-native';
import type { PublicUser } from '@campus/shared';
import { Avatar, Block, NEUTRAL_SCHOOL_COLOR, Tag, TagRow, Txt, colors, space } from '@/ui';

/** Where a student sits in the university, as one line. */
export function placeLine(user: Pick<PublicUser, 'program' | 'year' | 'classSection'>): string {
  return [user.program?.name, user.year ? `Year ${user.year}` : null, user.classSection ? `Section ${user.classSection}` : null]
    .filter(Boolean)
    .join(' · ');
}

/** The identity card shown on a student's own profile and on other students' profiles. */
export function ProfileCard({ user }: { user: PublicUser }) {
  const schoolColor = user.school?.color ?? NEUTRAL_SCHOOL_COLOR;
  return (
    <View style={styles.wrap}>
      <Block color={schoolColor} style={styles.banner}>
        <Avatar name={user.name} avatarUrl={user.avatarUrl} color={colors.white} size={96} />
        <View style={styles.names}>
          <Txt variant="title">{user.name}</Txt>
          <Txt variant="label">@{user.username}</Txt>
        </View>
      </Block>

      {user.school ? (
        <Block style={styles.section}>
          <Txt variant="label">{user.school.name}</Txt>
          <Txt>{placeLine(user)}</Txt>
        </Block>
      ) : null}

      {user.bio ? (
        <Block style={styles.section}>
          <Txt variant="label">Bio</Txt>
          <Txt>{user.bio}</Txt>
        </Block>
      ) : null}

      <TagSection title="Skills" tags={user.skills} color={colors.mint} />
      <TagSection title="Interests" tags={user.interests} color={colors.yellow} />
    </View>
  );
}

function TagSection({ title, tags, color }: { title: string; tags: string[]; color: string }) {
  if (tags.length === 0) return null;
  return (
    <View style={styles.tags}>
      <Txt variant="label">{title}</Txt>
      <TagRow>
        {tags.map((tag) => (
          <Tag key={tag} label={tag} color={color} />
        ))}
      </TagRow>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  banner: { padding: space.lg, gap: space.md },
  names: { gap: space.xs },
  section: { padding: space.md, gap: space.xs },
  tags: { gap: space.sm },
});
