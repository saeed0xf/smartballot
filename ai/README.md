# VoteSure Face Verification API

This module provides face verification capabilities for the VoteSure election system using AI-powered facial recognition. It helps verify voter identity by comparing facial images against reference images stored in the voter database.

## Features

- Face verification using deep learning models
- API for integration with the voter system
- Support for both image upload and base64 encoded images
- Real-time face verification with anti-spoofing detection
- Detailed verification results with similarity scores

## Tech Stack

- **FastAPI**: Modern, fast web framework for building APIs
- **Deepface**: Deep learning facial recognition library
- **OpenCV**: Computer vision for image processing

## Installation

1. Navigate to the AI module directory:
   ```
   cd ai
   ```

2. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Make sure the temp directory exists:
   ```
   mkdir -p temp
   ```

## Usage

### Running the API Server

Start the server with:

```
python run.py
```

Alternatively, you can directly use:

```
python main.py
```

This will launch the API server on port 8000 (or an alternative port if 8000 is busy). 
You can access the API documentation at http://localhost:8000/docs

### API Endpoints

#### 1. Check API Health

**URL**: `/healthcheck`  
**Method**: GET  
**Description**: Verifies that the API is running properly

**Response Example**:
```json
{
  "status": "ok",
  "app_info": {
    "name": "VoteSure Face Verification API",
    "directories": {
      "root": "/path/to/app",
      "temp": "/path/to/app/temp"
    }
  }
}
```

#### 2. Verify Face (File Upload)

**URL**: `/api/verify`  
**Method**: POST  
**Content-Type**: `multipart/form-data`

**Parameters**:
- `uploaded_image`: The face image file to verify
- `voter_id`: The voter ID to fetch the reference image from the voter database

**Response Example (Success)**:
```json
{
  "success": true,
  "verified": true,
  "distance": 0.15,
  "threshold": 0.4,
  "model": "VGG-Face",
  "detector_backend": "opencv",
  "similarity_score": 85.0,
  "voter_id": "123456",
  "message": "Face verification successful. Identity confirmed."
}
```

**Response Example (Failed Verification)**:
```json
{
  "success": true,
  "verified": false,
  "distance": 0.75,
  "threshold": 0.4,
  "model": "VGG-Face",
  "detector_backend": "opencv",
  "similarity_score": 25.0,
  "voter_id": "123456",
  "message": "Face verification failed. This does not match the registered voter."
}
```

**Response Example (Spoofing Detected)**:
```json
{
  "success": false,
  "error": "Potential spoofing detected",
  "message": "The system detected potential spoofing in the uploaded image.",
  "details": "Exception while processing img1_path..."
}
```

**Response Example (No Face Detected)**:
```json
{
  "success": false,
  "error": "No face detected",
  "message": "No face detected in one or both images. Please provide a clear image with a visible face.",
  "details": "Face could not be detected."
}
```

#### 3. Verify Face (Base64)

**URL**: `/api/verify-base64`  
**Method**: POST  
**Content-Type**: `application/x-www-form-urlencoded`

**Parameters**:
- `uploaded_image`: Base64 encoded image to verify
- `voter_id`: The voter ID to fetch the reference image from the voter database

**Response**: Same as the file upload endpoint

## Integration with Voter Database API

This API integrates with the voter database system to fetch reference images for verification:

1. When a verification request is received with a `voter_id`, the API calls `http://localhost:9001/api/voters/id/{voter_id}` to get voter information.
2. It extracts the `photoUrl` from the response to construct the full image URL.
3. The reference image is downloaded from `http://localhost:9001{photoUrl}`.
4. The uploaded image is then compared against this reference image.

## Error Handling

The API provides detailed error responses for various scenarios:

- **Invalid Voter ID**: When the voter ID doesn't exist in the database
  ```json
  {
    "success": false,
    "error": "Voter not found",
    "details": "Could not retrieve image for voter ID: 123456"
  }
  ```

- **Spoofing Detection**: When a printed photo or digital display is detected
  ```json
  {
    "success": false,
    "error": "Spoofing detected",
    "message": "Please use a real face image, not a photo of a display or printed image.",
    "details": "Error details..."
  }
  ```

- **Face Detection Issues**: When faces can't be detected or multiple faces are present
  ```json
  {
    "success": false,
    "error": "Multiple faces detected",
    "message": "Multiple faces detected in the image. Please provide an image with only one face.",
    "details": "Error details..."
  }
  ```

- **Server Errors**: For unexpected processing issues
  ```json
  {
    "success": false,
    "error": "Server error",
    "message": "An unexpected error occurred during verification.",
    "details": "Error details..."
  }
  ```

## Security Considerations

- Face verification should be used as one factor in a multi-factor authentication system
- All image data is processed temporarily and not stored permanently
- Consider rate limiting and other API protections in production
- The API includes anti-spoofing measures to detect printed photos or digital displays 