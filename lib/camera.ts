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

// Add this function to check camera availability with duplicate request protection
let isRequestingPermissions = false;

const checkCameraAvailability = async () => {
  try {
    // Prevent duplicate permission requests
    if (isRequestingPermissions) {
      console.log('📷 [Camera] Permission request already in progress, waiting...');
      return false;
    }

    const { camera } = await Camera.checkPermissions();
    console.log('📷 [Camera] Current permission status:', camera);
    
    if (camera === 'granted') {
      return true;
    }
    
    if (camera === 'prompt') {
      // Set flag to prevent duplicate requests
      isRequestingPermissions = true;
      
      try {
        console.log('📷 [Camera] Requesting camera permissions...');
        const { camera: newPermission } = await Camera.requestPermissions();
        console.log('📷 [Camera] Permission request result:', newPermission);
        return newPermission === 'granted';
      } finally {
        // Always reset the flag
        isRequestingPermissions = false;
      }
    }
    
    // Permission denied
    console.log('📷 [Camera] Permission denied or unavailable');
    return false;
  } catch (error) {
    console.error('📷 [Camera] Error checking camera permissions:', error);
    isRequestingPermissions = false; // Reset flag on error
    return false;
  }
};

export const takeAndUploadPhoto = async () => {
  try {
    // Check camera availability first with duplicate protection
    const hasCamera = await checkCameraAvailability();
    if (!hasCamera) {
      throw new Error('Camera permission not granted or camera not available');
    }

    console.log('📷 [Camera] Taking photo...');
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

    console.log('📷 [Camera] Photo captured, processing...');
    
    // Handle offline gracefully
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (isOffline) {
      console.log('📷 [Camera] Device is offline, storing locally only');
    }

    const blob = await fetch(image.webPath).then(res => res.blob());
    const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
    console.log('📷 [Camera] Original file size:', file.size, 'bytes');

    const compressed = await imageCompression(file, {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1280
    });
    console.log('📷 [Camera] Compressed file size:', compressed.size, 'bytes');

    const base64 = await imageCompression.getDataUrlFromFile(compressed);
    console.log('📷 [Camera] Base64 string length:', base64.length);

    const filename = `photo_${Date.now()}.jpeg`;

    // Always save locally first
    await writeFile(filename, base64);
    console.log('📷 [Camera] Saved locally as:', filename);
    
    // Try to upload to storage if online
    if (!isOffline) {
      try {
        const publicUrl = await uploadToStorage(compressed, filename);
        console.log('📷 [Camera] Uploaded to storage:', publicUrl);
        return publicUrl;
      } catch (error) {
        console.warn('📷 [Camera] Storage upload failed, using local file:', error);
        return image.webPath;
      }
    } else {
      console.log('📷 [Camera] Offline mode - returning local path');
      return image.webPath;
    }
  } catch (err) {
    console.error('📷 [Camera] Error:', JSON.stringify({
      message: err.message,
      name: err.name,
      details: err.details,
      hint: err.hint,
      code: err.code,
      fullError: err
    }, null, 2));
    
    // Reset permission flag if it was a permission error
    if (err.message?.includes('permission') || err.message?.includes('Permission')) {
      isRequestingPermissions = false;
    }
    
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
    console.error('Photo import error:', JSON.stringify({
      message: err.message,
      name: err.name,
      details: err.details,
      hint: err.hint,
      code: err.code,
      fullError: err
    }, null, 2));
    return [];
  }
};