// The images the user adds as Photos: several at once from the camera roll, or one taken with
// the camera, which stays in the app only (never saved to the camera roll).
import { launchCameraAsync, launchImageLibraryAsync, requestCameraPermissionsAsync } from 'expo-image-picker';

/** The URIs of the images picked from the camera roll, in the order picked; none when cancelled. */
export async function pickFromLibrary(): Promise<string[]> {
  const result = await launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsMultipleSelection: true,
    orderedSelection: true,
    quality: 1,
  });
  return result.canceled ? [] : result.assets.map((asset) => asset.uri);
}

/** The URI of the photo taken, in a list; none when cancelled; null when the camera is not allowed. */
export async function takePhoto(): Promise<string[] | null> {
  if (!(await requestCameraPermissionsAsync()).granted) return null;
  const result = await launchCameraAsync({ mediaTypes: 'images', quality: 1 });
  return result.canceled ? [] : result.assets.map((asset) => asset.uri);
}
