const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  console.log('Creating uploads directory:', uploadsDir);
  fs.mkdirSync(uploadsDir, { recursive: true });
}

console.log('Upload directory path:', uploadsDir);
console.log('Upload directory exists:', fs.existsSync(uploadsDir));
console.log('Upload directory permissions:', fs.statSync(uploadsDir).mode.toString(8));

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('File being uploaded to:', uploadsDir);
    console.log('File details:', file);
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  console.log('Filtering file:', file.originalname, 'mimetype:', file.mimetype);
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    console.log('File rejected: not an allowed image type');
    return cb(new Error('Only image files are allowed (jpg, jpeg, png, gif)!'), false);
  }
  console.log('File accepted');
  cb(null, true);
};

// Create upload middleware with error handling
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 1 // Only allow 1 file upload at a time
  },
  fileFilter: fileFilter
});

// Create a wrapper to handle errors
const uploadErrorHandler = (fieldName) => {
  return (req, res, next) => {
    console.log(`Starting file upload for field: ${fieldName}`);
    console.log('Request headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);
    
    const multerSingle = upload.single(fieldName);
    
    multerSingle(req, res, (err) => {
      if (err) {
        console.error('File upload error:', err);
        if (err instanceof multer.MulterError) {
          console.error('Multer error code:', err.code);
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File is too large. Maximum file size is 5MB.' });
          } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ message: `Unexpected file field. Expected: ${fieldName}` });
          }
          return res.status(400).json({ message: `File upload error: ${err.message}`, code: err.code });
        }
        return res.status(400).json({ message: err.message || 'Error uploading file' });
      }
      
      console.log('File upload complete');
      console.log('Request body after upload:', req.body);
      console.log('File after upload:', req.file);
      
      // No file was provided but field was required
      if (fieldName && !req.file) {
        console.log('No file was provided for field:', fieldName);
        return res.status(400).json({ message: 'Voter ID image is required' });
      }
      
      next();
    });
  };
};

module.exports = {
  upload,
  uploadErrorHandler
}; 