import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { api } from '@/lib/api';

export type PickedFile = { uri: string; name: string; mimeType: string };

/** Opens the photo library. Returns null if the user cancels or denies access. */
export async function pickImage(options: { square?: boolean } = {}): Promise<PickedFile | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: options.square ?? false,
    aspect: options.square ? [1, 1] : undefined,
    quality: 0.7,
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  return { uri: asset.uri, name: asset.fileName ?? 'image.jpg', mimeType: asset.mimeType ?? 'image/jpeg' };
}

/** Builds the multipart body for one file. React Native and web describe files differently. */
export async function toFormData(file: PickedFile): Promise<FormData> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    form.append('file', blob, file.name);
  } else {
    // React Native's FormData accepts this descriptor in place of a Blob.
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  }
  return form;
}

/** Uploads a public image (avatar, banner, group image) and returns its server path. */
export async function uploadPublicImage(file: PickedFile): Promise<string> {
  const { url } = await api.upload<{ url: string }>('/uploads/images', await toFormData(file));
  return url;
}
