import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import imageCompression from 'browser-image-compression';
import { writeFile } from './filesystem';
import { supabase, uploadPhotoWithOwner } from './supabase';

interface ProcessedPhoto {
  id: string;
  url: string;
  detected: {
    name: string;
    type: string;
    species: string;
    certainty: number;
  };
}

const uploadToStorage = async (file: File, filename: string): Promise<string> => {
  try {
    const { data, error } = await uploadPhotoWithOwner(filename, file);

    if (error) {
      if (error.message === 'Bucket not found') {
        throw new Error('Storage bucket not found. Please create a "photos" bucket in your Supabase dashboard.');
      }
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(filename);

    return publicUrl;
  } catch (error) {
    console.error('Storage upload error:', error);
    throw error;
  }
};

// Add this function to check camera availability
const checkCameraAvailability = async () => {
  try {
    const { camera } = await Camera.checkPermissions();
    if (camera === 'prompt') {
      const { camera: newPermission } = await Camera.requestPermissions();
      return newPermission === 'granted';
    }
    return camera === 'granted';
  } catch (error) {
    console.error('Error checking camera permissions:', error);
    return false;
  }
};

export const takeAndUploadPhoto = async () => {
  try {
    // Check camera availability first
    const hasCamera = await checkCameraAvailability();
    if (!hasCamera) {
      throw new Error('Camera permission not granted or camera not available');
    }

    const image = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 90,
      allowEditing: false,
      correctOrientation: true
    });

    if (!image.webPath) {
      throw new Error('No image captured');
    }

    const blob = await fetch(image.webPath).then(res => res.blob());
    const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1280
    });

    const base64 = await imageCompression.getDataUrlFromFile(compressed);
    const filename = `photo_${Date.now()}.jpeg`;

    await writeFile(filename, base64);
    
    try {
      const publicUrl = await uploadToStorage(compressed, filename);
      return publicUrl;
    } catch (error) {
      console.warn('Storage upload failed, using local file:', error);
      return image.webPath;
    }
  } catch (err) {
    console.error('Camera error:', err);
    throw err; // Re-throw the error to handle it in the UI
  }
};

export const importMultiplePhotos = async () => {
  try {
    const photos = await Camera.pickImages({
      quality: 80,
      limit: 10
    });

    const processedPhotos: ProcessedPhoto[] = [];

    for (const image of photos.photos) {
      const blob = await fetch(image.webPath).then(r => r.blob());
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1280
      });
      const base64 = await imageCompression.getDataUrlFromFile(compressed);
      const filename = `imported_${Date.now()}_${Math.random()}.jpeg`;

      await writeFile(filename, base64);
      
      try {
        const publicUrl = await uploadToStorage(compressed, filename);
        processedPhotos.push({
          id: filename,
          url: publicUrl,
          detected: {
            name: 'Imported Photo',
            type: 'Unknown',
            species: 'Unlabeled',
            certainty: 50
          }
        });
      } catch (error) {
        console.warn('Storage upload failed for imported photo:', error);
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
    }

    return processedPhotos;
  } catch (err) {
    console.error('Photo import error:', err);
    return [];
  }
};