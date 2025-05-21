// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VoteSureV2 {
    address public admin;

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    struct Candidate {
        uint candidateId;
        string name;
        string party;
        string slogan;
        string pincode;      // Add pincode for candidate
        string constituency; // Add constituency for candidate
        uint voteCount;
    }

    struct Election {
        uint electionId;
        string title;
        string description;
        string pincode;     // Add pincode for election
        string region;      // Add region for election
        uint startTime;
        uint endTime;
        bool isActive;
        bool isEnded;
        Candidate[] candidates;
        mapping(address => bool) hasVoted;
    }

    // Modify the ArchivedElection struct to also include pincode and region
    struct ArchivedElection {
        uint electionId;
        string title;
        string description;
        string pincode;  // Add pincode for archived election
        string region;   // Add region for archived election
        uint startTime;
        uint endTime;
    }

    // Create a separate mapping to store candidates for archived elections
    mapping(uint => Candidate[]) public archivedElectionCandidates;

    uint public electionCount;
    mapping(uint => Election) public elections;
    ArchivedElection[] public archivedElections;
    mapping(address => bool) public approvedVoters;
    mapping(address => string) public voterIdByAddress; // Map wallet address to voter ID
    mapping(string => bool) public registeredVoterIds; // Track registered voter IDs

    // Add a Voter struct to store all voter details
    struct Voter {
        string voterId;       // Government-issued voter ID
        string pincode;       // Voter's residential pincode
        bool isApproved;      // Approval status
        uint registrationTime; // When the voter was registered
    }

    // Replace simple mapping with detailed voter information
    mapping(address => Voter) public voters;
    mapping(string => address) public voterIdToAddress; // Reverse lookup from voterId to address

    // Events
    event VoterApproved(address voter);
    event ElectionCreated(uint electionId);
    event ElectionStarted(uint electionId);
    event ElectionEnded(uint electionId);
    event VoteCasted(address voter, uint electionId, uint candidateId);
    event CandidateAdded(uint electionId, uint candidateId);

    // Approve voter
    function approveVoter(address _voter) external onlyAdmin {
        require(!approvedVoters[_voter], "Voter already approved");
        approvedVoters[_voter] = true;
        emit VoterApproved(_voter);
    }

    // Update the approveVoterWithId function to include pincode
    function approveVoterWithId(
        address _voter, 
        string memory _voterId, 
        string memory _pincode
    ) external onlyAdmin {
        require(!voters[_voter].isApproved, "Voter already approved");
        require(voterIdToAddress[_voterId] == address(0), "Voter ID already registered");
        require(bytes(_pincode).length > 0, "Pincode must not be empty");
        
        // Store complete voter information
        voters[_voter] = Voter({
            voterId: _voterId,
            pincode: _pincode,
            isApproved: true,
            registrationTime: block.timestamp
        });
        
        // Set up reverse lookup
        voterIdToAddress[_voterId] = _voter;
        
        // For backward compatibility
        approvedVoters[_voter] = true;
        voterIdByAddress[_voter] = _voterId;
        registeredVoterIds[_voterId] = true;
        
        emit VoterApproved(_voter);
    }

    // Add a helper function to check if a voter ID is already registered
    function isVoterIdRegistered(string memory _voterId) external view returns (bool) {
        return registeredVoterIds[_voterId];
    }

    // Add a function to get voter ID by address
    function getVoterIdByAddress(address _voter) external view returns (string memory) {
        return voterIdByAddress[_voter];
    }

    // Modified: Create election without requiring candidates
    function createElection(
        string memory _title,
        string memory _description,
        string memory _pincode,
        string memory _region,
        uint _startTime,
        uint _endTime
    ) external onlyAdmin {
        require(_startTime < _endTime, "Invalid election timing");
        require(bytes(_pincode).length > 0, "Pincode must not be empty");

        electionCount++;
        Election storage newElection = elections[electionCount];
        newElection.electionId = electionCount;
        newElection.title = _title;
        newElection.description = _description;
        newElection.pincode = _pincode;
        newElection.region = _region;
        newElection.startTime = _startTime;
        newElection.endTime = _endTime;
        newElection.isActive = false;
        newElection.isEnded = false;

        emit ElectionCreated(electionCount);
    }

    // New function to add a candidate to an existing election
    function addCandidate(
        uint _electionId,
        string memory _name,
        string memory _party,
        string memory _slogan,
        string memory _pincode,
        string memory _constituency
    ) external onlyAdmin {
        // Make sure the election exists and is not active or ended
        Election storage election = elections[_electionId];
        require(election.electionId == _electionId, "Election does not exist");
        require(!election.isActive, "Cannot add candidates to active election");
        require(!election.isEnded, "Cannot add candidates to ended election");
        
        // Add the new candidate
        uint candidateId = election.candidates.length + 1;
        election.candidates.push(Candidate({
            candidateId: candidateId,
            name: _name,
            party: _party,
            slogan: _slogan,
            pincode: _pincode,
            constituency: _constituency,
            voteCount: 0
        }));
        
        emit CandidateAdded(_electionId, candidateId);
    }

    // Start election
    function startElection(uint _electionId) external onlyAdmin {
        Election storage e = elections[_electionId];
        require(!e.isActive && !e.isEnded, "Election already started or ended");
        require(e.candidates.length > 0, "At least one candidate required before starting election");
        e.isActive = true;
        emit ElectionStarted(_electionId);
    }

    // End election and archive - Modified to avoid the struct array copy issue
    function endElection(uint _electionId) external onlyAdmin {
        Election storage e = elections[_electionId];
        require(e.isActive, "Election is not active");
        require(!e.isEnded, "Election already ended");

        e.isActive = false;
        e.isEnded = true;

        // Archive election details first with pincode and region
        archivedElections.push(ArchivedElection({
            electionId: e.electionId,
            title: e.title,
            description: e.description,
            pincode: e.pincode,
            region: e.region,
            startTime: e.startTime,
            endTime: e.endTime
        }));
        
        // Store the candidates separately using a mapping based on electionId
        uint archivedIndex = archivedElections.length - 1;
        
        // Now copy the candidates one by one to the archived candidates mapping
        for (uint i = 0; i < e.candidates.length; i++) {
            archivedElectionCandidates[archivedIndex].push(Candidate({
                candidateId: e.candidates[i].candidateId,
                name: e.candidates[i].name,
                party: e.candidates[i].party,
                slogan: e.candidates[i].slogan,
                pincode: e.candidates[i].pincode,
                constituency: e.candidates[i].constituency,
                voteCount: e.candidates[i].voteCount
            }));
        }

        emit ElectionEnded(_electionId);
    }

    // Update castVote to check pincode eligibility
    function castVote(uint _electionId, uint _candidateId) external {
        address voter = msg.sender;
        require(voters[voter].isApproved, "Voter not approved");
        
        Election storage e = elections[_electionId];
        require(e.isActive, "Election not active");
        require(block.timestamp >= e.startTime && block.timestamp <= e.endTime, "Voting window closed");
        require(!e.hasVoted[voter], "Already voted");
        require(_candidateId > 0 && _candidateId <= e.candidates.length, "Invalid candidate");
        
        // Verify voter's pincode matches the election's pincode or is for the same region
        require(
            keccak256(bytes(voters[voter].pincode)) == keccak256(bytes(e.pincode)),
            "Voter not eligible for this election based on pincode"
        );
        
        e.candidates[_candidateId - 1].voteCount++;
        e.hasVoted[voter] = true;
        
        emit VoteCasted(voter, _electionId, _candidateId);
    }

    // Utility Views
    function getCandidateCount(uint _electionId) external view returns (uint) {
        return elections[_electionId].candidates.length;
    }

    function getCandidate(uint _electionId, uint _candidateId) external view returns (Candidate memory) {
        return elections[_electionId].candidates[_candidateId - 1];
    }

    // New function to get all candidates for an election
    function getAllCandidates(uint _electionId) external view returns (Candidate[] memory) {
        uint count = elections[_electionId].candidates.length;
        Candidate[] memory allCandidates = new Candidate[](count);
        
        for (uint i = 0; i < count; i++) {
            allCandidates[i] = elections[_electionId].candidates[i];
        }
        
        return allCandidates;
    }

    function getArchivedElection(uint index) external view returns (ArchivedElection memory) {
        return archivedElections[index];
    }

    function getArchivedCount() external view returns (uint) {
        return archivedElections.length;
    }
    
    // New function to get archived election candidates
    function getArchivedElectionCandidates(uint _archivedIndex) external view returns (Candidate[] memory) {
        return archivedElectionCandidates[_archivedIndex];
    }

    function hasVoterVoted(address _voter, uint _electionId) external view returns (bool) {
        return elections[_electionId].hasVoted[_voter];
    }

    // Add function to get complete voter details
    function getVoterDetails(address _voter) external view returns (Voter memory) {
        return voters[_voter];
    }

    // Add function to verify if voter is eligible for an election based on pincode
    function isVoterEligibleForElection(address _voter, uint _electionId) external view returns (bool) {
        // Get voter and election details
        Voter memory voter = voters[_voter];
        string memory electionPincode = elections[_electionId].pincode;
        
        // Check if voter is approved and pincode matches election pincode
        return (voter.isApproved && 
                keccak256(bytes(voter.pincode)) == keccak256(bytes(electionPincode)));
    }
}
