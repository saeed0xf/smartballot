# MongoDB Connection Troubleshooting Guide

This guide provides solutions for common MongoDB connection issues in the VoteSure application.

## Common Issues and Solutions

### 1. MongoDB Connection Failing

If you're seeing the error "Candidate added locally (MongoDB connection failed)" when adding candidates, follow these steps:

#### Check if MongoDB is running
```powershell
Get-Service -Name MongoDB
```

Make sure the Status is "Running". If not, start the service:
```powershell
Start-Service -Name MongoDB
```

#### Verify MongoDB Connection String
The application uses the connection string from `backend/.env`. Make sure it's correct:
```
MONGODB_URI=mongodb://127.0.0.1:27017/votesure
```

If using MongoDB Atlas or a remote server, update this URL with the correct connection string.

#### Allow MongoDB Through Firewall
If you're using a firewall, make sure port 27017 is open.

### 2. Authentication Issues

If you're getting authentication errors when making API requests:

#### Check JWT Token
Make sure your browser has a valid JWT token stored in localStorage. 

#### Verify Authentication Headers
The application should be sending the Authorization header with each request. Check the browser console for any errors related to this.

### 3. File Upload Issues

If files aren't being uploaded properly:

#### Check Upload Directory
Make sure the `uploads` directory exists in the backend folder and has write permissions.

#### Verify Form Data
Ensure that the FormData object is being created correctly with the right field names ('candidatePhoto' and 'partySymbol').

## Debugging Steps

1. **Check Backend Logs**: Look for any error messages in the backend console.
2. **Inspect Network Requests**: Use browser dev tools to check the request payload and response.
3. **Check MongoDB Connection**: Verify MongoDB is running and accessible.
4. **Test API Directly**: Use a tool like Postman to test the API endpoints directly.

## MongoDB Database Structure

The application uses the following collections:

- `candidates`: Stores candidate information
- `elections`: Stores election details
- `users`: Stores user accounts
- `voters`: Stores voter information

## How to Reset the Database

If you need to start fresh:

1. Open MongoDB Compass
2. Connect to your MongoDB instance
3. Find the "votesure" database
4. Delete collections as needed
5. Restart the application

## Checking MongoDB Contents

To check if candidates are being stored properly:

```javascript
// In MongoDB Compass or Shell
db.candidates.find().pretty()
```

This will show all stored candidates in a readable format. 