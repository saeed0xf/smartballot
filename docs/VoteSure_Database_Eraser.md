# VoteSure Database - Eraser.io Class Diagram

## Complete Eraser.io Code

```eraser
// VoteSure Database Class Diagram
// Main VoteSure Database Models

User [icon: user] {
  _id: ObjectId [pk]
  walletAddress: String [unique, required]
  email: String [optional]
  role: String [voter|admin|officer]
  isActive: Boolean
  createdAt: Date
  
  // Authentication Methods
  + connectWallet(): Boolean
  + signMessage(): String
  + login(): Boolean
  + logout(): Boolean
  + checkWalletType(): String
}

Voter [icon: person] {
  _id: ObjectId [pk]
  user: ObjectId [fk: User]
  firstName: String [required]
  middleName: String [optional]
  lastName: String [required]
  fatherName: String [required]
  gender: String [male|female|other]
  age: Number [required]
  dateOfBirth: Date [required]
  pincode: String [required]
  email: String [required]
  voterId: String [unique, required]
  voterIdImage: String [required]
  faceImage: String [required]
  status: String [pending|approved|rejected]
  rejectionReason: String [optional]
  blockchainRegistered: Boolean
  blockchainTxHash: String [optional]
  createdAt: Date
  updatedAt: Date
  
  // Voter Methods
  + registerVoter(): Boolean
  + getVoterProfile(): Object
  + castVote(candidateId, electionId): Boolean
  + recordVoteOnBlockchain(): Object
  + verifyVote(): Object
  + viewCandidates(): Array
  + checkEligibility(electionId): Boolean
  + uploadVoterIdImage(): String
  + uploadFaceImage(): String
  + faceVerification(): Boolean
}

Election [icon: ballot] {
  _id: ObjectId [pk]
  title: String [required]
  name: String [optional]
  type: String [enum: election types]
  description: String [optional]
  region: String [optional]
  pincode: String [required]
  startDate: Date [optional]
  endDate: Date [optional]
  isActive: Boolean
  isArchived: Boolean
  archivedAt: Date [optional]
  totalVotes: Number
  blockchainStartTxHash: String [optional]
  blockchainEndTxHash: String [optional]
  blockchainError: String [optional]
  createdBy: ObjectId [fk: User]
  startedAt: Date [optional]
  endedAt: Date [optional]
  createdAt: Date
  updatedAt: Date
  
  // Admin Election Methods
  + createElection(): Object
  + updateElection(): Object
  + deleteElection(): Boolean
  + startElection(): Boolean
  + endElection(): Boolean
  + archiveElection(): Boolean
  + getElectionStatus(): Object
  + checkAndAutoEndElections(): Number
  + checkAndArchiveInactiveElections(): Number
}

Candidate [icon: person-standing] {
  _id: ObjectId [pk]
  firstName: String [required]
  middleName: String [optional]
  lastName: String [required]
  age: Number [required, min: 18]
  gender: String [Male|Female|Other|Prefer not to say]
  dateOfBirth: Date [optional]
  photoUrl: String [optional]
  partyName: String [required]
  partySymbol: String [optional]
  electionType: String [enum: election types]
  constituency: String [optional]
  pincode: String [required]
  manifesto: String [optional]
  education: String [optional]
  experience: String [optional]
  criminalRecord: String [default: None]
  email: String [optional]
  blockchainId: String [optional]
  blockchainTxHash: String [optional]
  voteCount: Number [default: 0]
  isArchived: Boolean [default: false]
  election: ObjectId [fk: Election]
  inActiveElection: Boolean [default: false]
  createdAt: Date
  updatedAt: Date
  name: String [virtual: computed full name]
  
  // Admin Candidate Methods
  + addCandidate(): Object
  + updateCandidate(): Object
  + deleteCandidate(): Boolean
  + getCandidatesByElection(): Array
  + getCandidatesByElectionId(): Array
  + updateCandidateStatus(): Boolean
  + addCandidateOnBlockchain(): Object
}

Vote [icon: check-square] {
  _id: ObjectId [pk]
  voter: ObjectId [fk: Voter, required]
  candidate: ObjectId [fk: Candidate, conditional]
  election: ObjectId [fk: Election, required]
  isNoneOption: Boolean [default: false]
  blockchainTxHash: String [required]
  timestamp: Date [default: now]
  
  // Vote Methods
  + castVoteOnBlockchain(): Object
  + verifyVoteOnBlockchain(): Object
  + getVoteHistory(): Array
  + checkVotingEligibility(): Boolean
}

Activity [icon: activity] {
  _id: ObjectId [pk]
  user: ObjectId [fk: User, optional]
  action: String [enum: actions]
  entity: String [enum: entities]
  entityId: ObjectId [required]
  details: String [optional]
  ipAddress: String [optional]
  userAgent: String [optional]
  timestamp: Date [default: now]
  createdAt: Date [auto]
  updatedAt: Date [auto]
  
  // Activity Methods
  + logActivity(): Boolean
  + getActivityHistory(): Array
  + getActivityByUser(): Array
  + getActivityByEntity(): Array
}

Slot [icon: calendar] {
  _id: ObjectId [pk]
  title: String [required]
  description: String [optional]
  date: Date [required]
  startTime: String [required]
  endTime: String [required]
  location: String [required]
  officer: ObjectId [fk: User, required]
  status: String [scheduled|ongoing|completed|cancelled]
  notes: String [optional]
  createdAt: Date
  updatedAt: Date
  
  // Officer Slot Methods
  + getAllSlots(): Array
  + getSlotDetails(): Object
  + updateSlotStatus(): Boolean
  + assignOfficer(): Boolean
}

// ID Locker Database Models (Separate Database)
IDLocker_Voter [icon: id-card, color: purple] {
  _id: ObjectId [pk]
  firstName: String [required]
  middleName: String [optional]
  lastName: String [required]
  fatherName: String [required]
  dateOfBirth: Date [required]
  age: Number [auto-calculated]
  voterId: String [unique, required]
  email: String [required]
  phoneNumber: String [unique, required]
  pincode: String [required]
  gender: String [Male|Female|Other]
  photoUrl: String [required]
  address: String [optional]
  pollingStation: String [optional]
  ward: String [optional]
  constituency: String [optional]
  notes: String [optional]
  createdAt: Date [auto]
  updatedAt: Date [auto]
  
  // ID Locker Voter Methods
  + createVoter(): Object
  + updateVoter(): Object
  + deleteVoter(): Boolean
  + getVoterByVoterId(): Object
  + getAllVoters(): Array
  + uploadPhoto(): String
}

IDLocker_User [icon: user-cog, color: purple] {
  _id: ObjectId [pk]
  username: String [unique, required]
  email: String [unique, required]
  password: String [hashed, required]
  createdAt: Date [auto]
  updatedAt: Date [auto]
  comparePassword: Boolean
  
  // ID Locker Admin Methods
  + login(): Boolean
  + initAdmin(): Boolean
  + manageVoters(): Boolean
}

// Smart Contract Functions (Blockchain)
VoteSureContract [icon: link, color: green] {
  <<Smart Contract>>
  admin: address
  electionCount: uint
  elections: mapping
  voters: mapping
  approvedVoters: mapping
  
  // Voter Operations
  + castVote(electionId, candidateId): void
  + hasVoterVoted(voter, electionId): bool
  + getVoterDetails(voter): Voter
  + isVoterEligibleForElection(voter, electionId): bool
  
  // Admin Operations
  + approveVoter(voter): void
  + approveVoterWithId(voter, voterId, pincode): void
  + createElection(...): void
  + startElection(electionId): void
  + endElection(electionId): void
  
  // Utility Functions
  + getCandidateCount(electionId): uint
  + getCandidate(electionId, candidateId): Candidate
  + getArchivedElection(index): ArchivedElection
  + getArchivedElectionCandidates(index): Candidate[]
  + isVoterIdRegistered(voterId): bool
}

// Relationships - Main VoteSure Database
User ||--o{ Voter : "has profile"
User ||--o{ Activity : "performs"
User ||--o{ Slot : "assigned as officer"
User ||--o{ Election : "created by"

Election ||--o{ Candidate : "contains"
Election ||--o{ Vote : "receives votes in"

Voter ||--o{ Vote : "casts"
Candidate ||--o{ Vote : "receives"

// Cross-database relationship (logical, not enforced)
IDLocker_Voter -.-> Voter : "voterId reference"

// Blockchain relationships
User -.-> VoteSureContract : "interacts with"
Voter -.-> VoteSureContract : "votes on"
Election -.-> VoteSureContract : "recorded on"
Candidate -.-> VoteSureContract : "registered on"

// User Role Functions
VoterFunctions [icon: user-check, color: blue] {
  Authentication:
  - connectWallet()
  - signMessage()
  - login()
  
  Registration:
  - registerVoter()
  - uploadVoterIdImage()
  - uploadFaceImage()
  
  Voting:
  - viewCandidates()
  - castVote()
  - verifyVote()
  - faceVerification()
  
  Profile:
  - getVoterProfile()
  - checkEligibility()
}

AdminFunctions [icon: user-shield, color: red] {
  Voter Management:
  - getAllVoters()
  - approveVoter()
  - rejectVoter()
  - getVoterDetails()
  
  Election Management:
  - createElection()
  - startElection()
  - endElection()
  - archiveElection()
  
  Candidate Management:
  - addCandidate()
  - updateCandidate()
  - getCandidatesByElection()
  
  Blockchain Operations:
  - approveVoterOnBlockchain()
  - startElectionOnBlockchain()
}

OfficerFunctions [icon: user-tie, color: orange] {
  Monitoring:
  - getVoterStats()
  - getMonitoringData()
  - getElectionResults()
  
  Slot Management:
  - getAllSlots()
  - getSlotDetails()
  - updateSlotStatus()
  
  Reports:
  - generateReports()
  - viewElectionStatistics()
  - trackVoterTurnout()
}

// Function relationships
Voter --> VoterFunctions : "uses"
User --> AdminFunctions : "admin role uses"
User --> OfficerFunctions : "officer role uses"
```

## Usage Instructions

1. **Copy the code above** (everything between the triple backticks)
2. **Paste into Eraser.io**:
   - Go to https://app.eraser.io/
   - Create a new diagram
   - Select "Code" mode
   - Paste the code
   - Click "Render" to generate the visual diagram

## Features Included

- **All 9 database models** with complete field specifications
- **User functions organized by role** in separate function boxes
- **Smart contract integration** showing blockchain functions
- **Cross-database relationships** between VoteSure and ID Locker
- **Color coding and icons** to distinguish different systems:
  - Default: Main VoteSure Database
  - Purple: ID Locker Database  
  - Green: Blockchain Smart Contract
  - Blue: Voter Functions
  - Red: Admin Functions
  - Orange: Officer Functions
- **Comprehensive field types** with constraints and relationships
- **Method specifications** for each user role

## Customization Options

To modify the diagram in Eraser.io:
- **Change colors**: Modify the `color:` attributes
- **Change icons**: Update the `icon:` attributes with Eraser.io icon names
- **Remove sections**: Comment out or delete unwanted classes
- **Add more details**: Extend any class with additional fields or methods
- **Rearrange layout**: Eraser.io will auto-layout, but you can adjust positioning

## Available Icons in Eraser.io

Common icons you can use:
- `user`, `person`, `user-check`, `user-shield`, `user-tie`, `user-cog`
- `ballot`, `check-square`, `id-card`, `calendar`, `activity`
- `link`, `database`, `server`, `cloud`, `lock`
- `arrow-right`, `arrow-left`, `plus`, `minus`, `edit`

## Relationship Types

- `||--o{` : One-to-many relationship
- `-.->` : Dotted line (logical relationship)
- `-->` : Solid arrow (direct relationship)
- `--` : Simple connection line
</rewritten_file> 