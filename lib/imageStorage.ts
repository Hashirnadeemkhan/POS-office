/**
 * Image storage utility for ImgBB
 */

// ImgBB API key from environment variables
const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY

/**
 * Generate a unique image ID with a prefix
 * @param prefix Prefix for the image ID (e.g., 'product_main', 'variant')
 * @returns A unique image ID
 */
export const generateImageId = (prefix: string): string => {
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 10)
  return `${prefix}_${timestamp}_${randomStr}`
}

/**
 * Upload an image to ImgBB
 * @param imageId Unique ID for the image
 * @param file File object to upload
 * @returns Promise resolving to the image URL
 */
export const saveImage = async (imageId: string, file: File): Promise<string> => {
  try {
    // Create form data for the API request
    const formData = new FormData()
    formData.append("image", file)
    formData.append("key", IMGBB_API_KEY as string)
    formData.append("name", imageId) // Use our generated ID as the image name

    // Send the upload request to ImgBB API
    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`ImgBB upload failed: ${response.statusText}`)
    }

    const data = await response.json()

    // Return the direct image URL from the response
    return data.data.url
  } catch (error) {
    console.error("Error uploading image to ImgBB:", error)
    throw new Error("Failed to upload image")
  }
}

/**
 * Extract image ID from a URL
 * @param url Image URL
 * @returns The extracted image ID or null if not found
 */
export const getImageIdFromUrl = (url: string): string | null => {
  // For ImgBB, we can't directly get the ID from the URL
  // We'll use a different approach - extract from the filename if possible
  const match = url.match(/\/([^/]+)\.[a-zA-Z]+$/)
  return match ? match[1] : null
}

/**
 * Delete an image from ImgBB
 * Note: ImgBB free API doesn't support image deletion
 * This is a placeholder function that logs the deletion attempt
 * @param imageId ID of the image to delete
 */
export const deleteImage = async (imageId: string): Promise<void> => {
  // ImgBB free API doesn't support image deletion
  // This is a placeholder function that logs the deletion attempt
  console.log(`Image deletion not supported in ImgBB free tier: ${imageId}`)

  // If you upgrade to a paid ImgBB plan that supports deletion via API,
  // you would implement the actual deletion logic here
}

