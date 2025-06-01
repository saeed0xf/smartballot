# AI Prompt for Generating VoteSure Database Class Diagram

## Prompt for AI Tools (ChatGPT, Claude, etc.)

Use this prompt to generate a comprehensive class diagram for the VoteSure MongoDB database schema:

---

**PROMPT:**

Create a detailed UML class diagram for a MongoDB database schema for a blockchain-based voting system called "VoteSure". The system has two separate MongoDB databases with the following models, specifications, and user functions:

## Database 1: Main VoteSure Database

### Model 1: User
- **Purpose**: Stores user authentication and role information
- **Fields**:
  - `_id`: ObjectId (primary key)
  - `walletAddress`: String (unique, required, lowercase, trimmed) - Ethereum wallet address
  - `email`: String (optional, lowercase, trimmed)
  - `role`: String (enum: 'voter', 'admin', 'officer', default: 'voter')
  - `isActive`: Boolean (default: true)
  - `createdAt`: Date (default: now)
- **Methods**:
  - `connectWallet()`: Boolean - Connect MetaMask wallet
  - `signMessage()`: String - Sign authentication message
  - `login()`: Boolean - Authenticate with wallet signature
  - `logout()`: Boolean - Logout user
  - `checkWalletType()`: String - Determine wallet type (voter/admin/officer)

### Model 2: Voter
- **Purpose**: Stores voter profile and verification information
- **Fields**:
  - `_id`: ObjectId (primary key)
  - `user`: ObjectId (required, references User model)
  - `firstName`: String (required, trimmed)
  - `middleName`: String (optional, trimmed)
  - `lastName`: String (required, trimmed)
  - `fatherName`: String (required, trimmed)
  - `gender`: String (required, enum: 'male', 'female', 'other')
  - `age`: Number (required)
  - `dateOfBirth`: Date (required)
  - `pincode`: String (required, trimmed)
  - `email`: String (required, lowercase, trimmed)
  - `voterId`: String (unique, required, trimmed) - Government voter ID
  - `voterIdImage`: String (required) - File path to voter ID image
  - `faceImage`: String (required) - File path to face photo
  - `status`: String (enum: 'pending', 'approved', 'rejected', default: 'pending')
  - `rejectionReason`: String (optional)
  - `blockchainRegistered`: Boolean (default: false)
  - `blockchainTxHash`: String (optional)
  - `createdAt`: Date (default: now)
  - `updatedAt`: Date (default: now, updated on save)
- **Methods**:
  - `registerVoter()`: Boolean - Register voter profile
  - `getVoterProfile()`: Object - Get voter profile information
  - `castVote(candidateId, electionId)`: Boolean - Cast vote for candidate
  - `recordVoteOnBlockchain()`: Object - Record vote on blockchain
  - `verifyVote()`: Object - Verify vote was recorded correctly
  - `viewCandidates()`: Array - View candidates for active elections
  - `checkEligibility(electionId)`: Boolean - Check voting eligibility
  - `uploadVoterIdImage()`: String - Upload voter ID image
  - `uploadFaceImage()`: String - Upload face photo
  - `faceVerification()`: Boolean - Perform AI face verification

### Model 3: Election
- **Purpose**: Stores election information and metadata
- **Fields**:
  - `_id`: ObjectId (primary key)
  - `title`: String (required, trimmed)
  - `name`: String (optional, trimmed)
  - `type`: String (required, enum: 'Lok Sabha Elections (General Elections)', 'Vidhan Sabha Elections (State Assembly Elections)', 'Local Body Elections (Municipal)', 'Other', default: 'Lok Sabha Elections (General Elections)')
  - `description`: String (optional, trimmed)
  - `region`: String (optional, trimmed)
  - `pincode`: String (required, trimmed)
  - `startDate`: Date (optional)
  - `endDate`: Date (optional)
  - `isActive`: Boolean (default: false)
  - `isArchived`: Boolean (default: false)
  - `archivedAt`: Date (optional)
  - `totalVotes`: Number (default: 0)
  - `blockchainStartTxHash`: String (optional)
  - `blockchainEndTxHash`: String (optional)
  - `blockchainError`: String (optional)
  - `createdBy`: ObjectId (references User model)
  - `startedAt`: Date (optional)
  - `endedAt`: Date (optional)
  - `createdAt`: Date (default: now)
  - `updatedAt`: Date (default: now, updated on save)
- **Methods (Admin Only)**:
  - `createElection()`: Object - Create new election
  - `updateElection()`: Object - Update election details
  - `deleteElection()`: Boolean - Delete election
  - `startElection()`: Boolean - Start election and record on blockchain
  - `endElection()`: Boolean - End election and archive results
  - `archiveElection()`: Boolean - Archive completed election
  - `getElectionStatus()`: Object - Get current election status
  - `checkAndAutoEndElections()`: Number - Auto-end expired elections
  - `checkAndArchiveInactiveElections()`: Number - Auto-archive inactive elections

### Model 4: Candidate
- **Purpose**: Stores candidate information for elections
- **Fields**:
  - `_id`: ObjectId (primary key)
  - `firstName`: String (required, trimmed)
  - `middleName`: String (optional, trimmed)
  - `lastName`: String (required, trimmed)
  - `age`: Number (required, minimum: 18)
  - `gender`: String (required, enum: 'Male', 'Female', 'Other', 'Prefer not to say')
  - `dateOfBirth`: Date (optional)
  - `photoUrl`: String (optional)
  - `partyName`: String (required, trimmed)
  - `partySymbol`: String (optional)
  - `electionType`: String (required, enum: same as Election.type, default: 'Lok Sabha Elections (General Elections)')
  - `constituency`: String (optional, trimmed)
  - `pincode`: String (required, trimmed)
  - `manifesto`: String (optional, trimmed)
  - `education`: String (optional, trimmed)
  - `experience`: String (optional, trimmed)
  - `criminalRecord`: String (default: 'None', trimmed)
  - `email`: String (optional, lowercase, trimmed)
  - `blockchainId`: String (optional)
  - `blockchainTxHash`: String (optional)
  - `voteCount`: Number (default: 0)
  - `isArchived`: Boolean (default: false)
  - `election`: ObjectId (references Election model)
  - `inActiveElection`: Boolean (default: false)
  - `createdAt`: Date (default: now)
  - `updatedAt`: Date (default: now, updated on save)
  - `name`: Virtual field (computed full name: firstName + middleName + lastName)
- **Methods (Admin Only)**:
  - `addCandidate()`: Object - Add new candidate
  - `updateCandidate()`: Object - Update candidate information
  - `deleteCandidate()`: Boolean - Remove candidate
  - `getCandidatesByElection()`: Array - Get candidates for specific election
  - `getCandidatesByElectionId()`: Array - Get candidates by election ID
  - `updateCandidateStatus()`: Boolean - Update candidate status
  - `addCandidateOnBlockchain()`: Object - Add candidate to blockchain

### Model 5: Vote
- **Purpose**: Stores individual vote records
- **Fields**:
  - `_id`: ObjectId (primary key)
  - `voter`: ObjectId (required, references Voter model)
  - `candidate`: ObjectId (references Candidate model, required if not isNoneOption)
  - `election`: ObjectId (required, references Election model)
  - `isNoneOption`: Boolean (default: false)
  - `blockchainTxHash`: String (required)
  - `timestamp`: Date (default: now)
- **Methods**:
  - `castVoteOnBlockchain()`: Object - Cast vote on blockchain
  - `verifyVoteOnBlockchain()`: Object - Verify vote on blockchain
  - `getVoteHistory()`: Array - Get voting history
  - `checkVotingEligibility()`: Boolean - Check voting eligibility

### Model 6: Activity
- **Purpose**: Logs user activities and system events
- **Fields**:
  - `_id`: ObjectId (primary key)
  - `user`: ObjectId (optional, references User model)
  - `action`: String (required, enum: 'register', 'login', 'approve', 'approve-complete', 'reject', 'vote', 'start-election', 'end-election', 'add-candidate')
  - `entity`: String (required, enum: 'user', 'voter', 'candidate', 'election', 'vote')
  - `entityId`: ObjectId (required)
  - `details`: String (optional)
  - `ipAddress`: String (optional)
  - `userAgent`: String (optional)
  - `timestamp`: Date (default: now)
  - `createdAt`: Date (auto-generated)
  - `updatedAt`: Date (auto-generated)
- **Methods**:
  - `logActivity()`: Boolean - Log user activity
  - `getActivityHistory()`: Array - Get activity history
  - `getActivityByUser()`: Array - Get activities by user
  - `getActivityByEntity()`: Array - Get activities by entity

### Model 7: Slot
- **Purpose**: Manages time slots for election officers
- **Fields**:
  - `_id`: ObjectId (primary key)
  - `title`: String (required, trimmed)
  - `description`: String (optional, trimmed)
  - `date`: Date (required)
  - `startTime`: String (required)
  - `endTime`: String (required)
  - `location`: String (required)
  - `officer`: ObjectId (required, references User model)
  - `status`: String (enum: 'scheduled', 'ongoing', 'completed', 'cancelled', default: 'scheduled')
  - `notes`: String (optional)
  - `createdAt`: Date (default: now)
  - `updatedAt`: Date (default: now, updated on save)
- **Methods (Officer Only)**:
  - `getAllSlots()`: Array - Get all assigned time slots
  - `getSlotDetails()`: Object - Get specific slot details
  - `updateSlotStatus()`: Boolean - Update slot status
  - `assignOfficer()`: Boolean - Assign officer to slot

## Database 2: ID Locker Database (Separate Database)

### Model 8: IDLocker_Voter
- **Purpose**: Stores detailed voter identity information with photos
- **Fields**:
  - `_id`: ObjectId (primary key)
  - `firstName`: String (required, trimmed)
  - `middleName`: String (optional, trimmed)
  - `lastName`: String (required, trimmed)
  - `fatherName`: String (required, trimmed)
  - `dateOfBirth`: Date (required)
  - `age`: Number (auto-calculated from dateOfBirth before save)
  - `voterId`: String (unique, required, trimmed)
  - `email`: String (required, trimmed)
  - `phoneNumber`: String (unique, required, trimmed)
  - `pincode`: String (required, trimmed)
  - `gender`: String (required, enum: 'Male', 'Female', 'Other')
  - `photoUrl`: String (required) - Path to voter's photo
  - `address`: String (optional, trimmed)
  - `pollingStation`: String (optional, trimmed)
  - `ward`: String (optional, trimmed)
  - `constituency`: String (optional, trimmed)
  - `notes`: String (optional, trimmed)
  - `createdAt`: Date (auto-generated)
  - `updatedAt`: Date (auto-generated)
- **Methods**:
  - `createVoter()`: Object - Create new voter record
  - `updateVoter()`: Object - Update voter information
  - `deleteVoter()`: Boolean - Delete voter record
  - `getVoterByVoterId()`: Object - Get voter by government voter ID
  - `getAllVoters()`: Array - Get all voters
  - `uploadPhoto()`: String - Upload voter photo

### Model 9: IDLocker_User
- **Purpose**: Admin users for ID Locker system
- **Fields**:
  - `_id`: ObjectId (primary key)
  - `username`: String (unique, required)
  - `email`: String (unique, required)
  - `password`: String (required, hashed before save)
  - `createdAt`: Date (auto-generated)
  - `updatedAt`: Date (auto-generated)
  - `comparePassword()`: Method (returns Boolean)
- **Methods**:
  - `login()`: Boolean - Admin authentication
  - `initAdmin()`: Boolean - Initialize admin user (one-time)
  - `manageVoters()`: Boolean - Comprehensive voter management

## User Role Functions Summary:

### **Voter Functions**:
- Authentication: connectWallet, signMessage, login
- Registration: registerVoter, uploadVoterIdImage, uploadFaceImage
- Voting: viewCandidates, castVote, verifyVote, faceVerification
- Profile: getVoterProfile, checkEligibility

### **Admin Functions**:
- Voter Management: getAllVoters, approveVoter, rejectVoter, getVoterDetails
- Election Management: createElection, startElection, endElection, archiveElection
- Candidate Management: addCandidate, updateCandidate, getCandidatesByElection
- Blockchain Operations: approveVoterOnBlockchain, startElectionOnBlockchain

### **Officer Functions**:
- Monitoring: getVoterStats, getMonitoringData, getElectionResults
- Slot Management: getAllSlots, getSlotDetails, updateSlotStatus
- Reports: generateReports, viewElectionStatistics, trackVoterTurnout

### **Smart Contract Functions**:
- Voter Operations: castVote, hasVoterVoted, getVoterDetails, isVoterEligibleForElection
- Admin Operations: approveVoter, createElection, startElection, endElection
- Utility Functions: getCandidateCount, getCandidate, getArchivedElection

## Relationships to Show in Diagram:

### Primary Relationships (Foreign Key References):
1. **User (1) → Voter (0..1)**: One user can have one voter profile
2. **Election (1) → Candidate (0..*)**: One election contains multiple candidates
3. **Election (1) → Vote (0..*)**: One election receives multiple votes
4. **Voter (1) → Vote (0..*)**: One voter can cast multiple votes (different elections)
5. **Candidate (1) → Vote (0..*)**: One candidate can receive multiple votes
6. **User (1) → Activity (0..*)**: One user performs multiple activities
7. **User (1) → Slot (0..*)**: One user (officer) assigned to multiple slots
8. **User (1) → Election (0..*)**: One user (admin) creates multiple elections

### Cross-Database Logical Relationship:
- **IDLocker_Voter ↔ Voter**: Connected via `voterId` field (not enforced by MongoDB)

## Special Instructions for the Diagram:

1. **Use UML Class Diagram notation** with proper visibility indicators (+, -, #)
2. **Show all fields with their data types** and constraints
3. **Include all methods/functions** organized by user role where applicable
4. **Include relationship cardinalities** (1, 0..1, 0..*, 1..*)
5. **Mark unique fields** with {unique} constraint
6. **Mark required fields** with appropriate notation
7. **Show enum values** for fields with limited options
8. **Include virtual fields and methods** where applicable
9. **Use different colors or styling** to distinguish between the two databases
10. **Show the cross-database relationship** with a dotted line
11. **Group methods by user role** (e.g., "Admin Methods", "Voter Methods", "Officer Methods")
12. **Include notes or annotations** for important constraints and business rules

## Additional Context:
- This is a blockchain-based voting system with face verification
- The system uses MetaMask for authentication via wallet addresses
- Votes are recorded both in MongoDB and on Ethereum blockchain
- The ID Locker is a separate identity management system
- Face verification is done by comparing photos between systems
- Each user role has specific permissions and available operations
- Smart contract functions are called from the backend API
- The system includes comprehensive audit logging via Activity model

Please create a comprehensive, professional UML class diagram that clearly shows all models, relationships, constraints, and user functions organized by role.

---

**END OF PROMPT**

## Usage Instructions

1. **Copy the entire prompt above** (from "PROMPT:" to "END OF PROMPT")
2. **Paste it into any AI tool** that can generate diagrams (ChatGPT, Claude, Gemini, etc.)
3. **Request specific diagram formats** if needed:
   - "Generate this as a Mermaid diagram"
   - "Create this as a PlantUML diagram"
   - "Make this as a visual UML class diagram"
   - "Export as SVG/PNG format"

## Alternative Shorter Prompts

### For Mermaid Diagram Only:
"Create a Mermaid class diagram for the VoteSure MongoDB schema described above, focusing on the relationships, key fields, and user functions by role."

### For Visual Diagram Only:
"Generate a visual UML class diagram image for the VoteSure database schema described above, with proper UML notation, relationship lines, and methods grouped by user role."

### For PlantUML:
"Convert the VoteSure database schema described above into PlantUML syntax for a class diagram, including all user functions and methods."

### For Functions Only:
"Create a simplified class diagram showing only the user functions and methods for each role (Voter, Admin, Officer) in the VoteSure system."

## Expected Output

The AI should generate:
1. A complete class diagram showing all 9 models
2. All user functions and methods organized by role
3. Proper relationship lines with cardinalities
4. Field types and constraints clearly marked
5. Distinction between the two databases
6. Professional UML notation and formatting
7. Clear separation of functions by user role (Voter, Admin, Officer)

## Troubleshooting

If the AI response is incomplete:
- Ask to "continue the diagram" or "complete the remaining models"
- Request specific sections: "Show only the relationships" or "Focus on user functions"
- Ask for different formats: "Make it simpler" or "Add more detail"
- Request role-specific views: "Show only Admin functions" or "Focus on Voter operations" 