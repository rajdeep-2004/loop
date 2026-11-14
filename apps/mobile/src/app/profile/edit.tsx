import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { LIMITS, updateProfileInput, type Me } from '@campus/shared';
import { useAuth, useMe } from '@/features/auth/AuthContext';
import { pickImage, uploadPublicImage } from '@/features/profile/pickImage';
import { api, errorMessage } from '@/lib/api';
import { splitTags, validateForm, type FieldErrors } from '@/lib/forms';
import { Avatar, Button, Input, Screen, TopBar, Txt, colors, space } from '@/ui';

export default function EditProfile() {
  const me = useMe();
  const { setUser } = useAuth();
  const [name, setName] = useState(me.name);
  const [bio, setBio] = useState(me.bio);
  const [skills, setSkills] = useState(me.skills.join(', '));
  const [interests, setInterests] = useState(me.interests.join(', '));
  const [avatarUrl, setAvatarUrl] = useState(me.avatarUrl);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const changePicture = async () => {
    setFailure(null);
    const file = await pickImage({ square: true });
    if (!file) return;
    setUploading(true);
    try {
      setAvatarUrl(await uploadPublicImage(file));
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const form = validateForm(updateProfileInput, {
      name,
      bio,
      avatarUrl,
      skills: splitTags(skills),
      interests: splitTags(interests),
    });
    if (!form.ok) return setErrors(form.errors);
    setErrors({});
    setFailure(null);
    setSaving(true);
    try {
      setUser(await api.patch<Me>('/users/me', form.data));
      router.back();
    } catch (error) {
      setFailure(errorMessage(error));
      setSaving(false);
    }
  };

  return (
    <Screen padded={false} scroll>
      <TopBar title="Edit profile" back />
      <View style={{ padding: space.lg, gap: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <Avatar name={name || me.name} avatarUrl={avatarUrl} color={me.school?.color} size={96} />
          <Button label="Change picture" color={colors.white} onPress={changePicture} loading={uploading} />
        </View>
        <Input label="Full name" value={name} onChangeText={setName} error={errors.name} maxLength={LIMITS.nameMax} />
        <Input
          label="Bio"
          value={bio}
          onChangeText={setBio}
          error={errors.bio}
          maxLength={LIMITS.bioMax}
          multiline
          hint={`${bio.length}/${LIMITS.bioMax}`}
        />
        <Input label="Skills" value={skills} onChangeText={setSkills} error={errors.skills} autoCapitalize="none" hint="Separate with commas: react, figma, public speaking" />
        <Input label="Interests" value={interests} onChangeText={setInterests} error={errors.interests} autoCapitalize="none" hint="Separate with commas: ai, football, startups" />
        {failure ? <Txt color={colors.red} accessibilityRole="alert">{failure}</Txt> : null}
        <Button label="Save" onPress={save} loading={saving} disabled={uploading} />
      </View>
    </Screen>
  );
}
