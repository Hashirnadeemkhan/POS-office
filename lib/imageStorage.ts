import { openDB } from 'idb';

// Define the database name and version
const DB_NAME = 'product-images-db';
const DB_VERSION = 1;
const STORE_NAME = 'images';

// Initialize the database
async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create an object store for images if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

// Save an image to IndexedDB
export async function saveImage(imageId: string, file: File): Promise<string> {
  const db = await initDB();
  
  // Convert file to ArrayBuffer for storage
  const arrayBuffer = await file.arrayBuffer();
  
  // Store the image data
  await db.put(STORE_NAME, arrayBuffer, imageId);
  
  // Return a URL that can be used to reference this image
  return `local-image://${imageId}`;
}

// Get an image from IndexedDB
export async function getImage(imageId: string): Promise<string | null> {
  try {
    const db = await initDB();
    
    // Get the image data
    const imageData = await db.get(STORE_NAME, imageId);
    
    if (!imageData) {
      return null;
    }
    
    // Convert ArrayBuffer back to Blob
    const blob = new Blob([imageData]);
    
    // Create an object URL for the blob
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error getting image:', error);
    return null;
  }
}

// Delete an image from IndexedDB
export async function deleteImage(imageId: string): Promise<boolean> {
  try {
    const db = await initDB();
    
    // Check if the image exists
    const exists = await db.get(STORE_NAME, imageId);
    if (!exists) {
      return false;
    }
    
    // Delete the image
    await db.delete(STORE_NAME, imageId);
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}

// Extract the image ID from a local image URL
export function getImageIdFromUrl(url: string): string | null {
  if (!url.startsWith('local-image://')) {
    return null;
  }
  
  return url.replace('local-image://', '');
}

// Generate a unique ID for an image
export function generateImageId(prefix: string = 'img'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
