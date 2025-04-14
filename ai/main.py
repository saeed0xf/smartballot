from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from deepface import DeepFace
import numpy as np
import cv2
import os
import logging
import base64
import aiohttp
import asyncio
from pathlib import Path
import aiofiles
import sys

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define application root directory for consistent path resolution
ROOT_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
logger.info(f"Application root directory: {ROOT_DIR}")

# Define temp directory
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

@app.get("/healthcheck")
async def healthcheck():
    """Simple healthcheck endpoint to verify the API is working"""
    return {
        "status": "ok",
        "app_info": {
            "name": "VoteSure Face Verification API",
            "directories": {
                "root": str(ROOT_DIR),
                "temp": str(TEMP_DIR)
            }
        }
    }

async def download_image(url, file_path):
    """Download an image from a URL and save it to a file path"""
    try:
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(url, timeout=5) as response:
                    if response.status != 200:
                        logger.error(f"Error downloading image. Status: {response.status}, URL: {url}")
                        return False
                    
                    content = await response.read()
                    
                    async with aiofiles.open(file_path, 'wb') as f:
                        await f.write(content)
                    
                    return True
            except aiohttp.ClientConnectorError:
                logger.error(f"Failed to connect to image server at {url}. The service may be down.")
                return False
            except aiohttp.ClientError as e:
                logger.error(f"HTTP client error when downloading image: {str(e)}")
                return False
            except asyncio.TimeoutError:
                logger.error(f"Timeout when downloading image from {url}")
                return False
    except Exception as e:
        logger.error(f"Error downloading image from {url}: {str(e)}")
        return False

async def get_voter_image_url(voter_id):
    """Get the image URL for a voter from the voter database API"""
    try:
        # Fetch voter data from the API
        voter_api_url = f"http://localhost:9001/api/voters/id/{voter_id}"
        logger.info(f"Fetching voter data from: {voter_api_url}")
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(voter_api_url, timeout=5) as response:
                    if response.status != 200:
                        logger.error(f"Error fetching voter data. Status: {response.status}, URL: {voter_api_url}")
                        return None
                    
                    voter_data = await response.json()
                    
                    # Extract the photo URL from the response
                    if "photoUrl" not in voter_data:
                        logger.error(f"No photoUrl found in voter data: {voter_data}")
                        return None
                    
                    photo_url = voter_data["photoUrl"]
                    
                    # Construct the full URL for the image
                    if photo_url.startswith("http"):
                        # If it's already a full URL, use it as is
                        return photo_url
                    else:
                        # Otherwise, construct the full URL
                        return f"http://localhost:9001{photo_url}"
            except aiohttp.ClientConnectorError:
                logger.error(f"Failed to connect to voter API at {voter_api_url}. The service may be down.")
                return None
            except aiohttp.ClientError as e:
                logger.error(f"HTTP client error when accessing voter API: {str(e)}")
                return None
            except asyncio.TimeoutError:
                logger.error(f"Timeout when connecting to voter API at {voter_api_url}")
                return None
    
    except Exception as e:
        logger.error(f"Error getting voter image URL: {str(e)}")
        return None

@app.post("/api/verify")
async def verify_face_with_voter_id(
    uploaded_image: UploadFile = File(...),
    voter_id: str = Form(...)
):
    """
    Verify if a face matches the reference image from the voter database
    
    Args:
        uploaded_image: The face image uploaded by the client
        voter_id: The voter ID to fetch the reference image from the voter database
        
    Returns:
        JSON with verification result
    """
    logger.info(f"Face verification request received for voter ID: {voter_id}")
    
    # Create temporary files for the images
    upload_path = TEMP_DIR / f"uploaded_{uploaded_image.filename}"
    ref_path = TEMP_DIR / f"reference_{voter_id}.jpg"
    
    try:
        # Save uploaded file
        try:
            async with aiofiles.open(upload_path, "wb") as buffer:
                # Read in chunks to handle large files
                content = await uploaded_image.read()
                await buffer.write(content)
                
            logger.info(f"Saved uploaded image: {upload_path}")
        except Exception as e:
            logger.error(f"Error saving uploaded file: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": "Error processing uploaded image",
                    "details": str(e)
                }
            )
        
        # Fetch reference image from voter database API
        voter_image_url = await get_voter_image_url(voter_id)
        if not voter_image_url:
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "error": f"Voter not found",
                    "details": f"Could not retrieve image for voter ID: {voter_id}"
                }
            )
        
        logger.info(f"Fetching reference image from: {voter_image_url}")
        
        download_success = await download_image(voter_image_url, ref_path)
        if not download_success:
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "error": "Reference image unavailable",
                    "details": f"Could not download reference image for voter ID: {voter_id}"
                }
            )
        
        logger.info(f"Reference image downloaded and saved to: {ref_path}")
        
        # Verify faces using DeepFace
        try:
            logger.info("Starting face verification with DeepFace")
            result = DeepFace.verify(
                img1_path=str(upload_path),
                img2_path=str(ref_path),
                model_name="VGG-Face",
                distance_metric="cosine",
                detector_backend="opencv",
                anti_spoofing=True
            )
            
            logger.info(f"Verification result: {result}")
            
            # Calculate similarity score
            similarity_score = (1 - result["distance"]) * 100
            
            # Return the verification result with appropriate message
            response_data = {
                "success": True,
                "verified": result["verified"],
                "distance": result["distance"],
                "threshold": result["threshold"],
                "model": result["model"],
                "detector_backend": result.get("detector_backend", "opencv"),
                "similarity_score": similarity_score,
                "voter_id": voter_id
            }
            
            # Add appropriate message based on verification result
            if result["verified"]:
                response_data["message"] = "Face verification successful. Identity confirmed."
            else:
                response_data["message"] = "Face verification failed. This does not match the registered voter."
            
            return response_data
            
        except Exception as e:
            error_message = str(e)
            logger.error(f"DeepFace verification error: {error_message}")
            
            # Check for spoofing detection
            if ("spoofed image" in error_message.lower() or 
                "fake face" in error_message.lower()):
                logger.warning(f"Explicit spoofing detected: {error_message}")
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": "Spoofing detected",
                        "message": "Please use a real face image, not a photo of a display or printed image.",
                        "details": error_message
                    }
                )
            
            # Handle exceptions related to processing in the uploaded image (likely spoofing)
            elif "exception while processing img1_path" in error_message.lower():
                logger.warning(f"Potential spoofing detected in uploaded image: {error_message}")
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": "Potential spoofing detected",
                        "message": "The system detected potential spoofing in the uploaded image.",
                        "details": error_message
                    }
                )
            
            # Handle exceptions related to processing in the reference image
            elif "exception while processing img2_path" in error_message.lower():
                logger.warning(f"Issue with reference image: {error_message}")
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": "Reference image issue",
                        "message": "There is an issue with the stored reference image.",
                        "details": error_message
                    }
                )
            
            # Common face detection errors
            elif "face could not be detected" in error_message.lower():
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": "No face detected",
                        "message": "No face detected in one or both images. Please provide a clear image with a visible face.",
                        "details": error_message
                    }
                )
            elif "more than one face" in error_message.lower():
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": "Multiple faces detected",
                        "message": "Multiple faces detected in the image. Please provide an image with only one face.",
                        "details": error_message
                    }
                )
            else:
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": "Verification failed",
                        "message": "Face verification process failed.",
                        "details": error_message
                    }
                )
        
    except Exception as e:
        if isinstance(e, HTTPException):
            # Re-raise HTTP exceptions with their status codes
            raise
        logger.error(f"Error processing images: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Server error",
                "message": "An unexpected error occurred during verification.",
                "details": str(e)
            }
        )
    
    finally:
        # Clean up temporary files
        try:
            if os.path.exists(upload_path):
                os.remove(upload_path)
            if os.path.exists(ref_path):
                os.remove(ref_path)
        except Exception as e:
            logger.error(f"Error cleaning up temp files: {str(e)}")

@app.post("/api/verify-base64")
async def verify_face_base64_with_voter_id(
    uploaded_image: str = Form(...),
    voter_id: str = Form(...)
):
    """
    Verify if a face matches the reference image using base64 encoded image
    
    Args:
        uploaded_image: Base64 encoded image uploaded by the client
        voter_id: The voter ID to fetch the reference image from the voter database
        
    Returns:
        JSON with verification result
    """
    logger.info(f"Base64 face verification request received for voter ID: {voter_id}")
    
    # Create temporary files for the images
    upload_path = TEMP_DIR / f"uploaded_base64_{voter_id}.jpg"
    ref_path = TEMP_DIR / f"reference_{voter_id}.jpg"
    
    try:
        # Decode base64 image
        try:
            # Handle data URL format (e.g., "data:image/jpeg;base64,/9j/4AAQ...")
            if uploaded_image.startswith('data:'):
                uploaded_image = uploaded_image.split(',')[1]
                
            upload_bytes = base64.b64decode(uploaded_image)
            
            async with aiofiles.open(upload_path, "wb") as f:
                await f.write(upload_bytes)
                
            logger.info(f"Decoded base64 image saved to: {upload_path}")
            
        except Exception as e:
            logger.error(f"Error decoding base64 image: {str(e)}")
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Invalid image data",
                    "message": "The provided base64 image data is invalid or corrupted.",
                    "details": str(e)
                }
            )
        
        # Fetch reference image from voter database API
        voter_image_url = await get_voter_image_url(voter_id)
        if not voter_image_url:
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "error": "Voter not found",
                    "details": f"Could not retrieve image for voter ID: {voter_id}"
                }
            )
        
        logger.info(f"Fetching reference image from: {voter_image_url}")
        
        download_success = await download_image(voter_image_url, ref_path)
        if not download_success:
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "error": "Reference image unavailable",
                    "details": f"Could not download reference image for voter ID: {voter_id}"
                }
            )
        
        logger.info(f"Reference image downloaded and saved to: {ref_path}")
        
        # Verify faces using DeepFace
        try:
            logger.info("Starting face verification with DeepFace")
            result = DeepFace.verify(
                img1_path=str(upload_path),
                img2_path=str(ref_path),
                model_name="VGG-Face",
                distance_metric="cosine",
                detector_backend="opencv",
                anti_spoofing=True
            )
            
            logger.info(f"Verification result: {result}")
            
            # Calculate similarity score
            similarity_score = (1 - result["distance"]) * 100
            
            # Return the verification result with appropriate message
            response_data = {
                "success": True,
                "verified": result["verified"],
                "distance": result["distance"],
                "threshold": result["threshold"],
                "model": result["model"],
                "detector_backend": result.get("detector_backend", "opencv"),
                "similarity_score": similarity_score,
                "voter_id": voter_id
            }
            
            # Add appropriate message based on verification result
            if result["verified"]:
                response_data["message"] = "Face verification successful. Identity confirmed."
            else:
                response_data["message"] = "Face verification failed. This does not match the registered voter."
            
            return response_data
            
        except Exception as e:
            error_message = str(e)
            logger.error(f"DeepFace verification error: {error_message}")
            
            # Check for spoofing detection
            if ("spoofed image" in error_message.lower() or 
                "fake face" in error_message.lower()):
                logger.warning(f"Explicit spoofing detected: {error_message}")
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": "Spoofing detected",
                        "message": "Please use a real face image, not a photo of a display or printed image.",
                        "details": error_message
                    }
                )
            
            # Handle exceptions related to processing in the uploaded image (likely spoofing)
            elif "exception while processing img1_path" in error_message.lower():
                logger.warning(f"Potential spoofing detected in uploaded image: {error_message}")
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": "Potential spoofing detected",
                        "message": "The system detected potential spoofing in the uploaded image.",
                        "details": error_message
                    }
                )
            
            # Handle exceptions related to processing in the reference image
            elif "exception while processing img2_path" in error_message.lower():
                logger.warning(f"Issue with reference image: {error_message}")
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": "Reference image issue",
                        "message": "There is an issue with the stored reference image.",
                        "details": error_message
                    }
                )
            
            # Common face detection errors
            elif "face could not be detected" in error_message.lower():
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": "No face detected",
                        "message": "No face detected in one or both images. Please provide a clear image with a visible face.",
                        "details": error_message
                    }
                )
            elif "more than one face" in error_message.lower():
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": "Multiple faces detected",
                        "message": "Multiple faces detected in the image. Please provide an image with only one face.",
                        "details": error_message
                    }
                )
            else:
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": "Verification failed",
                        "message": "Face verification process failed.",
                        "details": error_message
                    }
                )
        
    except Exception as e:
        if isinstance(e, HTTPException):
            # Re-raise HTTP exceptions with their status codes
            raise
        logger.error(f"Error processing images: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Server error",
                "message": "An unexpected error occurred during verification.",
                "details": str(e)
            }
        )
    
    finally:
        # Clean up temporary files
        try:
            if os.path.exists(upload_path):
                os.remove(upload_path)
            if os.path.exists(ref_path):
                os.remove(ref_path)
        except Exception as e:
            logger.error(f"Error cleaning up temp files: {str(e)}")

if __name__ == "__main__":
    # Run the FastAPI app using Uvicorn
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
                limit_concurrency=10,
                timeout_keep_alive=120,
                http="h11",
                ws="none"
            )
            break
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