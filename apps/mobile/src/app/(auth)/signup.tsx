import { useState } from 'react';
import { View } from 'react-native';
import { LIMITS, signupInput } from '@campus/shared';
import { useAuth } from '@/features/auth/AuthContext';
import { ApiError, errorMessage } from '@/lib/api';
import { validateForm, type FieldErrors } from '@/lib/forms';
import { Button, Input, Screen, TopBar, Txt, colors, space } from '@/ui';

export default function Signup() {
  const { signUp } = useAuth();
  const [values, setValues] = useState({ name: '', username: '', email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (field: keyof typeof values) => (text: string) => setValues((current) => ({ ...current, [field]: text }));

  const submit = async () => {
    const form = validateForm(signupInput, values);
    if (!form.ok) return setErrors(form.errors);
    setErrors({});
    setFailure(null);
    setBusy(true);
    try {
      await signUp(values);
    } catch (error) {
      // Show "taken" errors next to the field they belong to.
      if (error instanceof ApiError && error.code === 'username_taken') setErrors({ username: error.message });
      else if (error instanceof ApiError && error.code === 'email_taken') setErrors({ email: error.message });
      else setFailure(errorMessage(error));
      setBusy(false);
    }
  };

  return (
    <Screen padded={false} scroll>
      <TopBar title="Join Campus" back />
      <View style={{ padding: space.lg, gap: space.lg }}>
        <Input label="Full name" value={values.name} onChangeText={set('name')} error={errors.name} maxLength={LIMITS.nameMax} autoComplete="name" />
        <Input
          label="Username"
          value={values.username}
          onChangeText={set('username')}
          error={errors.username}
          maxLength={LIMITS.usernameMax}
          autoCapitalize="none"
          autoCorrect={false}
          hint="Letters, numbers, dots and underscores"
        />
        <Input
          label="Email"
          value={values.email}
          onChangeText={set('email')}
          error={errors.email}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <Input
          label="Password"
          value={values.password}
          onChangeText={set('password')}
          error={errors.password}
          secureTextEntry
          autoComplete="new-password"
          hint={`At least ${LIMITS.passwordMin} characters`}
        />
        {failure ? (
          <Txt color={colors.red} accessibilityRole="alert">
            {failure}
          </Txt>
        ) : null}
        <Button label="Create account" onPress={submit} loading={busy} />
      </View>
    </Screen>
  );
}
