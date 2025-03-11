// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VoteSure {
    address public admin;
    bool public electionStarted;
    bool public electionEnded;
    
    struct Voter {
        bool isRegistered;
        bool isApproved;
        bool hasVoted;
        uint256 votedCandidateId;
    }
    
    struct Candidate {
        uint256 id;
        string name;
        string party;
        string slogan;
        uint256 voteCount;
    }
    
    mapping(address => Voter) public voters;
    mapping(uint256 => Candidate) public candidates;
    uint256 public candidatesCount;
    uint256 public approvedVotersCount;
    uint256 public totalVotesCount;
    
    event VoterRegistered(address indexed voterAddress);
    event VoterApproved(address indexed voterAddress);
    event VoterRejected(address indexed voterAddress);
    event CandidateAdded(uint256 indexed candidateId, string name, string party);
    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event ElectionStarted(uint256 timestamp);
    event ElectionEnded(uint256 timestamp);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    modifier electionIsOngoing() {
        require(electionStarted, "Election has not started yet");
        require(!electionEnded, "Election has already ended");
        _;
    }
    
    constructor() {
        admin = msg.sender;
        electionStarted = false;
        electionEnded = false;
    }
    
    function registerVoter(address _voterAddress) external {
        require(!voters[_voterAddress].isRegistered, "Voter already registered");
        
        voters[_voterAddress].isRegistered = true;
        voters[_voterAddress].isApproved = false;
        voters[_voterAddress].hasVoted = false;
        
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
    
    function addCandidate(string memory _name, string memory _party, string memory _slogan) external onlyAdmin {
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, _party, _slogan, 0);
        
        emit CandidateAdded(candidatesCount, _name, _party);
    }
    
    function startElection() external onlyAdmin {
        require(!electionStarted, "Election already started");
        require(!electionEnded, "Election already ended");
        
        electionStarted = true;
        
        emit ElectionStarted(block.timestamp);
    }
    
    function endElection() external onlyAdmin {
        require(electionStarted, "Election not started yet");
        require(!electionEnded, "Election already ended");
        
        electionEnded = true;
        
        emit ElectionEnded(block.timestamp);
    }
    
    function castVote(uint256 _candidateId) external electionIsOngoing {
        require(voters[msg.sender].isRegistered, "Voter not registered");
        require(voters[msg.sender].isApproved, "Voter not approved");
        require(!voters[msg.sender].hasVoted, "Voter has already voted");
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate ID");
        
        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedCandidateId = _candidateId;
        
        candidates[_candidateId].voteCount++;
        totalVotesCount++;
        
        emit VoteCast(msg.sender, _candidateId);
    }
    
    function getVoterStatus(address _voterAddress) external view returns (bool isRegistered, bool isApproved, bool hasVoted, uint256 votedCandidateId) {
        Voter memory voter = voters[_voterAddress];
        return (voter.isRegistered, voter.isApproved, voter.hasVoted, voter.votedCandidateId);
    }
    
    function getCandidate(uint256 _candidateId) external view returns (uint256 id, string memory name, string memory party, string memory slogan, uint256 voteCount) {
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate ID");
        Candidate memory candidate = candidates[_candidateId];
        return (candidate.id, candidate.name, candidate.party, candidate.slogan, candidate.voteCount);
    }
    
    function getElectionStatus() external view returns (bool started, bool ended, uint256 totalCandidates, uint256 totalApprovedVoters, uint256 totalVotes) {
        return (electionStarted, electionEnded, candidatesCount, approvedVotersCount, totalVotesCount);
    }
} 