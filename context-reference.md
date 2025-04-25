# VoteSure: Blockchain-Based Secure Voting System Context Log

## Project Overview

VoteSure is a comprehensive secure voting system built on blockchain technology designed to facilitate transparent, tamper-proof elections. The system integrates various security measures including voter identity verification with face recognition, time slot allocation, and real-time election monitoring.

## System Architecture

The project consists of three main integrated components:

1. **Main Application (VoteSure)**: The core election system with React frontend and Node.js/Express backend
2. **ID Locker**: A voter management system that stores voter registration data
3. **AI Module**: A face verification service that authenticates voters' identities

### Tech Stack

- **Frontend**: React.js with React Bootstrap, React Router, Context API for state management
- **Backend**: Node.js with Express.js, MongoDB with Mongoose
- **Blockchain**: Web3.js integration with MetaMask for wallet connections
- **Authentication**: JWT + MetaMask wallet signatures (`personal_sign`)
- **Face Verification**: Python FastAPI service with Deepface library

## Key Components and Workflow

### User Roles

- **Voters**: Register, verify identity, and cast votes
- **Admins**: Manage elections, approve voters, and handle candidates
- **Officers**: Monitor voting, manage time slots, and oversee operations

### Voter Journey

1. **Registration**: User registers an account and connects their blockchain wallet
2. **Voter Profile Creation**: User submits personal information with photo ID
3. **Admin Approval**: Admin verifies and approves voter registration
4. **Identity Verification**: Before voting, voter completes face verification
5. **Voting**: Verified voter selects a candidate and casts their vote on the blockchain
6. **Verification**: Voter can verify their vote was recorded correctly

### Face Verification Process

1. The voter navigates to the voting page (`http://localhost:3000/voter/vote`)
2. The interface presents a webcam interface for identity verification
3. The voter captures their photo using the webcam
4. The image is sent to the face verification API (`http://localhost:8000/api/verify`)
5. The API compares the captured face with the registered voter's photo (stored in ID Locker)
6. Upon successful verification, the voter can proceed to select a candidate
7. The verification section is hidden, and the candidate selection becomes the focus

### Election Management

1. **Election Creation**: Admin creates a new election with type, description, and date range
2. **Candidate Registration**: Admin adds candidates with their details and party affiliation
3. **Election Activation**: Admin starts the election which records data on the blockchain
4. **Monitoring**: Officers monitor voting progress in real-time
5. **Election Closure**: Admin or automatic timer ends the election
6. **Archiving**: Election results are stored with vote counts and archived for historical reference

### Data Flow

1. Voter personal data is stored in the ID Locker system (`http://localhost:9001`)
2. Voter authentication uses MetaMask wallet signatures
3. Face verification APIs connect to ID Locker to retrieve registered face images
4. Vote transactions are recorded on the blockchain for immutability
5. Election results are stored both on-chain and in MongoDB for accessibility

## Key API Endpoints

### Face Verification API
- `http://localhost:8000/api/verify`: Verifies voter's face against registered image
- `http://localhost:8000/api/verify-base64`: Alternate endpoint for base64 encoded images

### Main Application APIs
- `/api/auth/login`: Authentication using MetaMask wallet
- `/api/voter/profile`: Get voter profile information
- `/api/voter/register`: Register as a voter
- `/api/elections/active`: Get current active elections
- `/api/election/vote`: Cast a vote for a candidate
- `/api/admin/voters/:voterId/approve`: Approve a voter registration
- `/api/admin/election/start`: Start a new election

### ID Locker APIs
- `/api/voters`: Manage voter records
- `/api/voters/id/:voterId`: Get voter by government-issued ID (used by face verification service)

## Security Features

1. **Blockchain Integration**: Ensures immutable vote records
2. **Face Verification**: Prevents voter impersonation using AI-powered facial recognition
3. **MetaMask Authentication**: Secures access using cryptographic wallet signatures
4. **Admin Approval Process**: Manual verification of voter registrations
5. **Time Slot Allocation**: Prevents system overloading and enhances monitoring
6. **Tamper-Proof Records**: Archived election data for auditability

## System Integration Points

1. The face verification service connects to ID Locker to retrieve registered voter photos
2. The main application authenticates voters and records votes on the blockchain
3. MetaMask wallet provides the cryptographic foundation for authentication and voting
4. Each component has its own database but shares common identifiers (like `voterId`)

## Current Implementation State

The system has a working voter journey from registration to vote verification with facial recognition security. The implementation includes proper error handling, responsive design, and integration between all three components. Blockchain integration ensures vote integrity and the admin interfaces allow for complete election management.
