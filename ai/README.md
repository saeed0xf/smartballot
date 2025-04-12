# VoteSure Face Verification API

This module provides face verification capabilities for the VoteSure election system using AI-powered facial recognition. It helps verify voter identity by comparing facial images.

## Features

- Face verification using deep learning models
- Multiple interfaces:
  - Web UI with webcam capture and image upload
  - REST API for integration with other systems
- Support for both image upload and base64 encoded images
- Real-time verification with detailed results
- Verification score with confidence levels

## Tech Stack

- **FastAPI**: Modern, fast web framework for building APIs
- **Deepface**: Deep learning facial recognition library
- **OpenCV**: Computer vision for image processing
- **Jinja2**: HTML templating for the web interface
- **Bootstrap 5**: Frontend UI components
- **JavaScript**: Client-side interactions

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
python main.py
```

This will launch the API server on port 8000. You can access:
- Web UI: http://localhost:8000/
- API documentation: http://localhost:8000/docs

### API Endpoints

#### 1. Verify Faces (File Upload)

**URL**: `/api/verify-face`
**Method**: POST
**Content-Type**: `multipart/form-data`

**Parameters**:
- `reference_image`: The reference face image file
- `verification_image`: The face image to verify against the reference

**Response**:
```json
{
  "verified": true,
  "distance": 0.15,
  "threshold": 0.4,
  "model": "VGG-Face",
  "detector_backend": "opencv",
  "similarity_score": 85.0
}
```

#### 2. Verify Faces (Base64)

**URL**: `/api/verify-face-base64`
**Method**: POST
**Content-Type**: `application/x-www-form-urlencoded`

**Parameters**:
- `reference_image`: Base64 encoded reference image
- `verification_image`: Base64 encoded verification image

**Response**: Same as above

## Integration with VoteSure

This module can be integrated with the VoteSure system to:

1. Verify voter identity during registration
2. Authenticate voters before casting votes
3. Validate identity for administrative actions

## Security Considerations

- Face verification should be used as one factor in a multi-factor authentication system
- All image data is processed temporarily and not stored permanently
- Consider rate limiting and other API protections in production 