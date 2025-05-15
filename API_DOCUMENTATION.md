# VoteSure API Documentation

This document provides detailed information about the RESTful API endpoints available in the VoteSure system, including request parameters, response formats, and authentication requirements.

## Table of Contents

- [Authentication](#authentication)
- [Elections](#elections)
- [Candidates](#candidates)
- [Voters](#voters)
- [Admin Operations](#admin-operations)
- [Blockchain Integration](#blockchain-integration)
- [Voting](#voting)

## Authentication

### Register a new user

Register a new user in the system.

- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Auth required**: No

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "voter"  // Optional, defaults to 'voter'. Can be 'voter', 'admin', or 'officer'
}
```

**Success Response**:
- **Code**: 201 Created
- **Content**:
```json
{
  "message": "User registered successfully"
}
```

**Error Response**:
- **Code**: 400 Bad Request
- **Content**:
```json
{
  "message": "Email already in use"
}
```

### Get Nonce for MetaMask Authentication

Get a nonce to use for MetaMask signature verification.

- **URL**: `/api/auth/nonce`
- **Method**: `GET`
- **Auth required**: No

**Query Parameters**:
- `address`: Ethereum wallet address

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "nonce": "123456"
}
```

**Error Response**:
- **Code**: 400 Bad Request
- **Content**:
```json
{
  "message": "Address is required"
}
```

### Login with MetaMask

Authenticate using a MetaMask signature.

- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Auth required**: No

**Request Body**:
```json
{
  "address": "0x1234567890123456789012345678901234567890",
  "signature": "0x..."
}
```

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "role": "voter"
  }
}
```

**Error Response**:
- **Code**: 401 Unauthorized
- **Content**:
```json
{
  "message": "Invalid signature"
}
```

### Get Current User

Get the current authenticated user's details.

- **URL**: `/api/auth/me`
- **Method**: `GET`
- **Auth required**: Yes (JWT Token)

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "id": "user-id",
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "role": "voter",
  "email": "user@example.com"
}
```

## Elections

### Get All Elections

Retrieve all elections in the system.

- **URL**: `/api/elections`
- **Method**: `GET`
- **Auth required**: No

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "elections": [
    {
      "_id": "election-id",
      "title": "General Election 2023",
      "type": "Lok Sabha Elections (General Elections)",
      "description": "National general election",
      "pincode": "110001",
      "startDate": "2023-01-01T00:00:00.000Z",
      "endDate": "2023-01-10T00:00:00.000Z",
      "isActive": true,
      "isArchived": false,
      "totalVotes": 0,
      "createdAt": "2022-12-01T00:00:00.000Z",
      "updatedAt": "2022-12-01T00:00:00.000Z"
    }
  ]
}
```

### Get Election by ID

Retrieve a specific election by its ID.

- **URL**: `/api/election/:id`
- **Method**: `GET`
- **Auth required**: No

**URL Parameters**:
- `id`: Election ID

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "election": {
    "_id": "election-id",
    "title": "General Election 2023",
    "type": "Lok Sabha Elections (General Elections)",
    "description": "National general election",
    "pincode": "110001",
    "startDate": "2023-01-01T00:00:00.000Z",
    "endDate": "2023-01-10T00:00:00.000Z",
    "isActive": true,
    "isArchived": false,
    "totalVotes": 0,
    "candidates": [
      {
        "_id": "candidate-id",
        "firstName": "John",
        "lastName": "Doe",
        "partyName": "Democratic Party",
        "constituency": "New Delhi"
      }
    ],
    "createdAt": "2022-12-01T00:00:00.000Z",
    "updatedAt": "2022-12-01T00:00:00.000Z"
  }
}
```

### Get Active Elections

Retrieve all currently active elections.

- **URL**: `/api/elections/active`
- **Method**: `GET`
- **Auth required**: No

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "elections": [
    {
      "_id": "election-id",
      "title": "General Election 2023",
      "type": "Lok Sabha Elections (General Elections)",
      "description": "National general election",
      "pincode": "110001",
      "startDate": "2023-01-01T00:00:00.000Z",
      "endDate": "2023-01-10T00:00:00.000Z",
      "isActive": true,
      "candidates": [
        {
          "_id": "candidate-id",
          "firstName": "John",
          "lastName": "Doe",
          "partyName": "Democratic Party",
          "constituency": "New Delhi"
        }
      ]
    }
  ]
}
```

### Create Election (Admin Only)

Create a new election.

- **URL**: `/api/admin/election`
- **Method**: `POST`
- **Auth required**: Yes (Admin)

**Request Body**:
```json
{
  "title": "General Election 2023",
  "type": "Lok Sabha Elections (General Elections)",
  "description": "National general election",
  "pincode": "110001",
  "startDate": "2023-01-01T00:00:00.000Z",
  "endDate": "2023-01-10T00:00:00.000Z"
}
```

**Success Response**:
- **Code**: 201 Created
- **Content**:
```json
{
  "message": "Election created successfully",
  "election": {
    "_id": "election-id",
    "title": "General Election 2023",
    "type": "Lok Sabha Elections (General Elections)",
    "description": "National general election",
    "pincode": "110001",
    "startDate": "2023-01-01T00:00:00.000Z",
    "endDate": "2023-01-10T00:00:00.000Z",
    "isActive": false,
    "isArchived": false,
    "totalVotes": 0,
    "createdAt": "2022-12-01T00:00:00.000Z",
    "updatedAt": "2022-12-01T00:00:00.000Z"
  }
}
```

### Update Election (Admin Only)

Update an existing election.

- **URL**: `/api/admin/election/:id`
- **Method**: `PUT`
- **Auth required**: Yes (Admin)

**URL Parameters**:
- `id`: Election ID

**Request Body**:
```json
{
  "title": "Updated Election Title",
  "description": "Updated description",
  "startDate": "2023-02-01T00:00:00.000Z",
  "endDate": "2023-02-10T00:00:00.000Z"
}
```

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "message": "Election updated successfully",
  "election": {
    "_id": "election-id",
    "title": "Updated Election Title",
    "type": "Lok Sabha Elections (General Elections)",
    "description": "Updated description",
    "pincode": "110001",
    "startDate": "2023-02-01T00:00:00.000Z",
    "endDate": "2023-02-10T00:00:00.000Z",
    "isActive": false,
    "isArchived": false,
    "totalVotes": 0,
    "createdAt": "2022-12-01T00:00:00.000Z",
    "updatedAt": "2022-12-01T00:00:00.000Z"
  }
}
```

### Delete Election (Admin Only)

Delete an election.

- **URL**: `/api/admin/election/:id`
- **Method**: `DELETE`
- **Auth required**: Yes (Admin)

**URL Parameters**:
- `id`: Election ID

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "message": "Election deleted successfully"
}
```

### Start Election (Admin Only)

Activate an election to allow voting.

- **URL**: `/api/admin/election/start`
- **Method**: `POST`
- **Auth required**: Yes (Admin)

**Request Body**:
```json
{
  "electionId": "election-id"
}
```

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "message": "Election started successfully",
  "election": {
    "_id": "election-id",
    "title": "General Election 2023",
    "isActive": true,
    "startedAt": "2023-01-01T12:00:00.000Z"
  }
}
```

### End Election (Admin Only)

End an active election.

- **URL**: `/api/admin/election/end`
- **Method**: `POST`
- **Auth required**: Yes (Admin)

**Request Body**:
```json
{
  "electionId": "election-id"
}
```

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "message": "Election ended successfully",
  "election": {
    "_id": "election-id",
    "title": "General Election 2023",
    "isActive": false,
    "endedAt": "2023-01-10T12:00:00.000Z"
  }
}
```

### Archive Election (Admin Only)

Archive a completed election.

- **URL**: `/api/admin/elections/:electionId/archive`
- **Method**: `PUT`
- **Auth required**: Yes (Admin)

**URL Parameters**:
- `electionId`: Election ID

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "message": "Election archived successfully",
  "election": {
    "_id": "election-id",
    "title": "General Election 2023",
    "isActive": false,
    "isArchived": true,
    "archivedAt": "2023-01-15T00:00:00.000Z"
  }
}
```

## Candidates

### Get All Candidates

Retrieve all candidates.

- **URL**: `/api/candidates`
- **Method**: `GET`
- **Auth required**: No

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "candidates": [
    {
      "_id": "candidate-id",
      "firstName": "John",
      "lastName": "Doe",
      "age": 45,
      "gender": "Male",
      "photoUrl": "/uploads/candidates/candidate-photo.jpg",
      "partyName": "Democratic Party",
      "partySymbol": "/uploads/parties/party-symbol.jpg",
      "electionType": "Lok Sabha Elections (General Elections)",
      "constituency": "New Delhi",
      "pincode": "110001",
      "election": "election-id",
      "inActiveElection": true
    }
  ]
}
```

### Get Candidate Details

Retrieve details of a specific candidate.

- **URL**: `/api/candidates/:candidateId`
- **Method**: `GET`
- **Auth required**: No

**URL Parameters**:
- `candidateId`: Candidate ID

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "candidate": {
    "_id": "candidate-id",
    "firstName": "John",
    "middleName": "",
    "lastName": "Doe",
    "name": "John Doe",
    "age": 45,
    "gender": "Male",
    "dateOfBirth": "1978-01-01T00:00:00.000Z",
    "photoUrl": "/uploads/candidates/candidate-photo.jpg",
    "partyName": "Democratic Party",
    "partySymbol": "/uploads/parties/party-symbol.jpg",
    "electionType": "Lok Sabha Elections (General Elections)",
    "constituency": "New Delhi",
    "pincode": "110001",
    "manifesto": "My plans for the constituency include...",
    "education": "PhD in Political Science",
    "experience": "15 years in public service",
    "election": {
      "_id": "election-id",
      "title": "General Election 2023",
      "isActive": true
    }
  }
}
```

### Add Candidate (Admin Only)

Add a new candidate.

- **URL**: `/api/admin/candidates`
- **Method**: `POST`
- **Auth required**: Yes (Admin)
- **Content-Type**: `multipart/form-data`

**Form Data**:
```
firstName: John
middleName: 
lastName: Doe
age: 45
gender: Male
dateOfBirth: 1978-01-01
partyName: Democratic Party
electionType: Lok Sabha Elections (General Elections)
constituency: New Delhi
pincode: 110001
manifesto: My plans for the constituency include...
education: PhD in Political Science
experience: 15 years in public service
election: election-id
photo: [File Upload]
partySymbol: [File Upload]
```

**Success Response**:
- **Code**: 201 Created
- **Content**:
```json
{
  "message": "Candidate added successfully",
  "candidate": {
    "_id": "candidate-id",
    "firstName": "John",
    "lastName": "Doe",
    "age": 45,
    "partyName": "Democratic Party",
    "photoUrl": "/uploads/candidates/candidate-photo.jpg",
    "partySymbol": "/uploads/parties/party-symbol.jpg",
    "election": "election-id"
  }
}
```

### Update Candidate (Admin Only)

Update an existing candidate.

- **URL**: `/api/admin/candidates/:id`
- **Method**: `PUT`
- **Auth required**: Yes (Admin)
- **Content-Type**: `multipart/form-data`

**URL Parameters**:
- `id`: Candidate ID

**Form Data**:
```
firstName: John
lastName: Smith
age: 46
manifesto: Updated manifesto...
photo: [File Upload - Optional]
partySymbol: [File Upload - Optional]
election: election-id
```

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "message": "Candidate updated successfully",
  "candidate": {
    "_id": "candidate-id",
    "firstName": "John",
    "lastName": "Smith",
    "age": 46,
    "manifesto": "Updated manifesto..."
  }
}
```

### Delete Candidate (Admin Only)

Delete a candidate.

- **URL**: `/api/admin/candidates/:id`
- **Method**: `DELETE`
- **Auth required**: Yes (Admin)

**URL Parameters**:
- `id`: Candidate ID

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "message": "Candidate deleted successfully"
}
```

## Voters

### Register Voter Profile

Register a voter profile with identity verification documents.

- **URL**: `/api/voter/register`
- **Method**: `POST`
- **Auth required**: No
- **Content-Type**: `multipart/form-data`

**Form Data**:
```
firstName: Jane
middleName: 
lastName: Doe
fatherName: John Doe
gender: female
age: 25
dateOfBirth: 1998-01-01
pincode: 110001
email: jane.doe@example.com
voterId: ABC123456789
voterIdImage: [File Upload]
faceImage: [File Upload]
```

**Success Response**:
- **Code**: 201 Created
- **Content**:
```json
{
  "message": "Voter profile registered successfully. Please wait for approval.",
  "voter": {
    "_id": "voter-id",
    "firstName": "Jane",
    "lastName": "Doe",
    "voterId": "ABC123456789",
    "status": "pending"
  }
}
```

### Get Voter Profile

Get the authenticated voter's profile.

- **URL**: `/api/voter/profile`
- **Method**: `GET`
- **Auth required**: Yes (Voter)

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "voter": {
    "_id": "voter-id",
    "firstName": "Jane",
    "middleName": "",
    "lastName": "Doe",
    "fatherName": "John Doe",
    "gender": "female",
    "age": 25,
    "dateOfBirth": "1998-01-01T00:00:00.000Z",
    "pincode": "110001",
    "email": "jane.doe@example.com",
    "voterId": "ABC123456789",
    "voterIdImage": "/uploads/voters/voter-id.jpg",
    "faceImage": "/uploads/voters/face-image.jpg",
    "status": "approved",
    "blockchainRegistered": true,
    "createdAt": "2022-12-01T00:00:00.000Z",
    "updatedAt": "2022-12-01T00:00:00.000Z"
  }
}
```

### Update Voter Profile

Update the authenticated voter's profile.

- **URL**: `/api/voter/profile`
- **Method**: `PUT`
- **Auth required**: Yes (Voter)
- **Content-Type**: `multipart/form-data`

**Form Data**:
```
firstName: Jane
lastName: Smith
fatherName: John Smith
pincode: 110002
voterIdImage: [File Upload - Optional]
faceImage: [File Upload - Optional]
```

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "message": "Voter profile updated successfully",
  "voter": {
    "_id": "voter-id",
    "firstName": "Jane",
    "lastName": "Smith",
    "fatherName": "John Smith",
    "pincode": "110002"
  }
}
```

## Admin Operations

### Get All Voters (Admin Only)

Get a list of all registered voters.

- **URL**: `/api/admin/voters`
- **Method**: `GET`
- **Auth required**: Yes (Admin)

**Query Parameters**:
- `status`: Filter by status (`pending`, `approved`, `rejected`) - Optional
- `page`: Page number for pagination - Optional, default: 1
- `limit`: Number of results per page - Optional, default: 10

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "voters": [
    {
      "_id": "voter-id",
      "firstName": "Jane",
      "lastName": "Doe",
      "voterId": "ABC123456789",
      "email": "jane.doe@example.com",
      "status": "pending",
      "createdAt": "2022-12-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "pages": 1,
  "currentPage": 1
}
```

### Get Voter by ID (Admin Only)

Get details of a specific voter.

- **URL**: `/api/admin/voters/:voterId`
- **Method**: `GET`
- **Auth required**: Yes (Admin)

**URL Parameters**:
- `voterId`: Voter ID

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "voter": {
    "_id": "voter-id",
    "firstName": "Jane",
    "middleName": "",
    "lastName": "Doe",
    "fatherName": "John Doe",
    "gender": "female",
    "age": 25,
    "dateOfBirth": "1998-01-01T00:00:00.000Z",
    "pincode": "110001",
    "email": "jane.doe@example.com",
    "voterId": "ABC123456789",
    "voterIdImage": "/uploads/voters/voter-id.jpg",
    "faceImage": "/uploads/voters/face-image.jpg",
    "status": "pending",
    "blockchainRegistered": false,
    "createdAt": "2022-12-01T00:00:00.000Z",
    "updatedAt": "2022-12-01T00:00:00.000Z"
  }
}
```

### Approve Voter (Admin Only)

Approve a pending voter registration.

- **URL**: `/api/admin/voters/:voterId/approve`
- **Method**: `PUT`
- **Auth required**: Yes (Admin)

**URL Parameters**:
- `voterId`: Voter ID

**Request Body**:
```json
{
  "useMetaMask": true,
  "useBackendTransaction": false,
  "walletAddress": "0x1234567890123456789012345678901234567890"
}
```

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "message": "Voter approved successfully",
  "voter": {
    "_id": "voter-id",
    "firstName": "Jane",
    "lastName": "Doe",
    "status": "approved"
  },
  "transaction": {
    "to": "0xContractAddress",
    "data": "0xEncodedFunctionCall",
    "from": "0xAdminAddress"
  }
}
```

### Reject Voter (Admin Only)

Reject a pending voter registration.

- **URL**: `/api/admin/voters/:voterId/reject`
- **Method**: `PUT`
- **Auth required**: Yes (Admin)

**URL Parameters**:
- `voterId`: Voter ID

**Request Body**:
```json
{
  "reason": "Invalid voter ID document"
}
```

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "message": "Voter rejected successfully",
  "voter": {
    "_id": "voter-id",
    "firstName": "Jane",
    "lastName": "Doe",
    "status": "rejected",
    "rejectionReason": "Invalid voter ID document"
  }
}
```

### Get Admin Dashboard Data

Get summary data for the admin dashboard.

- **URL**: `/api/admin/dashboard`
- **Method**: `GET`
- **Auth required**: Yes (Admin)

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "totalElections": 5,
  "activeElections": 2,
  "completedElections": 3,
  "totalCandidates": 50,
  "pendingVoters": 10,
  "approvedVoters": 1000,
  "rejectedVoters": 5,
  "recentElections": [
    {
      "_id": "election-id",
      "title": "General Election 2023",
      "isActive": true,
      "startDate": "2023-01-01T00:00:00.000Z",
      "endDate": "2023-01-10T00:00:00.000Z"
    }
  ],
  "recentVoters": [
    {
      "_id": "voter-id",
      "firstName": "Jane",
      "lastName": "Doe",
      "status": "pending",
      "createdAt": "2022-12-01T00:00:00.000Z"
    }
  ]
}
```

## Blockchain Integration

### Get Contract ABI

Get the Ethereum smart contract ABI for blockchain interactions.

- **URL**: `/api/blockchain/contract-abi`
- **Method**: `GET`
- **Auth required**: Yes (Admin)

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "abi": [...],  // Contract ABI array
  "address": "0xContractAddress"
}
```

### Check Voter Status on Blockchain

Check if a voter is approved on the blockchain.

- **URL**: `/api/blockchain/voter-status`
- **Method**: `GET`
- **Auth required**: Yes

**Query Parameters**:
- `address`: Voter's Ethereum wallet address

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "success": true,
  "data": {
    "isApproved": true
  }
}
```

## Voting

### Cast Vote

Cast a vote in an active election.

- **URL**: `/api/vote`
- **Method**: `POST`
- **Auth required**: Yes (Voter)

**Request Body**:
```json
{
  "electionId": "election-id",
  "candidateId": "candidate-id"
}
```

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "message": "Vote cast successfully",
  "voteId": "vote-id",
  "transactionHash": "0xBlockchainTransactionHash"
}
```

### Verify Vote

Verify a previously cast vote.

- **URL**: `/api/verify`
- **Method**: `GET`
- **Auth required**: Yes (Voter)

**Query Parameters**:
- `electionId`: Election ID - Optional

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "hasVoted": true,
  "vote": {
    "_id": "vote-id",
    "election": {
      "_id": "election-id",
      "title": "General Election 2023"
    },
    "candidate": {
      "_id": "candidate-id",
      "firstName": "John",
      "lastName": "Doe",
      "partyName": "Democratic Party"
    },
    "timestamp": "2023-01-05T12:34:56.789Z",
    "transactionHash": "0xBlockchainTransactionHash"
  }
}
```

### Get Election Results

Get the results of a completed election.

- **URL**: `/api/results`
- **Method**: `GET`
- **Auth required**: No

**Query Parameters**:
- `electionId`: Election ID - Required

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "election": {
    "_id": "election-id",
    "title": "General Election 2023",
    "startDate": "2023-01-01T00:00:00.000Z",
    "endDate": "2023-01-10T00:00:00.000Z",
    "totalVotes": 1500
  },
  "results": [
    {
      "candidate": {
        "_id": "candidate-id",
        "firstName": "John",
        "lastName": "Doe",
        "partyName": "Democratic Party",
        "partySymbol": "/uploads/parties/party-symbol.jpg"
      },
      "voteCount": 750,
      "percentage": 50
    },
    {
      "candidate": {
        "_id": "candidate-id-2",
        "firstName": "Jane",
        "lastName": "Smith",
        "partyName": "Republican Party",
        "partySymbol": "/uploads/parties/party-symbol-2.jpg"
      },
      "voteCount": 750,
      "percentage": 50
    }
  ]
}
```

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "message": "Error description",
  "details": "Additional error details" // Optional
}
```

Common HTTP status codes:
- `400 Bad Request`: Invalid input parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Not authorized to access the resource
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side error

## Authentication

Most endpoints require authentication using a JWT token. Add the token to the Authorization header:

```
Authorization: Bearer <jwt-token>
```

Role-based access is enforced for protected routes:
- Admin-only endpoints require admin role
- Voter endpoints require voter role
- Officer endpoints require officer role

### Complete Voter Approval After Blockchain Registration

Complete the voter approval process after successful blockchain registration.

- **URL**: `/api/admin/voters/:voterId/approve-complete`
- **Method**: `PUT`
- **Auth required**: Yes (Admin)

**Request Body**:
```json
{
  "txHash": "0xBlockchainTransactionHash",
  "voterAddress": "0x1234567890123456789012345678901234567890",
  "blockchainSuccess": true,
  "skipBlockchainUpdate": false
}
```

**Success Response**:
- **Code**: 200 OK
- **Content**:
```json
{
  "message": "Voter approval completed successfully",
  "voter": {
    "id": "voter-id",
    "status": "approved",
    "blockchainRegistered": true
  }
}
``` 