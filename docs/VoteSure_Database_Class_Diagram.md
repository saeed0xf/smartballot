# VoteSure MongoDB Database Class Diagram

## Database Schema Overview

The VoteSure system uses MongoDB with two separate databases:
1. **Main VoteSure Database** - Core voting system data
2. **ID Locker Database** - Voter identity management system

## Class Diagram

```mermaid
classDiagram
    %% Main VoteSure Database Models
    class User {
        +ObjectId _id
        +String walletAddress [unique, required]
        +String email [optional]
        +String role [voter|admin|officer]
        +Boolean isActive
        +Date createdAt
        
        %% User Methods by Role
        +connectWallet() Boolean
        +signMessage() String
        +login() Boolean
        +logout() Boolean
        +checkWalletType() String
    }

    class Voter {
        +ObjectId _id
        +ObjectId user [ref: User]
        +String firstName [required]
        +String middleName [optional]
        +String lastName [required]
        +String fatherName [required]
        +String gender [male|female|other]
        +Number age [required]
        +Date dateOfBirth [required]
        +String pincode [required]
        +String email [required]
        +String voterId [unique, required]
        +String voterIdImage [required]
        +String faceImage [required]
        +String status [pending|approved|rejected]
        +String rejectionReason [optional]
        +Boolean blockchainRegistered
        +String blockchainTxHash [optional]
        +Date createdAt
        +Date updatedAt
        
        %% Voter Methods
        +registerVoter() Boolean
        +getVoterProfile() Object
        +castVote(candidateId, electionId) Boolean
        +recordVoteOnBlockchain() Object
        +verifyVote() Object
        +viewCandidates() Array
        +checkEligibility(electionId) Boolean
        +uploadVoterIdImage() String
        +uploadFaceImage() String
        +faceVerification() Boolean
    }

    class Election {
        +ObjectId _id
        +String title [required]
        +String name [optional]
        +String type [enum: election types]
        +String description [optional]
        +String region [optional]
        +String pincode [required]
        +Date startDate [optional]
        +Date endDate [optional]
        +Boolean isActive
        +Boolean isArchived
        +Date archivedAt [optional]
        +Number totalVotes
        +String blockchainStartTxHash [optional]
        +String blockchainEndTxHash [optional]
        +String blockchainError [optional]
        +ObjectId createdBy [ref: User]
        +Date startedAt [optional]
        +Date endedAt [optional]
        +Date createdAt
        +Date updatedAt
        
        %% Election Methods (Admin)
        +createElection() Object
        +updateElection() Object
        +deleteElection() Boolean
        +startElection() Boolean
        +endElection() Boolean
        +archiveElection() Boolean
        +getElectionStatus() Object
        +checkAndAutoEndElections() Number
        +checkAndArchiveInactiveElections() Number
    }

    class Candidate {
        +ObjectId _id
        +String firstName [required]
        +String middleName [optional]
        +String lastName [required]
        +Number age [required, min: 18]
        +String gender [Male|Female|Other|Prefer not to say]
        +Date dateOfBirth [optional]
        +String photoUrl [optional]
        +String partyName [required]
        +String partySymbol [optional]
        +String electionType [enum: election types]
        +String constituency [optional]
        +String pincode [required]
        +String manifesto [optional]
        +String education [optional]
        +String experience [optional]
        +String criminalRecord [default: None]
        +String email [optional]
        +String blockchainId [optional]
        +String blockchainTxHash [optional]
        +Number voteCount [default: 0]
        +Boolean isArchived [default: false]
        +ObjectId election [ref: Election]
        +Boolean inActiveElection [default: false]
        +Date createdAt
        +Date updatedAt
        +String name [virtual: computed full name]
        
        %% Candidate Methods (Admin)
        +addCandidate() Object
        +updateCandidate() Object
        +deleteCandidate() Boolean
        +getCandidatesByElection() Array
        +getCandidatesByElectionId() Array
        +updateCandidateStatus() Boolean
        +addCandidateOnBlockchain() Object
    }

    class Vote {
        +ObjectId _id
        +ObjectId voter [ref: Voter, required]
        +ObjectId candidate [ref: Candidate, conditional]
        +ObjectId election [ref: Election, required]
        +Boolean isNoneOption [default: false]
        +String blockchainTxHash [required]
        +Date timestamp [default: now]
        
        %% Vote Methods
        +castVoteOnBlockchain() Object
        +verifyVoteOnBlockchain() Object
        +getVoteHistory() Array
        +checkVotingEligibility() Boolean
    }

    class Activity {
        +ObjectId _id
        +ObjectId user [ref: User, optional]
        +String action [enum: actions]
        +String entity [enum: entities]
        +ObjectId entityId [required]
        +String details [optional]
        +String ipAddress [optional]
        +String userAgent [optional]
        +Date timestamp [default: now]
        +Date createdAt [auto]
        +Date updatedAt [auto]
        
        %% Activity Methods
        +logActivity() Boolean
        +getActivityHistory() Array
        +getActivityByUser() Array
        +getActivityByEntity() Array
    }

    class Slot {
        +ObjectId _id
        +String title [required]
        +String description [optional]
        +Date date [required]
        +String startTime [required]
        +String endTime [required]
        +String location [required]
        +ObjectId officer [ref: User, required]
        +String status [scheduled|ongoing|completed|cancelled]
        +String notes [optional]
        +Date createdAt
        +Date updatedAt
        
        %% Slot Methods (Officer)
        +getAllSlots() Array
        +getSlotDetails() Object
        +updateSlotStatus() Boolean
        +assignOfficer() Boolean
    }

    %% ID Locker Database Models (Separate Database)
    class IDLocker_Voter {
        +ObjectId _id
        +String firstName [required]
        +String middleName [optional]
        +String lastName [required]
        +String fatherName [required]
        +Date dateOfBirth [required]
        +Number age [auto-calculated]
        +String voterId [unique, required]
        +String email [required]
        +String phoneNumber [unique, required]
        +String pincode [required]
        +String gender [Male|Female|Other]
        +String photoUrl [required]
        +String address [optional]
        +String pollingStation [optional]
        +String ward [optional]
        +String constituency [optional]
        +String notes [optional]
        +Date createdAt [auto]
        +Date updatedAt [auto]
        
        %% ID Locker Voter Methods
        +createVoter() Object
        +updateVoter() Object
        +deleteVoter() Boolean
        +getVoterByVoterId() Object
        +getAllVoters() Array
        +uploadPhoto() String
    }

    class IDLocker_User {
        +ObjectId _id
        +String username [unique, required]
        +String email [unique, required]
        +String password [hashed, required]
        +Date createdAt [auto]
        +Date updatedAt [auto]
        +comparePassword() Boolean
        
        %% ID Locker Admin Methods
        +login() Boolean
        +initAdmin() Boolean
        +manageVoters() Boolean
    }

    %% Relationships
    User ||--o{ Voter : "has profile"
    User ||--o{ Activity : "performs"
    User ||--o{ Slot : "assigned as officer"
    User ||--o{ Election : "created by"
    
    Election ||--o{ Candidate : "contains"
    Election ||--o{ Vote : "receives votes in"
    
    Voter ||--o{ Vote : "casts"
    Candidate ||--o{ Vote : "receives"
    
    %% Cross-database relationship (logical, not enforced)
    IDLocker_Voter -.-> Voter : "voterId reference"
    
    %% Enums and Constants
    note for User "Roles: voter, admin, officer"
    note for Voter "Status: pending, approved, rejected"
    note for Election "Types: Lok Sabha, Vidhan Sabha, Local Body, Other"
    note for Activity "Actions: register, login, approve, vote, etc."
    note for Activity "Entities: user, voter, candidate, election, vote"
    note for Slot "Status: scheduled, ongoing, completed, cancelled"
```

## User Functions and Methods by Role

### **Voter Functions**

#### **Authentication & Registration**
- `connectWallet()` - Connect MetaMask wallet
- `signMessage()` - Sign authentication message
- `login()` - Authenticate with wallet signature
- `registerVoter()` - Register voter profile with personal details
- `uploadVoterIdImage()` - Upload government voter ID image
- `uploadFaceImage()` - Upload face photo for verification

#### **Profile Management**
- `getVoterProfile()` - Retrieve voter profile information
- `checkEligibility(electionId)` - Check voting eligibility for specific election
- `faceVerification()` - Perform AI-powered face verification

#### **Voting Operations**
- `viewCandidates()` - View candidates for active elections
- `castVote(candidateId, electionId)` - Cast vote for a candidate
- `recordVoteOnBlockchain()` - Record vote on blockchain
- `verifyVote()` - Verify vote was recorded correctly
- `getVoteHistory()` - View voting history

#### **Available Routes**
- `GET /voter` - Voter dashboard
- `POST /voter/register` - Register voter profile
- `GET /voter/profile` - Get voter profile
- `GET /voter/candidates` - View candidates
- `POST /voter/vote` - Cast vote
- `GET /voter/verify` - Verify vote

### **Admin Functions**

#### **Voter Management**
- `getAllVoters()` - Get all registered voters
- `getVoterDetails(voterId)` - Get specific voter details
- `approveVoter(voterId)` - Approve voter registration
- `rejectVoter(voterId)` - Reject voter registration
- `getVoterById(voterId)` - Get voter by ID

#### **Election Management**
- `createElection()` - Create new election
- `updateElection()` - Update election details
- `deleteElection()` - Delete election
- `startElection()` - Start election and record on blockchain
- `endElection()` - End election and archive results
- `archiveElection()` - Archive completed election
- `getElectionStatus()` - Get current election status
- `checkAndAutoEndElections()` - Auto-end expired elections
- `checkAndArchiveInactiveElections()` - Auto-archive inactive elections

#### **Candidate Management**
- `addCandidate()` - Add new candidate
- `updateCandidate()` - Update candidate information
- `deleteCandidate()` - Remove candidate
- `getCandidatesByElection()` - Get candidates for specific election
- `getCandidatesByElectionId()` - Get candidates by election ID
- `updateCandidateStatus()` - Update candidate status
- `addCandidateOnBlockchain()` - Add candidate to blockchain

#### **Blockchain Operations**
- `approveVoterOnBlockchain()` - Approve voter on blockchain
- `rejectVoterOnBlockchain()` - Reject voter on blockchain
- `startElectionOnBlockchain()` - Start election on blockchain
- `endElectionOnBlockchain()` - End election on blockchain

#### **Available Routes**
- `GET /admin` - Admin dashboard
- `GET /admin/voters` - Manage voters
- `GET /admin/voters/:voterId` - Get voter details
- `PUT /admin/voters/:voterId/approve` - Approve voter
- `PUT /admin/voters/:voterId/reject` - Reject voter
- `GET /admin/candidates` - Manage candidates
- `POST /admin/candidate` - Add candidate
- `GET /admin/election` - Manage elections
- `POST /admin/election` - Create election
- `POST /admin/election/start` - Start election
- `POST /admin/election/end` - End election
- `PUT /admin/elections/:electionId/archive` - Archive election

### **Officer Functions**

#### **Monitoring & Statistics**
- `getVoterStats()` - Get voter statistics
- `getRemoteElectionStats()` - Get election statistics from blockchain
- `getMonitoringData()` - Get real-time election monitoring data
- `getElectionResults()` - View election results and analytics
- `generateReports()` - Generate official election reports

#### **Slot Management**
- `getAllSlots()` - Get all assigned time slots
- `getSlotDetails(slotId)` - Get specific slot details
- `updateSlotStatus()` - Update slot status
- `manageTimeSlots()` - Manage officer time slots

#### **Election Oversight**
- `monitorVoting()` - Monitor live voting activities
- `viewElectionStatistics()` - View detailed election statistics
- `trackVoterTurnout()` - Track real-time voter turnout
- `generateElectionReports()` - Generate election reports

#### **Available Routes**
- `GET /officer` - Officer dashboard
- `GET /officer/slots` - View assigned slots
- `GET /officer/slots/:slotId` - Get slot details
- `GET /officer/voters/stats` - Get voter statistics
- `GET /officer/elections/remote/stats` - Get remote election stats
- `GET /officer/monitor` - Monitor voting activities
- `GET /officer/statistics` - View election statistics
- `GET /officer/statistics/:electionId` - View specific election stats
- `GET /officer/reports` - Generate reports

### **ID Locker Admin Functions**

#### **Voter Identity Management**
- `getAllVoters()` - Get all voters in ID Locker
- `getVoterById(id)` - Get voter by MongoDB ID
- `getVoterByVoterId(voterId)` - Get voter by government voter ID
- `createVoter()` - Create new voter record
- `updateVoter()` - Update voter information
- `deleteVoter()` - Delete voter record
- `uploadPhoto()` - Upload voter photo

#### **Admin Operations**
- `login()` - Admin authentication
- `initAdmin()` - Initialize admin user (one-time)
- `manageVoters()` - Comprehensive voter management

#### **Available Routes**
- `POST /api/auth/login` - Admin login
- `POST /api/auth/init-admin` - Initialize admin
- `GET /api/auth/me` - Get current admin user
- `GET /api/voters` - Get all voters
- `GET /api/voters/:id` - Get voter by ID
- `GET /api/voters/id/:voterId` - Get voter by voter ID (public)
- `POST /api/voters` - Create voter
- `PUT /api/voters/:id` - Update voter
- `DELETE /api/voters/:id` - Delete voter

### **Smart Contract Functions**

#### **Voter Operations**
- `castVote(electionId, candidateId)` - Cast vote on blockchain
- `hasVoterVoted(voter, electionId)` - Check if voter has voted
- `getVoterDetails(voter)` - Get voter details from blockchain
- `isVoterEligibleForElection(voter, electionId)` - Check voting eligibility

#### **Admin Operations**
- `approveVoter(voter)` - Approve voter on blockchain
- `approveVoterWithId(voter, voterId, pincode)` - Approve voter with details
- `createElection()` - Create election on blockchain
- `startElection(electionId)` - Start election
- `endElection(electionId)` - End election and archive

#### **Utility Functions**
- `getCandidateCount(electionId)` - Get number of candidates
- `getCandidate(electionId, candidateId)` - Get candidate details
- `getArchivedElection(index)` - Get archived election
- `getArchivedElectionCandidates(index)` - Get archived election candidates
- `isVoterIdRegistered(voterId)` - Check if voter ID is registered

## Model Relationships

### Primary Relationships
1. **User → Voter**: One-to-One relationship where each user can have one voter profile
2. **Election → Candidate**: One-to-Many relationship where each election contains multiple candidates
3. **Election → Vote**: One-to-Many relationship where each election receives multiple votes
4. **Voter → Vote**: One-to-Many relationship where each voter can cast multiple votes (in different elections)
5. **Candidate → Vote**: One-to-Many relationship where each candidate can receive multiple votes

### Secondary Relationships
1. **User → Activity**: One-to-Many relationship for activity logging
2. **User → Slot**: One-to-Many relationship for officer assignments
3. **User → Election**: One-to-Many relationship for election creation tracking

### Cross-Database Relationships
1. **IDLocker_Voter ↔ Voter**: Logical relationship via `voterId` field (not enforced by MongoDB)

## Database Constraints

### Unique Constraints
- `User.walletAddress` - Each wallet address is unique
- `Voter.voterId` - Each voter ID is unique
- `IDLocker_Voter.voterId` - Each voter ID is unique in ID Locker
- `IDLocker_Voter.phoneNumber` - Each phone number is unique
- `IDLocker_User.username` - Each username is unique
- `IDLocker_User.email` - Each email is unique

### Required Fields
- All models have required fields marked in the diagram
- Most models include automatic timestamps (`createdAt`, `updatedAt`)

### Enumerations
- **User.role**: `['voter', 'admin', 'officer']`
- **Voter.gender**: `['male', 'female', 'other']`
- **Voter.status**: `['pending', 'approved', 'rejected']`
- **Election.type**: Various election types including Lok Sabha, Vidhan Sabha, Local Body, etc.
- **Candidate.gender**: `['Male', 'Female', 'Other', 'Prefer not to say']`
- **Activity.action**: `['register', 'login', 'approve', 'approve-complete', 'reject', 'vote', 'start-election', 'end-election', 'add-candidate']`
- **Activity.entity**: `['user', 'voter', 'candidate', 'election', 'vote']`
- **Slot.status**: `['scheduled', 'ongoing', 'completed', 'cancelled']`
- **IDLocker_Voter.gender**: `['Male', 'Female', 'Other']`

## Virtual Fields
- **Candidate.name**: Computed full name combining firstName, middleName, and lastName
- **IDLocker_Voter.age**: Auto-calculated from dateOfBirth before saving

## Pre-save Hooks
- **Voter**: Updates `updatedAt` timestamp
- **Election**: Updates `updatedAt` timestamp
- **Candidate**: Updates `updatedAt` timestamp and logs save operation
- **Activity**: Automatic timestamps via schema option
- **Slot**: Updates `updatedAt` timestamp
- **IDLocker_Voter**: Auto-calculates age from dateOfBirth
- **IDLocker_User**: Hashes password before saving

## Indexes (Recommended)
- `User.walletAddress` (unique)
- `Voter.voterId` (unique)
- `Voter.user` (foreign key)
- `Election.pincode` (for regional queries)
- `Candidate.election` (foreign key)
- `Vote.voter` (foreign key)
- `Vote.election` (foreign key)
- `Vote.blockchainTxHash` (for verification)
- `Activity.user` (foreign key)
- `Activity.timestamp` (for chronological queries) 