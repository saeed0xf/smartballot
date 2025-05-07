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
        uint voteCount;
    }

    struct Election {
        uint electionId;
        string title;
        string description;
        uint startTime;
        uint endTime;
        bool isActive;
        bool isEnded;
        Candidate[] candidates;
        mapping(address => bool) hasVoted;
    }

    // Modify the ArchivedElection struct to not include the candidates array directly
    struct ArchivedElection {
        uint electionId;
        string title;
        string description;
        uint startTime;
        uint endTime;
    }

    // Create a separate mapping to store candidates for archived elections
    mapping(uint => Candidate[]) public archivedElectionCandidates;

    uint public electionCount;
    mapping(uint => Election) public elections;
    ArchivedElection[] public archivedElections;
    mapping(address => bool) public approvedVoters;

    // Events
    event VoterApproved(address voter);
    event ElectionCreated(uint electionId);
    event ElectionStarted(uint electionId);
    event ElectionEnded(uint electionId);
    event VoteCasted(address voter, uint electionId, uint candidateId);

    // Approve voter
    function approveVoter(address _voter) external onlyAdmin {
        require(!approvedVoters[_voter], "Voter already approved");
        approvedVoters[_voter] = true;
        emit VoterApproved(_voter);
    }

    // Create election
    function createElection(
        string memory _title,
        string memory _description,
        uint _startTime,
        uint _endTime,
        Candidate[] memory _candidates
    ) external onlyAdmin {
        require(_startTime < _endTime, "Invalid election timing");
        require(_candidates.length > 0, "At least one candidate required");

        electionCount++;
        Election storage newElection = elections[electionCount];
        newElection.electionId = electionCount;
        newElection.title = _title;
        newElection.description = _description;
        newElection.startTime = _startTime;
        newElection.endTime = _endTime;
        newElection.isActive = false;
        newElection.isEnded = false;

        for (uint i = 0; i < _candidates.length; i++) {
            newElection.candidates.push(Candidate({
                candidateId: i + 1,
                name: _candidates[i].name,
                party: _candidates[i].party,
                slogan: _candidates[i].slogan,
                voteCount: 0
            }));
        }

        emit ElectionCreated(electionCount);
    }

    // Start election
    function startElection(uint _electionId) external onlyAdmin {
        Election storage e = elections[_electionId];
        require(!e.isActive && !e.isEnded, "Election already started or ended");
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

        // Archive election details first
        archivedElections.push(ArchivedElection({
            electionId: e.electionId,
            title: e.title,
            description: e.description,
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
                voteCount: e.candidates[i].voteCount
            }));
        }

        emit ElectionEnded(_electionId);
    }

    // Cast vote
    function castVote(uint _electionId, uint _candidateId) external {
        require(approvedVoters[msg.sender], "Voter not approved");

        Election storage e = elections[_electionId];
        require(e.isActive, "Election not active");
        require(block.timestamp >= e.startTime && block.timestamp <= e.endTime, "Voting window closed");
        require(!e.hasVoted[msg.sender], "Already voted");
        require(_candidateId > 0 && _candidateId <= e.candidates.length, "Invalid candidate");

        e.candidates[_candidateId - 1].voteCount++;
        e.hasVoted[msg.sender] = true;

        emit VoteCasted(msg.sender, _electionId, _candidateId);
    }

    // Utility Views
    function getCandidateCount(uint _electionId) external view returns (uint) {
        return elections[_electionId].candidates.length;
    }

    function getCandidate(uint _electionId, uint _candidateId) external view returns (Candidate memory) {
        return elections[_electionId].candidates[_candidateId - 1];
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
}
