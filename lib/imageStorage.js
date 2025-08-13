// Enhanced image storage system using Supabase Storage
import imageCompression from 'browser-image-compression';
import { supabase } from './supabase';

/**
 * Compress and upload image to Supabase Storage
 * @param {File} file - Original image file
 * @param {string} userId - User ID for folder organization
 * @returns {Promise<{url: string, thumbnailUrl: string, error: null} | {url: null, thumbnailUrl: null, error: Error}>}
 */
export const uploadImageToStorage = async (file, userId) => {
  try {
    console.log('📸 [ImageStorage] Starting upload process...');
    console.log('📸 [ImageStorage] Original file size:', file.size, 'bytes');
    
    // Step 1: Compress to WebP only if the incoming file is not already WebP
    // This ensures we only compress once in the camera/gallery flow
    const compressed = file?.type === 'image/webp'
      ? file
      : await imageCompression(file, {
          maxSizeMB: 0.4,           // Max ~400KB
          maxWidthOrHeight: 1280,   // Max 1280px dimension
          useWebWorker: true,       // Better performance
          fileType: 'image/webp',   // Modern format with better compression
          initialQuality: 0.8       // Good quality vs size balance
        });
    
    console.log('📸 [ImageStorage] Compressed file size:', compressed.size, 'bytes');
    console.log('📸 [ImageStorage] Compression ratio:', Math.round((1 - compressed.size / file.size) * 100) + '%');
    
    // Step 2: Generate unique filename with user folder structure
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const filename = `${userId}/${timestamp}_${randomSuffix}.webp`;
    
    console.log('📸 [ImageStorage] Uploading to:', filename);
    
    // Step 3: Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('photos')
      .upload(filename, compressed, {
        contentType: 'image/webp',
        upsert: false, // Don't overwrite existing files
        cacheControl: '31536000' // 1 year; filenames are unique
      });
    
    if (error) {
      console.error('❌ [ImageStorage] Upload failed:', error);
      throw error;
    }
    
    console.log('✅ [ImageStorage] Upload successful:', data.path);
    
    // Step 4: Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(filename);
    
    // Step 5: Generate thumbnail URL using Supabase's image transformation
    const thumbnailUrl = `${publicUrl}?width=240&quality=60&format=webp`;
    
    console.log('📸 [ImageStorage] Public URL:', publicUrl);
    console.log('📸 [ImageStorage] Thumbnail URL:', thumbnailUrl);
    
    return {
      url: publicUrl,
      thumbnailUrl: thumbnailUrl,
      storagePath: filename, // Return the storage path for cleanup
      error: null
    };
    
  } catch (error) {
    console.error('❌ [ImageStorage] Error:', error);
    return {
      url: null,
      thumbnailUrl: null,
      error: error
    };
  }
};

/**
 * Convert base64 data URL to File object
 * @param {string} dataURL - Base64 data URL
 * @param {string} filename - Desired filename
 * @returns {File}
 */
export const dataURLtoFile = (dataURL, filename) => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

/**
 * Delete image from Supabase Storage
 * @param {string} imageUrl - Full image URL or path
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export const deleteImageFromStorage = async (imageUrl) => {
  try {
    // Extract path from full URL
    const urlParts = imageUrl.split('/storage/v1/object/public/photos/');
    if (urlParts.length < 2) {
      throw new Error('Invalid image URL format');
    }
    
    const filePath = urlParts[1].split('?')[0]; // Remove query params
    
    console.log('🗑️ [ImageStorage] Deleting:', filePath);
    
    const { error } = await supabase.storage
      .from('photos')
      .remove([filePath]);
    
    if (error) {
      console.error('❌ [ImageStorage] Delete failed:', error);
      return { success: false, error };
    }
    
    console.log('✅ [ImageStorage] Delete successful');
    return { success: true, error: null };
    
  } catch (error) {
    console.error('❌ [ImageStorage] Delete error:', error);
    return { success: false, error };
  }
};

/**
 * Generate different sized image URLs from base URL
 * @param {string} baseUrl - Base image URL
 * @returns {object} Object with different sized URLs
 */
export const generateImageSizes = (baseUrl) => {
  if (!baseUrl) return null;
  
  const cleanUrl = baseUrl.split('?')[0]; // Remove existing query params
  
  return {
    original: baseUrl,
    large: `${cleanUrl}?width=800&quality=80&format=webp`,
    medium: `${cleanUrl}?width=400&quality=75&format=webp`,
    thumbnail: `${cleanUrl}?width=240&quality=60&format=webp`,
    small: `${cleanUrl}?width=120&quality=50&format=webp`
  };
};

/**
 * Preload image for better UX
 * @param {string} imageUrl - Image URL to preload
 * @returns {Promise<void>}
 */
export const preloadImage = (imageUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = imageUrl;
  });
};