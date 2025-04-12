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

# Create FastAPI app
app = FastAPI(title="VoteSure Face Verification API")

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
        # Create temporary files for the images
        ref_path = TEMP_DIR / f"ref_{reference_image.filename}"
        ver_path = TEMP_DIR / f"ver_{verification_image.filename}"
        
        # Save uploaded files to temp directory
        with open(ref_path, "wb") as f:
            shutil.copyfileobj(reference_image.file, f)
        
        with open(ver_path, "wb") as f:
            shutil.copyfileobj(verification_image.file, f)
            
        logger.info(f"Images saved to temp directory: {ref_path}, {ver_path}")
        
        # Run custom anti-spoofing check on both images
        ref_spoof_check = check_anti_spoofing(ref_path)
        ver_spoof_check = check_anti_spoofing(ver_path)
        
        # Combined anti-spoofing result
        is_spoofed = not ref_spoof_check["real"] or not ver_spoof_check["real"]
        logger.info(f"Anti-spoofing results: ref={ref_spoof_check['real']}, ver={ver_spoof_check['real']}")
        
        # Check if either image is detected as a spoof before proceeding
        if is_spoofed:
            # Identify which image(s) failed the check
            failed_images = []
            if not ref_spoof_check["real"]:
                failed_images.append("reference")
            if not ver_spoof_check["real"]:
                failed_images.append("verification")
                
            detail_message = f"Spoofing detected in {' and '.join(failed_images)} image(s). Please use real face images, not photos of displays or printed images."
            
            combined_check = {
                "real": False,
                "ref_score": ref_spoof_check["score"],
                "ver_score": ver_spoof_check["score"],
                "failed_images": failed_images
            }
            
            logger.warning(f"Spoofing attempt detected: {combined_check}")
            raise HTTPException(status_code=400, detail=detail_message)
        
        # Verify faces using DeepFace
        try:
            logger.info("Starting face verification with DeepFace")
            result = DeepFace.verify(
                img1_path=str(ref_path),
                img2_path=str(ver_path),
                model_name="VGG-Face",
                distance_metric="cosine",
                anti_spoofing=True
            )
            
            logger.info(f"Verification result: {result}")
            
            # Combine our custom anti-spoofing with DeepFace results
            anti_spoofing_result = {
                "real": True,  # We already checked above and would have raised an exception if spoofed
                "reference_score": ref_spoof_check["score"],
                "verification_score": ver_spoof_check["score"],
                "details": {
                    "reference": ref_spoof_check.get("details", {}),
                    "verification": ver_spoof_check.get("details", {})
                }
            }
            
            # Return the verification result
            return {
                "verified": result["verified"],
                "distance": result["distance"],
                "threshold": result["threshold"],
                "model": result["model"],
                "detector_backend": result.get("detector_backend", "opencv"),
                "similarity_score": (1 - result["distance"]) * 100,  # Convert distance to similarity percentage
                "anti_spoofing": anti_spoofing_result
            }
            
        except HTTPException:
            # Re-raise HTTP exceptions (like the spoofing detection one)
            raise
        except Exception as e:
            error_message = str(e)
            logger.error(f"DeepFace verification error: {error_message}")
            
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
                
            ref_bytes = base64.b64decode(reference_image)
            ver_bytes = base64.b64decode(verification_image)
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
        
        # Run custom anti-spoofing check on both images
        ref_spoof_check = check_anti_spoofing(ref_path)
        ver_spoof_check = check_anti_spoofing(ver_path)
        
        # Combined anti-spoofing result
        is_spoofed = not ref_spoof_check["real"] or not ver_spoof_check["real"]
        logger.info(f"Anti-spoofing results: ref={ref_spoof_check['real']}, ver={ver_spoof_check['real']}")
        
        # Check if either image is detected as a spoof before proceeding
        if is_spoofed:
            # Identify which image(s) failed the check
            failed_images = []
            if not ref_spoof_check["real"]:
                failed_images.append("reference")
            if not ver_spoof_check["real"]:
                failed_images.append("verification")
                
            detail_message = f"Spoofing detected in {' and '.join(failed_images)} image(s). Please use real face images, not photos of displays or printed images."
            
            combined_check = {
                "real": False,
                "ref_score": ref_spoof_check["score"],
                "ver_score": ver_spoof_check["score"],
                "failed_images": failed_images
            }
            
            logger.warning(f"Spoofing attempt detected: {combined_check}")
            raise HTTPException(status_code=400, detail=detail_message)
        
        # Verify faces using DeepFace
        try:
            logger.info("Starting face verification with DeepFace")
            result = DeepFace.verify(
                img1_path=str(ref_path),
                img2_path=str(ver_path),
                model_name="VGG-Face", 
                distance_metric="cosine",
                anti_spoofing=True
            )
            
            logger.info(f"Verification result: {result}")
            
            # Combine our custom anti-spoofing with DeepFace results
            anti_spoofing_result = {
                "real": True,  # We already checked above and would have raised an exception if spoofed
                "reference_score": ref_spoof_check["score"],
                "verification_score": ver_spoof_check["score"],
                "details": {
                    "reference": ref_spoof_check.get("details", {}),
                    "verification": ver_spoof_check.get("details", {})
                }
            }
            
            # Return the verification result
            return {
                "verified": result["verified"],
                "distance": result["distance"],
                "threshold": result["threshold"],
                "model": result["model"],
                "detector_backend": result.get("detector_backend", "opencv"),
                "similarity_score": (1 - result["distance"]) * 100,  # Convert distance to similarity percentage
                "anti_spoofing": anti_spoofing_result
            }
            
        except HTTPException:
            # Re-raise HTTP exceptions (like the spoofing detection one)
            raise
        except Exception as e:
            error_message = str(e)
            logger.error(f"DeepFace verification error: {error_message}")
            
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

# Advanced anti-spoofing utility
def check_anti_spoofing(image_path):
    """
    Enhanced anti-spoofing detection that identifies images from screens and printed photos.
    
    Args:
        image_path: Path to the image file
        
    Returns:
        dict: Anti-spoofing results with real/fake determination and confidence score
    """
    try:
        # Read the image
        img = cv2.imread(str(image_path))
        if img is None:
            raise ValueError(f"Failed to read image from {image_path}")
            
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Check for moiré patterns (often indicates screen capture)
        # Apply FFT to detect screen patterns
        f_transform = np.fft.fft2(gray)
        f_shift = np.fft.fftshift(f_transform)
        magnitude_spectrum = 20 * np.log(np.abs(f_shift) + 1)
        
        # Check high-frequency components which indicate screen capture
        height, width = gray.shape
        center_y, center_x = height // 2, width // 2
        mask_size = 30
        mask = magnitude_spectrum[center_y-mask_size:center_y+mask_size, center_x-mask_size:center_x+mask_size]
        
        # Calculate mean and std of high frequencies
        high_freq_mean = np.mean(mask)
        high_freq_std = np.std(mask)
        
        # Second method: look for uniform grid patterns using edge detection
        edges = cv2.Canny(gray, 50, 150)
        horizontal_lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=100, minLineLength=width//4, maxLineGap=20)
        vertical_lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=100, minLineLength=height//4, maxLineGap=20)
        
        # Count detected lines
        h_lines = 0 if horizontal_lines is None else len(horizontal_lines)
        v_lines = 0 if vertical_lines is None else len(vertical_lines)
        
        # Third method: check texture consistency
        texture_blocks = []
        block_size = 16
        for y in range(0, height, block_size):
            for x in range(0, width, block_size):
                if y+block_size <= height and x+block_size <= width:
                    block = gray[y:y+block_size, x:x+block_size]
                    texture_blocks.append(np.std(block))
        
        texture_std = np.std(texture_blocks)
        
        # Combine features to make a decision
        # High frequency patterns and regular grid lines indicate screen capture
        screen_score = (high_freq_std / high_freq_mean) + (h_lines * v_lines / (width * height * 0.01))
        
        # Low texture variation can indicate printed photos
        print_score = 1.0 - (texture_std / 50.0)  # Normalize to 0-1 range
        
        # Combined spoofing score 
        spoof_score = max(screen_score / 10.0, print_score)
        spoof_score = min(spoof_score, 1.0)  # Cap at 1.0
        
        # Decision threshold
        is_real = spoof_score < 0.6
        
        logger.info(f"Anti-spoofing results for {image_path}: score={spoof_score:.3f}, real={is_real}")
        logger.debug(f"Anti-spoofing details: high_freq_mean={high_freq_mean:.2f}, high_freq_std={high_freq_std:.2f}, " +
                     f"h_lines={h_lines}, v_lines={v_lines}, texture_std={texture_std:.2f}")
        
        return {
            "real": is_real,
            "score": 1.0 - spoof_score,  # Convert to realness score
            "details": {
                "screen_score": float(screen_score / 10.0),
                "print_score": float(print_score),
                "texture_variation": float(texture_std)
            }
        }
    except Exception as e:
        logger.error(f"Error in anti-spoofing check: {str(e)}")
        # Return default value on error
        return {"real": True, "score": 0.5, "error": str(e)}

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
            uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
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