from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
from deepface import DeepFace
import numpy as np
import cv2
import tempfile
import os
import shutil
from pathlib import Path
import logging
import base64
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define application root directory for consistent path resolution
ROOT_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
logger.info(f"Application root directory: {ROOT_DIR}")

# Define static, templates, and temp directories
STATIC_DIR = ROOT_DIR / "static"
TEMPLATES_DIR = ROOT_DIR / "templates"
TEMP_DIR = ROOT_DIR / "temp"

# Create temp directory if it doesn't exist
TEMP_DIR.mkdir(exist_ok=True)
logger.info(f"Temp directory: {TEMP_DIR}")

# Create FastAPI app with increased file size limits
app = FastAPI(
    title="VoteSure Face Verification API",
)

# Add CORS middleware to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    # Mount static files
    logger.info(f"Mounting static files from: {STATIC_DIR}")
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
    
    # Configure Jinja2 templates
    logger.info(f"Loading templates from: {TEMPLATES_DIR}")
    templates = Jinja2Templates(directory=str(TEMPLATES_DIR))
except Exception as e:
    logger.error(f"Error setting up app directories: {e}")
    raise

def cleanup_temp_files():
    """Clean up temporary files periodically"""
    try:
        if TEMP_DIR.exists():
            logger.info(f"Cleaning up temp directory: {TEMP_DIR}")
            count = 0
            for file in TEMP_DIR.glob("*"):
                if file.is_file():
                    try:
                        file.unlink()
                        count += 1
                    except Exception as e:
                        logger.error(f"Error deleting temp file {file}: {e}")
            logger.info(f"Removed {count} temporary files")
    except Exception as e:
        logger.error(f"Error cleaning temp directory: {e}")

@app.on_event("startup")
async def startup_event():
    """Initialize app on startup"""
    logger.info("Starting Face Verification API")
    cleanup_temp_files()

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on shutdown"""
    logger.info("Shutting down Face Verification API")
    cleanup_temp_files()

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Return the home page"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/healthcheck")
async def healthcheck():
    """Simple healthcheck endpoint to verify the API is working"""
    return {
        "status": "ok",
        "app_info": {
            "name": "VoteSure Face Verification API",
            "directories": {
                "root": str(ROOT_DIR),
                "static": str(STATIC_DIR),
                "templates": str(TEMPLATES_DIR),
                "temp": str(TEMP_DIR)
            }
        }
    }

@app.post("/api/verify-face")
async def verify_face(
    reference_image: UploadFile = File(...), 
    verification_image: UploadFile = File(...),
):
    """
    Verify if two faces match
    
    Args:
        reference_image: The reference/source face image
        verification_image: The face image to verify against the reference
    
    Returns:
        JSON with verification result
    """
    logger.info("Face verification request received")
    
    try:
        # Log the file details
        ref_size = 0
        ver_size = 0
        
        # Get file size if content_length is available
        if hasattr(reference_image, "size"):
            ref_size = reference_image.size
        
        if hasattr(verification_image, "size"):
            ver_size = verification_image.size
            
        logger.info(f"Reference image: {reference_image.filename}, size: {ref_size/1024 if ref_size else 'unknown'} KB")
        logger.info(f"Verification image: {verification_image.filename}, size: {ver_size/1024 if ver_size else 'unknown'} KB")
        
        # Create temporary files for the images
        ref_path = TEMP_DIR / f"ref_{reference_image.filename}"
        ver_path = TEMP_DIR / f"ver_{verification_image.filename}"
        
        # Save uploaded files to temp directory
        try:
            with open(ref_path, "wb") as buffer:
                # Read in chunks to handle large files
                chunk_size = 1024 * 1024  # 1 MB chunks
                content = await reference_image.read(chunk_size)
                total_bytes = 0
                
                while content:
                    buffer.write(content)
                    total_bytes += len(content)
                    content = await reference_image.read(chunk_size)
                    
                logger.info(f"Saved reference image, total bytes: {total_bytes/1024:.2f} KB")
                    
            await reference_image.seek(0)  # Reset file position
            
            with open(ver_path, "wb") as buffer:
                # Read in chunks to handle large files
                chunk_size = 1024 * 1024  # 1 MB chunks
                content = await verification_image.read(chunk_size)
                total_bytes = 0
                
                while content:
                    buffer.write(content)
                    total_bytes += len(content)
                    content = await verification_image.read(chunk_size)
                    
                logger.info(f"Saved verification image, total bytes: {total_bytes/1024:.2f} KB")
                    
            await verification_image.seek(0)  # Reset file position
        except Exception as e:
            logger.error(f"Error saving uploaded files: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error processing file upload: {str(e)}")
            
        logger.info(f"Images saved to temp directory: {ref_path}, {ver_path}")
        
        # Verify faces using DeepFace with anti-spoofing enabled
        try:
            logger.info("Starting face verification with DeepFace (anti-spoofing enabled)")
            result = DeepFace.verify(
                img1_path=str(ref_path),
                img2_path=str(ver_path),
                model_name="VGG-Face",
                distance_metric="cosine",
                anti_spoofing=True  # Enable DeepFace's built-in anti-spoofing
            )
            
            logger.info(f"Verification result: {result}")
            
            # Return the verification result
            return {
                "verified": result["verified"],
                "distance": result["distance"],
                "threshold": result["threshold"],
                "model": result["model"],
                "detector_backend": result.get("detector_backend", "opencv"),
                "similarity_score": (1 - result["distance"]) * 100,  # Convert distance to similarity percentage
                "anti_spoofing": {
                    "real": True  # If we got here, anti-spoofing check passed
                }
            }
            
        except Exception as e:
            error_message = str(e)
            logger.error(f"DeepFace verification error: {error_message}")
            
            # Check for spoofing detection - expanded error patterns
            if ("spoofed image" in error_message.lower() or 
                "fake face" in error_message.lower()):
                
                # Clear spoofing detection messages
                logger.warning(f"Explicit spoofing detected: {error_message}")
                raise HTTPException(
                    status_code=400, 
                    detail="Spoofing detected. Please use a real face image, not a photo of a display or printed image."
                )
            
            # Generic "Exception while processing" - likely spoofing but could be other issues
            elif "exception while processing img" in error_message.lower():
                # Determine which image had the issue
                if "img1_path" in error_message:
                    problem_image = "reference"
                elif "img2_path" in error_message:
                    problem_image = "verification"
                else:
                    problem_image = "one or both"
                
                logger.warning(f"Possible spoofing or image processing error in {problem_image} image: {error_message}")
                
                # Return a more general error that covers both possibilities
                raise HTTPException(
                    status_code=400, 
                    detail=f"Unable to process the {problem_image} image. This may be due to spoofing detection or image quality issues. Please provide a clear, non-manipulated face image."
                )
            
            # Check for common errors and provide more user-friendly messages
            if "face could not be detected" in error_message.lower():
                raise HTTPException(status_code=400, detail="No face detected in one or both images. Please provide clear images with a visible face.")
            elif "more than one face" in error_message.lower():
                raise HTTPException(status_code=400, detail="Multiple faces detected in the image. Please provide an image with only one face.")
            else:
                raise HTTPException(status_code=400, detail=f"Face verification failed: {error_message}")
        
    except Exception as e:
        if isinstance(e, HTTPException):
            # Re-raise HTTP exceptions with their status codes
            raise
        logger.error(f"Error processing images: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing images: {str(e)}")
    
    finally:
        # Clean up temporary files
        try:
            if os.path.exists(ref_path):
                os.remove(ref_path)
            if os.path.exists(ver_path):
                os.remove(ver_path)
        except Exception as e:
            logger.error(f"Error cleaning up temp files: {str(e)}")

@app.post("/api/verify-face-base64")
async def verify_face_base64(
    reference_image: str = Form(...),
    verification_image: str = Form(...)
):
    """
    Verify if two faces match using base64 encoded images
    
    Args:
        reference_image: Base64 encoded reference image
        verification_image: Base64 encoded verification image
    
    Returns:
        JSON with verification result
    """
    logger.info("Face verification request received (base64)")
    
    try:
        # Decode base64 images
        try:
            # Handle data URL format (e.g., "data:image/jpeg;base64,/9j/4AAQ...")
            if reference_image.startswith('data:'):
                reference_image = reference_image.split(',')[1]
            
            if verification_image.startswith('data:'):
                verification_image = verification_image.split(',')[1]
                
            logger.info(f"Reference image size: {len(reference_image) / 1024:.2f} KB")
            logger.info(f"Verification image size: {len(verification_image) / 1024:.2f} KB")
            
            ref_bytes = base64.b64decode(reference_image)
            ver_bytes = base64.b64decode(verification_image)
            
            logger.info(f"Decoded reference image size: {len(ref_bytes) / 1024:.2f} KB")
            logger.info(f"Decoded verification image size: {len(ver_bytes) / 1024:.2f} KB")
            
        except Exception as e:
            logger.error(f"Error decoding base64 images: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid base64 image data: {str(e)}")
        
        # Create temporary files
        ref_path = TEMP_DIR / "ref_image.jpg"
        ver_path = TEMP_DIR / "ver_image.jpg"
        
        # Save decoded images
        with open(ref_path, "wb") as f:
            f.write(ref_bytes)
        
        with open(ver_path, "wb") as f:
            f.write(ver_bytes)
            
        logger.info(f"Base64 images saved to temp directory")
        
        # Verify faces using DeepFace with anti-spoofing enabled
        try:
            logger.info("Starting face verification with DeepFace (anti-spoofing enabled)")
            result = DeepFace.verify(
                img1_path=str(ref_path),
                img2_path=str(ver_path),
                model_name="VGG-Face",
                distance_metric="cosine",
                anti_spoofing=True  # Enable DeepFace's built-in anti-spoofing
            )
            
            logger.info(f"Verification result: {result}")
            
            # Return the verification result
            return {
                "verified": result["verified"],
                "distance": result["distance"],
                "threshold": result["threshold"],
                "model": result["model"],
                "detector_backend": result.get("detector_backend", "opencv"),
                "similarity_score": (1 - result["distance"]) * 100,  # Convert distance to similarity percentage
                "anti_spoofing": {
                    "real": True  # If we got here, anti-spoofing check passed
                }
            }
            
        except Exception as e:
            error_message = str(e)
            logger.error(f"DeepFace verification error: {error_message}")
            
            # Check for spoofing detection - expanded error patterns
            if ("spoofed image" in error_message.lower() or 
                "fake face" in error_message.lower()):
                
                # Clear spoofing detection messages
                logger.warning(f"Explicit spoofing detected: {error_message}")
                raise HTTPException(
                    status_code=400, 
                    detail="Spoofing detected. Please use a real face image, not a photo of a display or printed image."
                )
            
            # Generic "Exception while processing" - likely spoofing but could be other issues
            elif "exception while processing img" in error_message.lower():
                # Determine which image had the issue
                if "img1_path" in error_message:
                    problem_image = "reference"
                elif "img2_path" in error_message:
                    problem_image = "verification"
                else:
                    problem_image = "one or both"
                
                logger.warning(f"Possible spoofing or image processing error in {problem_image} image: {error_message}")
                
                # Return a more general error that covers both possibilities
                raise HTTPException(
                    status_code=400, 
                    detail=f"Unable to process the {problem_image} image. This may be due to spoofing detection or image quality issues. Please provide a clear, non-manipulated face image."
                )
            
            # Check for common errors and provide more user-friendly messages
            if "face could not be detected" in error_message.lower():
                raise HTTPException(status_code=400, detail="No face detected in one or both images. Please provide clear images with a visible face.")
            elif "more than one face" in error_message.lower():
                raise HTTPException(status_code=400, detail="Multiple faces detected in the image. Please provide an image with only one face.")
            else:
                raise HTTPException(status_code=400, detail=f"Face verification failed: {error_message}")
        
    except Exception as e:
        if isinstance(e, HTTPException):
            # Re-raise HTTP exceptions with their status codes
            raise
        logger.error(f"Error processing images: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing images: {str(e)}")
    
    finally:
        # Clean up temporary files
        try:
            if os.path.exists(ref_path):
                os.remove(ref_path)
            if os.path.exists(ver_path):
                os.remove(ver_path)
        except Exception as e:
            logger.error(f"Error cleaning up temp files: {str(e)}")

if __name__ == "__main__":
    # Run the FastAPI app using Uvicorn
    # If this script is run directly, ensure we use the correct paths
    import sys
    from pathlib import Path
    
    # Add the parent directory to sys.path if necessary
    current_file = Path(__file__).resolve()
    parent_dir = current_file.parent
    
    if parent_dir not in [Path(p) for p in sys.path]:
        sys.path.append(str(parent_dir))
    
    # Try different ports if the default is busy
    ports_to_try = [8000, 8080, 8888, 9000, 3000]
    
    for port in ports_to_try:
        try:
            print(f"Attempting to start server on port {port}")
            uvicorn.run(
                "main:app", 
                host="0.0.0.0", 
                port=port, 
                reload=False,
                log_level="info",
                limit_concurrency=10,  # Limit concurrent connections
                timeout_keep_alive=120,  # Longer keep-alive timeout
                # Configure higher request size limits
                http="h11",
                ws="none"  # Disable WebSockets to save resources
            )
            break  # If successful, exit the loop
        except OSError as e:
            if "address already in use" in str(e).lower() or "winerror 10048" in str(e).lower():
                print(f"Port {port} is already in use, trying next port")
                continue
            else:
                print(f"Error starting server: {e}")
                sys.exit(1)
        except Exception as e:
            print(f"Unexpected error starting server: {e}")
            sys.exit(1)
    else:
        print(f"Could not find an available port. Tried ports: {ports_to_try}")
        sys.exit(1) 