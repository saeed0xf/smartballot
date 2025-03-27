require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fileUpload = require('express-fileupload');

// Import routes
const authRoutes = require('./routes/auth.routes');
const voterRoutes = require('./routes/voter.routes');
const adminRoutes = require('./routes/admin.routes');
const electionRoutes = require('./routes/election.routes');
const officerRoutes = require('./routes/officer.routes');
const blockchainRoutes = require('./routes/blockchain.routes');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload middleware
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
}));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/voter', voterRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', electionRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/blockchain', blockchainRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to VoteSure API' });
});

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/votesure';
console.log('Attempting to connect to MongoDB at:', MONGODB_URI);

// MongoDB connection options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // Increase timeout to 10s
  family: 4 // Use IPv4, skip trying IPv6
};

mongoose.set('debug', true); // Enable debug mode to log all MongoDB operations

mongoose.connect(MONGODB_URI, mongooseOptions)
  .then(() => {
    console.log('Connected to MongoDB successfully');

    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    if (err.name === 'MongoNetworkError') {
      console.error('Please check that MongoDB is running and the connection string is correct');
    }

    // Start server even if MongoDB connection fails
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} (without MongoDB)`);
    });
  });

// For debugging - Print registered routes
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    // Routes registered directly on the app
    console.log(`${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    // Router middleware
    middleware.handle.stack.forEach((handler) => {
      if (handler.route) {
        const path = handler.route.path;
        const methods = Object.keys(handler.route.methods);
        console.log(`${methods} /api${path}`);
      }
    });
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' 
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
}); 