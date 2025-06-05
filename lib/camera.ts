import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import imageCompression from 'browser-image-compression';
import { writeFile } from './filesystem';
import { supabase } from './supabase';

export const takeAndUploadPhoto = async () => {
  try {
    const image = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 90
    });

    if (!image.webPath) return null;

    const blob = await fetch(image.webPath).then(res => res.blob());
    const compressed = await imageCompression(blob, {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1280
    });

    const base64 = await imageCompression.getDataUrlFromFile(compressed);
    const filename = `photo_${Date.now()}.jpeg`;

    await writeFile(filename, base64);
    await supabase.storage.from('photos').upload(filename, compressed);

    return image.webPath;
  } catch (err) {
    console.error('Camera error:', err);
    return null;
  }
};

export const importMultiplePhotos = async () => {
  try {
    const photos = await Camera.pickImages({
      quality: 80,
      limit: 10
    });

    const processedPhotos = [];

    for (const image of photos.photos) {
      const blob = await fetch(image.webPath).then(r => r.blob());
      const compressed = await imageCompression(blob, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1280
      });
      const base64 = await imageCompression.getDataUrlFromFile(compressed);
      const filename = `imported_${Date.now()}_${Math.random()}.jpeg`;

      await writeFile(filename, base64);
      await supabase.storage.from('photos').upload(filename, compressed);

      processedPhotos.push({
        id: filename,
        url: image.webPath,
        detected: {
          name: 'Imported Photo',
          type: 'Unknown',
          species: 'Unlabeled',
          certainty: 50
        }
      });
    }

    return processedPhotos;
  } catch (err) {
    console.error('Photo import error:', err);
    return [];
  }
};