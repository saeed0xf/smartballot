# ID Locker - Voter Management System

A digital voter records management system built with the MERN stack (MongoDB, Express, React, Node.js).

## Features

- Admin authentication system
- Dashboard with voter statistics
- Comprehensive voter management:
  - Add new voters with photo upload
  - View all voters with search and pagination
  - Update voter information
  - Delete voter records
  - View detailed voter profiles
- Automatic age calculation from date of birth
- Responsive design

## Tech Stack

### Backend
- Node.js with Express
- TypeScript for type safety
- MongoDB with Mongoose
- JWT for authentication
- Multer for file uploads
- bcrypt for password hashing

### Frontend
- React with TypeScript
- React Router for navigation
- React Hook Form for form handling
- TailwindCSS for styling
- Axios for API calls
- React Toastify for notifications

## API Documentation

### Base URL
```
http://localhost:9001/api
```

### Authentication Endpoints

#### Login
- **URL**: `/auth/login`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "admin@idlocker.com",
    "password": "admin123"
  }
  ```
- **Success Response**: 
  ```json
  {
    "token": "jwt_token_string",
    "user": {
      "id": "user_id",
      "username": "admin",
      "email": "admin@idlocker.com"
    }
  }
  ```
- **Error Response**: 
  ```json
  {
    "message": "Invalid credentials"
  }
  ```

#### Get Current User
- **URL**: `/auth/me`
- **Method**: `GET`
- **Headers**: 
  ```
  Authorization: Bearer jwt_token_string
  ```
- **Success Response**: 
  ```json
  {
    "_id": "user_id",
    "username": "admin",
    "email": "admin@idlocker.com",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
  ```
- **Error Response**: 
  ```json
  {
    "message": "User not found"
  }
  ```

#### Initialize Admin (One-time use)
- **URL**: `/auth/init-admin`
- **Method**: `POST`
- **Success Response**: 
  ```json
  {
    "message": "Admin user created successfully"
  }
  ```
- **Error Response**: 
  ```json
  {
    "message": "Admin user already exists"
  }
  ```

### Voter Management Endpoints

#### Get All Voters
- **URL**: `/voters`
- **Method**: `GET`
- **Headers**: 
  ```
  Authorization: Bearer jwt_token_string
  ```
- **Success Response**: 
  ```json
  [
    {
      "_id": "voter_id",
      "firstName": "John",
      "middleName": "",
      "lastName": "Doe",
      "fatherName": "James Doe",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "age": 33,
      "voterId": "ABC123456",
      "email": "john@example.com",
      "phoneNumber": "1234567890",
      "gender": "Male",
      "photoUrl": "/uploads/1620000000000-photo.jpg",
      "address": "123 Main St",
      "pollingStation": "Station A",
      "ward": "Ward 1",
      "constituency": "East District",
      "notes": "Some notes",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    },
    // More voters...
  ]
  ```
- **Error Response**: 
  ```json
  {
    "message": "Server error"
  }
  ```

#### Get Voter by ID
- **URL**: `/voters/:id`
- **Method**: `GET`
- **Headers**: 
  ```
  Authorization: Bearer jwt_token_string
  ```
- **URL Parameters**: `:id` - MongoDB ID of the voter
- **Success Response**: 
  ```json
  {
    "_id": "voter_id",
    "firstName": "John",
    "middleName": "",
    "lastName": "Doe",
    "fatherName": "James Doe",
    "dateOfBirth": "1990-01-01T00:00:00.000Z",
    "age": 33,
    "voterId": "ABC123456",
    "email": "john@example.com",
    "phoneNumber": "1234567890",
    "gender": "Male",
    "photoUrl": "/uploads/1620000000000-photo.jpg",
    "address": "123 Main St",
    "pollingStation": "Station A",
    "ward": "Ward 1",
    "constituency": "East District",
    "notes": "Some notes",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
  ```
- **Error Response**: 
  ```json
  {
    "message": "Voter not found"
  }
  ```

#### Get Voter by Voter ID (Public API)
- **URL**: `/voters/id/:voterId`
- **Method**: `GET`
- **URL Parameters**: `:voterId` - Government-issued Voter ID
- **Success Response**: Same as "Get Voter by ID"
- **Error Response**: 
  ```json
  {
    "message": "Voter not found"
  }
  ```

#### Create Voter
- **URL**: `/voters`
- **Method**: `POST`
- **Headers**: 
  ```
  Authorization: Bearer jwt_token_string
  Content-Type: multipart/form-data
  ```
- **Request Body**: Form Data
  ```
  firstName: "John"
  middleName: ""  // Optional
  lastName: "Doe"
  fatherName: "James Doe"
  dateOfBirth: "1990-01-01"
  voterId: "ABC123456"
  email: "john@example.com"
  phoneNumber: "1234567890"
  gender: "Male"  // "Male", "Female", or "Other"
  photo: [File]  // Photo file, max 5MB, formats: jpg, jpeg, png, gif
  address: "123 Main St"  // Optional
  pollingStation: "Station A"  // Optional
  ward: "Ward 1"  // Optional
  constituency: "East District"  // Optional
  notes: "Some notes"  // Optional
  ```
- **Success Response**: 
  ```json
  {
    "_id": "voter_id",
    "firstName": "John",
    "middleName": "",
    "lastName": "Doe",
    "fatherName": "James Doe",
    "dateOfBirth": "1990-01-01T00:00:00.000Z",
    "age": 33,
    "voterId": "ABC123456",
    "email": "john@example.com",
    "phoneNumber": "1234567890",
    "gender": "Male",
    "photoUrl": "/uploads/1620000000000-photo.jpg",
    "address": "123 Main St",
    "pollingStation": "Station A",
    "ward": "Ward 1",
    "constituency": "East District",
    "notes": "Some notes",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
  ```
- **Error Responses**: 
  ```json
  {
    "message": "Please upload a photo"
  }
  ```
  ```json
  {
    "message": "Voter ID already exists",
    "field": "voterId"
  }
  ```
  ```json
  {
    "message": "Phone number already exists",
    "field": "phoneNumber"
  }
  ```

#### Update Voter
- **URL**: `/voters/:id`
- **Method**: `PUT`
- **Headers**: 
  ```
  Authorization: Bearer jwt_token_string
  Content-Type: multipart/form-data
  ```
- **URL Parameters**: `:id` - MongoDB ID of the voter
- **Request Body**: Form Data (same fields as Create Voter)
  - The photo field is optional for updates. If not provided, the existing photo will be kept.
- **Success Response**: Updated voter object (same format as Get Voter by ID)
- **Error Responses**: Same as Create Voter, plus:
  ```json
  {
    "message": "Voter not found"
  }
  ```

#### Delete Voter
- **URL**: `/voters/:id`
- **Method**: `DELETE`
- **Headers**: 
  ```
  Authorization: Bearer jwt_token_string
  ```
- **URL Parameters**: `:id` - MongoDB ID of the voter
- **Success Response**: 
  ```json
  {
    "message": "Voter deleted successfully"
  }
  ```
- **Error Response**: 
  ```json
  {
    "message": "Voter not found"
  }
  ```

## Image Handling
- Images are stored in the `/uploads` directory on the server
- The full image URL is constructed by combining `SERVER_URL` (http://localhost:9001) with the `photoUrl` field from the voter object
- Maximum image size: 5MB
- Supported formats: JPEG, JPG, PNG, GIF

## Getting Started

### Prerequisites
- Node.js (v14 or later)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository
```
git clone <repository-url>
cd idlocker
```

2. Install backend dependencies
```
cd backend
npm install
```

3. Install frontend dependencies
```
cd ../frontend
npm install
```

4. Create a `.env` file in the backend directory with the following variables:
```
PORT=9000
MONGO_URI=mongodb://localhost:27017/idlocker
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

5. Create the 'uploads' directory in the backend folder
```
cd ../backend
mkdir uploads
```

### Running the Application

1. Start the backend server (from the backend directory)
```
npm run dev
```

2. Start the frontend development server (from the frontend directory)
```
npm run dev
```

3. Initialize the admin user (one-time operation)
```
npm run seed
```

4. Access the application at:
   - Frontend: http://localhost:9000
   - Backend API: http://localhost:9000/api

### Default Admin Credentials
- Email: admin@idlocker.com
- Password: admin123

## Building for Production

1. Build the backend
```
cd backend
npm run build
```

2. Build the frontend
```
cd ../frontend
npm run build
```

3. To start in production mode
```
cd ../backend
npm start
```

## License

This project is licensed under the MIT License. 