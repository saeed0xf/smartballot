# Votesure - Decentralized Voting System

A blockchain-based voting system built with Ethereum, React, and Node.js.

## Project Overview

Votesure is a hybrid decentralized voting system that leverages Ethereum blockchain for crucial voting operations while using MongoDB for non-critical data storage. The system supports three types of users:

1. **Voters** - Citizens who register and cast votes
2. **Admin** - Manages voter approvals and election setup
3. **Election Commission Officer** - Monitors the election process

## Features

- Secure voter registration and approval process
- Blockchain-based vote casting and verification
- Admin dashboard for voter approval and election management
- Election Commission Officer monitoring capabilities
- Email notifications for voter approval/rejection

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js, Express
- **Blockchain**: Ethereum (Ganache for development)
- **Database**: MongoDB
- **Blockchain Interaction**: ethers.js

## Project Structure

```
votesure/
├── frontend/         # React frontend application
├── backend/          # Node.js backend server
└── blockchain/       # Smart contracts and blockchain interaction
```

## Setup Instructions

### Prerequisites

- Node.js and npm
- MongoDB
- Ganache (for local blockchain)
- MetaMask browser extension

### Installation

1. Clone the repository
2. Install dependencies for each component:
   ```
   # Frontend
   cd frontend
   npm install

   # Backend
   cd ../backend
   npm install

   # Blockchain
   cd ../blockchain
   npm install
   ```

3. Configure environment variables
4. Deploy smart contracts to Ganache
5. Start the application:
   ```
   # Start backend server
   cd backend
   npm start

   # Start frontend application
   cd ../frontend
   npm start
   ```

## License

MIT 