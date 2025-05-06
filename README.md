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
- **Multi-Election Support**: Run multiple elections simultaneously with blockchain verification for each

## Technology Stack
- **Frontend**: React.js with Bootstrap
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Blockchain**: Ethereum (local development with Ganache, production with real networks)
- **Authentication**: JWT-based authentication with role management
- **File Storage**: Local file system with secure access controls

## Blockchain Architecture
VoteSure uses Ethereum smart contracts to ensure the integrity of the voting process. The system is designed to store all critical election data on the blockchain, providing a transparent and immutable record of votes.

### Key Blockchain Components

- **VoteSureV2 Smart Contract**: Our upgraded contract with multi-election support.
- **Election Management**: Each election has its own unique blockchain ID.
- **Voter Registration**: Voters must be registered and approved for specific elections.
- **Candidate Registration**: Candidates are added to specific elections.
- **Vote Casting**: Votes are recorded on the blockchain with reference to both election and candidate.
- **Result Tabulation**: Results are read directly from the blockchain for verification.

### Data Structure

- **Elections**: Each election has an ID, title, description, type, region, pincode, start time, end time, active status, and list of candidates.
- **Voters**: Voters are registered with their wallet addresses and must be approved for specific elections.
- **Candidates**: Candidates are registered for specific elections with their information.
- **Votes**: Each vote links a voter to their chosen candidate in a specific election.

## Smart Contract Management
The VoteSure system uses a Solidity smart contract (`VoteSureV2.sol`) to handle blockchain operations. Below are instructions for compiling and deploying the smart contract.

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
   You should see `VoteSureV2.json` among the files.

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

## Blockchain Data Flow

### Creating a New Election
1. Admin creates an election in the UI.
2. Backend creates the election in both MongoDB and on the blockchain.
3. The blockchain returns an election ID and transaction hash.
4. These are stored in the MongoDB record for future reference.

### Registering Candidates
1. Admin adds a candidate to an election.
2. Backend adds the candidate to both MongoDB and the blockchain.
3. The blockchain returns a candidate ID and transaction hash.
4. These are stored in the MongoDB record for future reference.

### Registering Voters
1. Voters register by providing required information.
2. Admins approve voters for specific elections.
3. Upon approval, the voter is registered on the blockchain for the specific election.
4. Transaction hash is stored in the MongoDB record.

### Casting Votes
1. Voter authenticates and selects a candidate.
2. Backend calls blockchain to record the vote.
3. Vote is recorded in both MongoDB and blockchain.
4. Blockchain transaction hash is stored with the vote record.

### Viewing Results
1. Results page pulls data from both MongoDB and blockchain.
2. The system verifies that both sources match to ensure integrity.
3. If there's a discrepancy, the blockchain record is considered authoritative.

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

### 1. VoteSureV2 Smart Contract
- Upgraded to a multi-election contract architecture
- Each election has its own unique ID on the blockchain
- Support for multiple simultaneous elections
- Enhanced data structure to track voters, candidates, and votes by election

### 2. Blockchain Integration
- All election data is mirrored on the blockchain
- Enhanced voter registration with per-election approval
- Improved candidate management with blockchain IDs
- Vote verification cross-checked with blockchain records

### 3. MongoDB Integration for Candidate Management
- Candidates are now stored in MongoDB when added through the admin interface
- Complete candidate profile with comprehensive details (personal info, party affiliation, etc.)
- Images are stored using multer (candidate photos and party symbols)
- When an election starts, candidate data is recorded on the blockchain

### 4. Archived Elections Feature
- New section "Archived Elections" in the admin navbar
- Stores data about ended elections, including:
  - Election details (type, region, dates)
  - Candidates who participated
  - Vote counts and percentages
  - Ability to download results as CSV

### 5. Footer Improvements
- "Register as Voter" link is now hidden when logged in with admin or officer wallet
- "Connect Wallet" button is hidden when any wallet is already connected
- Improved text visibility with updated color scheme

### 6. Candidate Registration Form Enhancement
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
├── blockchain/
│   ├── contracts/
│   │   ├── VoteSure.sol
│   │   └── VoteSureV2.sol
│   ├── migrations/
│   └── scripts/
└── README.md
```

## License

This project is licensed under the MIT License. 