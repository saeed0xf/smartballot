// Utility functions for handling image URLs in the application

// Base URL for the backend server
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Formats an image URL to ensure it points to the correct backend server
 * @param {string} imageUrl - The image URL to format
 * @returns {string} - The correctly formatted image URL
 */
export const formatImageUrl = (imageUrl) => {
  if (!imageUrl) return '';
  
  // If it's already an absolute URL (starts with http), return as is
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // If it's a data URL (for previews), return as is
  if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
    return imageUrl;
  }
  
  // If it starts with a forward slash, use as is, otherwise add one
  const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  
  // Return the full URL to the backend server
  return `${BACKEND_URL}${path}`;
};

/**
 * Checks if an image URL is a preview URL (data: or blob:)
 * @param {string} imageUrl - The image URL to check
 * @returns {boolean} - Whether the URL is a preview URL
 */
export const isPreviewUrl = (imageUrl) => {
  return imageUrl && (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:'));
}; 