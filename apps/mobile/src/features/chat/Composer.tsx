import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LIMITS } from '@campus/shared';
import { BORDER, Button, Txt, colors, fonts, space } from '@/ui';

type Props = {
  onSend: (body: string) => void;
  onTyping?: () => void;
  onStoppedTyping?: () => void;
  /** Text shown above the input while replying to or editing a message. */
  banner?: { title: string; text: string; onCancel: () => void } | null;
  initialText?: string;
  sendLabel?: string;
  /** Extra control on the left of the input (the attach button). */
  leading?: React.ReactNode;
  placeholder?: string;
};

export function Composer({ onSend, onTyping, onStoppedTyping, banner, initialText = '', sendLabel = 'Send', leading, placeholder = 'Message' }: Props) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(initialText);
  const trimmed = text.trim();

  const submit = () => {
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    onStoppedTyping?.();
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      {banner ? (
        <View style={styles.banner}>
          <View style={styles.bannerText}>
            <Txt variant="label">{banner.title}</Txt>
            <Txt variant="small" numberOfLines={1}>
              {banner.text}
            </Txt>
          </View>
          <Pressable onPress={banner.onCancel} accessibilityRole="button" accessibilityLabel="Cancel" hitSlop={8}>
            <Txt variant="label">✕</Txt>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.row}>
        {leading}
        <TextInput
          value={text}
          onChangeText={(value) => {
            setText(value);
            if (value) onTyping?.();
          }}
          onBlur={onStoppedTyping}
          placeholder={placeholder}
          placeholderTextColor={colors.gray}
          accessibilityLabel={placeholder}
          multiline
          maxLength={LIMITS.messageMax}
          style={styles.input}
        />
        <Button label={sendLabel} onPress={submit} disabled={!trimmed} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: BORDER, borderTopColor: colors.ink, backgroundColor: colors.white, padding: space.sm, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderWidth: BORDER,
    borderColor: colors.ink,
    backgroundColor: colors.paper,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.yellow,
    padding: space.sm,
  },
  bannerText: { flex: 1 },
});
