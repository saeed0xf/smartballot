# VoteSure - Secure Blockchain-based Voting System

## Overview
VoteSure is a comprehensive electronic voting system that leverages blockchain technology to ensure secure, transparent, and tamper-proof elections. The system combines traditional database storage with Ethereum blockchain validation to provide a robust platform for conducting various types of elections.

## Features
- **Secure Voter Registration**: Multi-factor authentication with face verification and ID validation
- **Blockchain Integration**: All critical voting data is recorded on the Ethereum blockchain
- **Role-based Access Control**: Differentiated access for voters, admins, and election officers
- **Election Management**: Create, configure, start, and end elections with administrative controls
- **Candidate Management**: Register and manage election candidates with profile information
- **Real-time Results**: View election results with blockchain verification
- **Mobile-responsive Interface**: User-friendly design accessible from any device

## Technology Stack
- **Frontend**: React.js with Bootstrap
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Blockchain**: Ethereum (local development with Ganache, production with real networks)
- **Authentication**: JWT-based authentication with role management
- **File Storage**: Local file system with secure access controls

## Smart Contract Management
The VoteSure system uses a Solidity smart contract (`VoteSure.sol`) to handle blockchain operations. Below are instructions for compiling and deploying the smart contract.

### Compiling the Smart Contract

#### Prerequisites
- Node.js (v14+)
- npm or yarn
- Truffle (for compilation and deployment)
- Ganache (for local blockchain testing)

#### Installation Steps
1. Install Truffle globally:
   ```
   npm install -g truffle
   ```

2. Navigate to the blockchain directory:
   ```
   cd blockchain
   ```

3. Install dependencies:
   ```
   npm install
   ```

#### Compilation Steps
1. Compile the smart contract:
   ```
   truffle compile
   ```
   This will generate the compiled contract artifacts in the `build/contracts` directory.

2. Verify the compilation was successful:
   ```
   ls -la build/contracts
   ```
   You should see `VoteSure.json` among the files.

### Deploying the Smart Contract

#### Local Deployment (Ganache)
1. Ensure Ganache is running:
   ```
   ganache-cli
   ```
   Or use the Ganache GUI application.

2. Deploy the contract to the local network:
   ```
   truffle migrate --network development
   ```

3. Note the contract address from the migration output:
   ```
   Contract address: 0x...
   ```

#### Updating Environment Variables
After deploying the contract, update your environment variables:

1. Open or create the `.env` file in the project root:
   ```
   nano .env
   ```

2. Update or add the following variables:
   ```
   CONTRACT_ADDRESS=0x... # Your deployed contract address
   BLOCKCHAIN_RPC_URL=http://127.0.0.1:7545 # Your Ganache RPC URL
   ADMIN_PRIVATE_KEY=your_private_key # Private key for admin operations
   ```

3. If needed, you can also specify the contract ABI:
   ```
   CONTRACT_ABI='[{"inputs":[],"stateMutability":"nonpayable",...}]'
   ```

4. Restart your application to apply changes:
   ```
   npm run dev
   ```

### Contract Updates
If you modify the smart contract:

1. Recompile the contract:
   ```
   truffle compile
   ```

2. Deploy the updated contract:
   ```
   truffle migrate --network development
   ```

3. Update the `.env` file with the new contract address.

4. The system automatically detects contract address changes when you restart or make API calls.

## Error Handling in Blockchain Transactions

The system has been designed to handle various blockchain-related errors gracefully:

1. **"Already Started" and "Already Ended" Elections**
   - The smart contract emits events instead of reverting for these cases
   - The backend treats these as successful operations with special flags

2. **Transaction Failures**
   - Descriptive error messages are provided for all transaction failures
   - Database operations continue even if blockchain transactions fail
   - Transaction hashes are stored for successful operations

3. **Gas Estimation Errors**
   - The system provides helpful information about gas estimation issues
   - Transactions are still recorded in the database with error details

## Development Setup

### Backend Setup
1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables (copy from `.env.example`):
   ```
   cp .env.example .env
   ```

4. Start the development server:
   ```
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

## Security Considerations
- Private keys should never be shared or committed to repositories
- Use environment variables for all sensitive configuration
- In production, use secure HTTPS connections
- Implement IP-based rate limiting for sensitive endpoints
- Consider using a remote node service like Infura for blockchain operations

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