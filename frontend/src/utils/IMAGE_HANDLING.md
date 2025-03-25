# Image Handling in VoteSure

This document explains how image handling is implemented in the VoteSure application to ensure consistent loading of images across both development and production environments.

## Problem

When running the frontend and backend on different servers/ports (e.g., frontend on port 3000 and backend on port 5000), images stored on the backend can't be accessed directly by relative paths in the frontend.

For example, if the backend stores an image at:
```
/uploads/candidatePhoto-1742929578484-69305146.jpg
```

And serves it from:
```
http://localhost:5000/uploads/candidatePhoto-1742929578484-69305146.jpg
```

But the frontend tries to access it at:
```
http://localhost:3000/uploads/candidatePhoto-1742929578484-69305146.jpg
```

The image will not be found (404 error).

## Solution

To solve this issue, we've implemented a utility function that ensures all image URLs are properly formatted with the backend server's URL. The solution consists of:

1. A utility function to format image URLs
2. Implementation of this function in components that display images
3. Configuration to adapt to different environments (development, production)

### 1. Image URL Formatting Utility

The `formatImageUrl` function in `src/utils/imageUtils.js` handles different types of image URLs:

- Absolute URLs (starting with http/https) are left unchanged
- Data URLs (for local previews) are left unchanged
- Relative paths are prefixed with the backend server URL

### 2. Implementation in Components

All components that display images use the `formatImageUrl` function to format image URLs before rendering:

- `ManageCandidates.jsx`
- `ViewCandidates.jsx`
- `ArchivedElections.jsx`
- And other components that display images

### 3. Configuration for Different Environments

The backend URL is configured with environment variables:

- In development: `http://localhost:5000`
- In production: Set via the `VITE_API_BASE_URL` environment variable

## How to Use

When adding new components that display images:

1. Import the utility function:
   ```javascript
   import { formatImageUrl } from '../../utils/imageUtils';
   ```

2. Format image URLs before using them:
   ```javascript
   <img src={formatImageUrl(candidate.photoUrl)} alt="Candidate" />
   ```

3. For data fetching, transform the URLs in the API response:
   ```javascript
   const formattedCandidates = response.data.map(candidate => ({
     ...candidate,
     photoUrl: formatImageUrl(candidate.photoUrl)
   }));
   ```

## Testing

A test script is available at `src/utils/testImageUrls.js` to verify the URL formatting logic. Run it to ensure everything works as expected.

## Environment Configuration

In your `.env` file, you can override the default backend URL:

```
VITE_API_BASE_URL=http://your-backend-server.com
```

For local development, the default value of `http://localhost:5000` is used if not specified. 