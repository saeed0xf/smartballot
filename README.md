# VoteSure - Secure Blockchain Voting System

VoteSure is a secure voting system built on blockchain technology, designed to facilitate transparent, tamper-proof elections. The system incorporates various security features, including voter identity verification, time slot allocation, and real-time monitoring.

## Recent Updates

### 1. MongoDB Integration for Candidate Management
- Candidates are now stored in MongoDB when added through the admin interface
- Complete candidate profile with comprehensive details (personal info, party affiliation, etc.)
- Images are stored using multer (candidate photos and party symbols)
- When an election starts, candidate data is recorded on the blockchain

### 2. Archived Elections Feature
- New section "Archived Elections" in the admin navbar
- Stores data about ended elections, including:
  - Election details (type, region, dates)
  - Candidates who participated
  - Vote counts and percentages
  - Ability to download results as CSV

### 3. Footer Improvements
- "Register as Voter" link is now hidden when logged in with admin or officer wallet
- "Connect Wallet" button is hidden when any wallet is already connected
- Improved text visibility with updated color scheme

### 4. Candidate Registration Form Enhancement
- Date of Birth field is now optional
- Added required Age field for better data collection
- Improved form validation and user feedback

## Tech Stack

### Frontend
- React.js
- React Bootstrap
- React Router
- React Icons
- Context API for state management
- Axios for API requests

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- Multer for file uploads
- Blockchain integration (Web3.js)

### Authentication
- MetaMask wallet integration
- Role-based access control (Admin, Officer, Voter)

## Key Features

- **Voter Management**: Registration, verification, and approval workflow
- **Candidate Management**: Add, edit, and manage election candidates
- **Time Slot Allocation**: Schedule voting time slots to prevent overloading
- **Election Monitoring**: Real-time monitoring of voting activity
- **Election Archives**: Store and analyze past election data
- **Blockchain Integration**: Secure, tamper-proof vote recording

## Getting Started

1. Clone the repository
2. Install dependencies:
```
npm install
cd frontend && npm install
cd backend && npm install
```

3. Start the development server:
```
npm run dev
```

4. Access the application at:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## File Structure

```
votesure/
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       │   ├── admin/
│       │   ├── officer/
│       │   └── voter/
│       └── utils/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── utils/
│   └── uploads/
└── contracts/
    └── [blockchain contracts]
```

## License

This project is licensed under the MIT License. 