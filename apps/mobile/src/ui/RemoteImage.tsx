import { Image, type ImageProps } from 'expo-image';
import { fileUrl } from '@/lib/config';
import { getAccessToken } from '@/lib/tokens';

type Props = Omit<ImageProps, 'source'> & { path: string };

/** Shows a file stored on the Campus server. Files need the access token, so it is sent as a header. */
export function RemoteImage({ path, ...rest }: Props) {
  const token = getAccessToken();
  return (
    <Image
      {...rest}
      source={{ uri: fileUrl(path), headers: token ? { Authorization: `Bearer ${token}` } : undefined }}
      contentFit="cover"
    />
  );
}
