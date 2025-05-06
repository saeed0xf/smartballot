// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VoteSureV2 {
    address public admin;
    
    struct Election {
        uint256 id;
        string title;
        string description;
        string electionType;
        string region;
        string pincode;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        bool isArchived;
        uint256 totalVotes;
        uint256[] candidateIds; // List of candidate IDs in this election
    }
    
    struct Voter {
        bool isRegistered;
        bool isApproved;
        mapping(uint256 => bool) hasVotedInElection; // electionId => has voted
        mapping(uint256 => uint256) votedCandidateInElection; // electionId => candidateId
    }
    
    struct Candidate {
        uint256 id;
        string name;
        string party;
        string partySymbol;
        uint256 electionId;
        uint256 voteCount;
    }
    
    // Storage
    mapping(address => Voter) public voters;
    uint256[] public electionIds;
    mapping(uint256 => Election) public elections;
    mapping(uint256 => Candidate) public candidates;
    mapping(uint256 => mapping(uint256 => uint256)) public electionCandidateVotes; // electionId => candidateId => voteCount
    uint256 public electionsCount;
    uint256 public candidatesCount;
    uint256 public approvedVotersCount;
    
    // Events
    event ElectionCreated(uint256 indexed electionId, string title);
    event ElectionStarted(uint256 indexed electionId, uint256 timestamp);
    event ElectionEnded(uint256 indexed electionId, uint256 timestamp);
    event VoterRegistered(address indexed voterAddress);
    event VoterApproved(address indexed voterAddress);
    event VoterRejected(address indexed voterAddress);
    event CandidateAdded(uint256 indexed candidateId, string name, uint256 indexed electionId);
    event VoteCast(address indexed voter, uint256 indexed electionId, uint256 indexed candidateId);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    modifier electionExists(uint256 electionId) {
        require(elections[electionId].id == electionId, "Election does not exist");
        _;
    }
    
    modifier electionIsActive(uint256 electionId) {
        require(elections[electionId].isActive, "Election is not active");
        require(!elections[electionId].isArchived, "Election is archived");
        _;
    }
    
    constructor() {
        admin = msg.sender;
        electionsCount = 0;
        candidatesCount = 0;
        approvedVotersCount = 0;
    }
    
    // Election Management Functions
    
    function createElection(
        string memory _title,
        string memory _description,
        string memory _electionType,
        string memory _region,
        string memory _pincode,
        uint256 _startTime,
        uint256 _endTime
    ) external onlyAdmin returns (uint256) {
        electionsCount++;
        uint256 electionId = electionsCount;
        
        Election storage newElection = elections[electionId];
        newElection.id = electionId;
        newElection.title = _title;
        newElection.description = _description;
        newElection.electionType = _electionType;
        newElection.region = _region;
        newElection.pincode = _pincode;
        newElection.startTime = _startTime;
        newElection.endTime = _endTime;
        newElection.isActive = false;
        newElection.isArchived = false;
        newElection.totalVotes = 0;
        
        electionIds.push(electionId);
        
        emit ElectionCreated(electionId, _title);
        return electionId;
    }
    
    function startElection(uint256 electionId) external onlyAdmin electionExists(electionId) {
        Election storage election = elections[electionId];
        require(!election.isActive, "Election already started");
        require(!election.isArchived, "Cannot start archived election");
        require(block.timestamp <= election.endTime, "Election end time has passed");
        
        election.isActive = true;
        election.startTime = block.timestamp; // Update to actual start time
        
        emit ElectionStarted(electionId, block.timestamp);
    }
    
    function endElection(uint256 electionId) external onlyAdmin electionExists(electionId) {
        Election storage election = elections[electionId];
        require(election.isActive, "Election not started");
        require(!election.isArchived, "Election already archived");
        
        election.isActive = false;
        election.endTime = block.timestamp; // Update to actual end time
        
        emit ElectionEnded(electionId, block.timestamp);
    }
    
    function archiveElection(uint256 electionId) external onlyAdmin electionExists(electionId) {
        Election storage election = elections[electionId];
        require(!election.isActive, "Cannot archive active election");
        require(!election.isArchived, "Election already archived");
        
        election.isArchived = true;
        
        // No event for archive as it's just a database-like operation
    }
    
    // Voter Management Functions
    
    function registerVoter(address _voterAddress) external {
        require(!voters[_voterAddress].isRegistered, "Voter already registered");
        
        Voter storage voter = voters[_voterAddress];
        voter.isRegistered = true;
        voter.isApproved = false;
        
        emit VoterRegistered(_voterAddress);
    }
    
    function approveVoter(address _voterAddress) external onlyAdmin {
        require(voters[_voterAddress].isRegistered, "Voter not registered");
        require(!voters[_voterAddress].isApproved, "Voter already approved");
        
        voters[_voterAddress].isApproved = true;
        approvedVotersCount++;
        
        emit VoterApproved(_voterAddress);
    }
    
    function rejectVoter(address _voterAddress) external onlyAdmin {
        require(voters[_voterAddress].isRegistered, "Voter not registered");
        require(!voters[_voterAddress].isApproved, "Voter already approved");
        
        emit VoterRejected(_voterAddress);
    }
    
    // Candidate Management Functions
    
    function addCandidate(
        string memory _name,
        string memory _party,
        string memory _partySymbol,
        uint256 _electionId
    ) external onlyAdmin electionExists(_electionId) returns (uint256) {
        require(!elections[_electionId].isArchived, "Cannot add candidate to archived election");
        
        candidatesCount++;
        uint256 candidateId = candidatesCount;
        
        candidates[candidateId] = Candidate({
            id: candidateId,
            name: _name,
            party: _party,
            partySymbol: _partySymbol,
            electionId: _electionId,
            voteCount: 0
        });
        
        // Add candidate to election
        elections[_electionId].candidateIds.push(candidateId);
        
        emit CandidateAdded(candidateId, _name, _electionId);
        return candidateId;
    }
    
    // Voting Functions
    
    function castVote(uint256 _electionId, uint256 _candidateId) external 
        electionExists(_electionId) 
        electionIsActive(_electionId) 
    {
        Voter storage voter = voters[msg.sender];
        require(voter.isRegistered, "Voter not registered");
        require(voter.isApproved, "Voter not approved");
        require(!voter.hasVotedInElection[_electionId], "Voter has already voted in this election");
        
        // Validate candidate
        bool candidateFound = false;
        uint256[] memory candidateIds = elections[_electionId].candidateIds;
        for (uint i = 0; i < candidateIds.length; i++) {
            if (candidateIds[i] == _candidateId) {
                candidateFound = true;
                break;
            }
        }
        require(candidateFound, "Candidate not found in this election");
        
        // Record the vote
        voter.hasVotedInElection[_electionId] = true;
        voter.votedCandidateInElection[_electionId] = _candidateId;
        
        // Update vote counts
        candidates[_candidateId].voteCount++;
        electionCandidateVotes[_electionId][_candidateId]++;
        elections[_electionId].totalVotes++;
        
        emit VoteCast(msg.sender, _electionId, _candidateId);
    }
    
    // View Functions
    
    function getAllElections() external view returns (uint256[] memory) {
        return electionIds;
    }
    
    function getElection(uint256 _electionId) external view electionExists(_electionId) 
        returns (
            uint256 id,
            string memory title,
            string memory description,
            string memory electionType,
            uint256 startTime,
            uint256 endTime,
            bool isActive,
            bool isArchived,
            uint256 totalVotes,
            uint256[] memory candidateIds
        ) 
    {
        Election storage election = elections[_electionId];
        return (
            election.id,
            election.title,
            election.description,
            election.electionType,
            election.startTime,
            election.endTime,
            election.isActive,
            election.isArchived,
            election.totalVotes,
            election.candidateIds
        );
    }
    
    function getCandidate(uint256 _candidateId) external view returns (
        uint256 id,
        string memory name,
        string memory party,
        string memory partySymbol,
        uint256 electionId,
        uint256 voteCount
    ) {
        Candidate storage candidate = candidates[_candidateId];
        require(candidate.id == _candidateId, "Candidate does not exist");
        
        return (
            candidate.id,
            candidate.name,
            candidate.party,
            candidate.partySymbol,
            candidate.electionId,
            candidate.voteCount
        );
    }
    
    function getElectionCandidates(uint256 _electionId) external view electionExists(_electionId) 
        returns (uint256[] memory) 
    {
        return elections[_electionId].candidateIds;
    }
    
    function getVoterStatus(address _voterAddress, uint256 _electionId) external view 
        electionExists(_electionId)
        returns (bool isRegistered, bool isApproved, bool hasVoted, uint256 votedCandidateId) 
    {
        Voter storage voter = voters[_voterAddress];
        return (
            voter.isRegistered,
            voter.isApproved,
            voter.hasVotedInElection[_electionId],
            voter.votedCandidateInElection[_electionId]
        );
    }
    
    function getElectionResults(uint256 _electionId) external view electionExists(_electionId)
        returns (uint256[] memory candidateIds, uint256[] memory voteCounts)
    {
        uint256[] memory electionCandidateIds = elections[_electionId].candidateIds;
        uint256[] memory votes = new uint256[](electionCandidateIds.length);
        
        for (uint i = 0; i < electionCandidateIds.length; i++) {
            votes[i] = electionCandidateVotes[_electionId][electionCandidateIds[i]];
        }
        
        return (electionCandidateIds, votes);
    }
    
    // Helper function to check if an election is currently active
    function isElectionActive(uint256 _electionId) external view returns (bool) {
        if (elections[_electionId].id == 0) return false; // Election doesn't exist
        return elections[_electionId].isActive && !elections[_electionId].isArchived;
    }
} 