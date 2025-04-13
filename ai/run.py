#!/usr/bin/env python
"""
VoteSure Face Verification API
Start-up script for running the API server
"""

import uvicorn
import os
import sys
import logging
from pathlib import Path
import subprocess

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("VoteSure-AI")

def create_directories():
    """Create necessary directories if they don't exist"""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Define all required directories
    directories = {
        "temp": os.path.join(base_dir, "temp"),
        "static": os.path.join(base_dir, "static"), 
        "templates": os.path.join(base_dir, "templates")
    }
    
    # Create each directory if it doesn't exist
    for name, dir_path in directories.items():
        path = Path(dir_path)
        if not path.exists():
            logger.info(f"Creating {name} directory: {path}")
            try:
                path.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                logger.error(f"Failed to create {name} directory: {e}")
                sys.exit(1)
        else:
            logger.info(f"{name.capitalize()} directory exists at: {path}")

def find_process_on_port(port):
    """Find processes using a specific port on Windows"""
    try:
        # Run netstat to find processes using the port
        result = subprocess.run(
            f'netstat -ano | findstr :{port}', 
            shell=True, 
            capture_output=True, 
            text=True
        )
        
        if result.returncode != 0 or not result.stdout.strip():
            logger.info(f"No process found using port {port}")
            return None
        
        # Parse the output to find PIDs
        lines = result.stdout.strip().split('\n')
        pids = set()
        
        for line in lines:
            parts = line.strip().split()
            if len(parts) >= 5 and parts[1].endswith(f":{port}"):
                pids.add(parts[4])
        
        if not pids:
            logger.info(f"No PID found for processes using port {port}")
            return None
        
        logger.info(f"Found PIDs using port {port}: {', '.join(pids)}")
        return list(pids)
        
    except Exception as e:
        logger.error(f"Error finding processes on port {port}: {e}")
        return None

def kill_process_on_port(port, ask_confirmation=True):
    """Kill processes using a specific port on Windows"""
    pids = find_process_on_port(port)
    
    if not pids:
        return False
    
    for pid in pids:
        try:
            if ask_confirmation:
                logger.info(f"Found process with PID {pid} using port {port}")
                logger.info("This may be another instance of the application.")
                return False
            
            # Kill the process
            subprocess.run(f"taskkill /PID {pid} /F", shell=True, check=True)
            logger.info(f"Successfully killed process with PID {pid}")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to kill process with PID {pid}: {e}")
            return False
        except Exception as e:
            logger.error(f"Error killing process with PID {pid}: {e}")
            return False
    
    return False

def main():
    """Main entry point for running the Face Verification API"""
    logger.info("Starting VoteSure Face Verification API")
    
    # Print current working directory for debugging
    cwd = os.getcwd()
    logger.info(f"Current working directory: {cwd}")
    
    # Print Python path for debugging
    logger.info(f"Python path: {sys.path}")
    
    # Create necessary directories
    create_directories()
    
    # Get port from environment or use default
    start_port = int(os.environ.get("PORT", 8000))
    # Define a range of ports to try in case the primary port is busy
    ports_to_try = [start_port, 8080, 8888, 9000, 3000]
    
    # Set module path
    module_path = "main:app"
    
    # Try each port in sequence until one works
    for port in ports_to_try:
        try:
            logger.info(f"Attempting to start server on port {port}")
            
            # Check if port is already in use and identify the processes
            find_process_on_port(port)
            
            uvicorn.run(
                module_path,
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
            # If we get here, the server started successfully
            break
        except OSError as e:
            if "address already in use" in str(e).lower() or "winerror 10048" in str(e).lower():
                logger.warning(f"Port {port} is already in use, trying next port")
                # Display process information for better debugging
                logger.info(f"To manually terminate processes using port {port}, run: taskkill /PID <pid> /F")
                continue
            else:
                # For other OS errors, we should log and exit
                logger.error(f"Error starting server: {e}")
                sys.exit(1)
        except Exception as e:
            # Log any other exceptions and exit
            logger.error(f"Unexpected error starting server: {e}")
            sys.exit(1)
    else:
        # This executes if we've tried all ports and none worked
        logger.error(f"Could not find an available port. Tried ports: {ports_to_try}")
        logger.error("Please manually terminate any processes using these ports and try again.")
        sys.exit(1)

if __name__ == "__main__":
    main() 