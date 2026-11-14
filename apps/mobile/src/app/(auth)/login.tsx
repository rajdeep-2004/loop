import { useState } from 'react';
import { View } from 'react-native';
import { loginInput } from '@campus/shared';
import { useAuth } from '@/features/auth/AuthContext';
import { errorMessage } from '@/lib/api';
import { validateForm, type FieldErrors } from '@/lib/forms';
import { Button, Input, Screen, TopBar, Txt, colors, space } from '@/ui';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const form = validateForm(loginInput, { email, password });
    if (!form.ok) return setErrors(form.errors);
    setErrors({});
    setFailure(null);
    setBusy(true);
    try {
      await signIn({ email, password });
    } catch (error) {
      setFailure(errorMessage(error));
      setBusy(false);
    }
  };

  return (
    <Screen padded={false} scroll>
      <TopBar title="Log in" back />
      <View style={{ padding: space.lg, gap: space.lg }}>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@university.edu"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
          autoComplete="current-password"
          onSubmitEditing={submit}
        />
        {failure ? (
          <Txt color={colors.red} accessibilityRole="alert">
            {failure}
          </Txt>
        ) : null}
        <Button label="Log in" onPress={submit} loading={busy} />
      </View>
    </Screen>
  );
}
