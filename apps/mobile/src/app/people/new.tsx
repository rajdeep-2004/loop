import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { PeopleList } from '@/features/people/PeopleList';
import { useDebounced } from '@/lib/useDebounced';
import { Input, Screen, TopBar, space } from '@/ui';

/** Find a student to message. */
export default function NewChat() {
  const [text, setText] = useState('');
  const q = useDebounced(text);
  return (
    <Screen padded={false}>
      <TopBar title="New chat" back />
      <View style={{ padding: space.lg }}>
        <Input label="Search students" value={text} onChangeText={setText} autoCapitalize="none" autoCorrect={false} placeholder="Name or username" autoFocus />
      </View>
      <PeopleList filter={{ q }} onPick={(person) => router.push(`/user/${person.id}`)} />
    </Screen>
  );
}
