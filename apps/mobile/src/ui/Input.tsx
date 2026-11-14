import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { BORDER, TOUCH, colors, fonts, space } from './theme';
import { Txt } from './Txt';

type Props = TextInputProps & { label: string; error?: string | null; hint?: string };

export function Input({ label, error, hint, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Txt variant="label">{label}</Txt>
      <TextInput
        {...rest}
        accessibilityLabel={label}
        placeholderTextColor={colors.gray}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[styles.input, focused && styles.focused, error ? styles.invalid : null, style]}
      />
      {error ? (
        <Txt variant="small" color={colors.red} accessibilityRole="alert">
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="small" color={colors.gray}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  input: {
    minHeight: TOUCH,
    borderWidth: BORDER,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  focused: { backgroundColor: colors.yellow },
  invalid: { borderColor: colors.red },
});
