import { router } from 'expo-router';
import { useState } from 'react';
import { ProfileCard } from '@/features/profile/ProfileCard';
import { useAuth, useMe } from '@/features/auth/AuthContext';
import { Button, Screen, colors } from '@/ui';

export default function MeScreen() {
  const me = useMe();
  const { signOut } = useAuth();
  const [leaving, setLeaving] = useState(false);

  return (
    <Screen scroll>
      <ProfileCard user={me} />
      <Button label="Edit profile" onPress={() => router.push('/profile/edit')} />
      <Button
        label="Log out"
        color={colors.white}
        loading={leaving}
        onPress={() => {
          setLeaving(true);
          void signOut();
        }}
      />
    </Screen>
  );
}
