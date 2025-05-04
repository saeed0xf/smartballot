#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== VoteSure Smart Contract Setup Script ===${NC}"
echo "This script will help you compile and deploy the VoteSure smart contract."
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js v14 or higher.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo -e "${RED}Node.js version is too old. Please upgrade to v14 or higher.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js is installed ($(node -v))${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm is installed ($(npm -v))${NC}"

# Check if Truffle is installed
if ! command -v truffle &> /dev/null; then
    echo -e "${YELLOW}Truffle is not installed globally. Would you like to install it now? (y/n)${NC}"
    read -r install_truffle
    if [[ "$install_truffle" =~ ^[Yy]$ ]]; then
        echo "Installing Truffle globally..."
        npm install -g truffle
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to install Truffle. Please check your npm configuration.${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓ Truffle installed successfully${NC}"
    else
        echo -e "${RED}Truffle is required for this setup. Exiting.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Truffle is installed ($(truffle version | grep Truffle | cut -d 'v' -f 2))${NC}"
fi

# Check if blockchain directory exists
if [ ! -d "blockchain" ]; then
    echo -e "${YELLOW}The blockchain directory does not exist. Creating it now...${NC}"
    mkdir -p blockchain/contracts
    mkdir -p blockchain/migrations
    
    # Create truffle-config.js if it doesn't exist
    if [ ! -f "blockchain/truffle-config.js" ]; then
        echo "Creating default Truffle configuration..."
        cat > blockchain/truffle-config.js << 'EOF'
module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*"
    }
  },
  compilers: {
    solc: {
      version: "0.8.0",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  }
};
EOF
    fi
    
    # Create migrations file
    if [ ! -f "blockchain/migrations/1_initial_migration.js" ]; then
        cat > blockchain/migrations/1_initial_migration.js << 'EOF'
const VoteSure = artifacts.require("VoteSure");

module.exports = function (deployer) {
  deployer.deploy(VoteSure);
};
EOF
    fi
    
    # Create package.json for blockchain directory
    if [ ! -f "blockchain/package.json" ]; then
        cat > blockchain/package.json << 'EOF'
{
  "name": "votesure-blockchain",
  "version": "1.0.0",
  "description": "Smart contracts for the VoteSure voting system",
  "main": "truffle-config.js",
  "scripts": {
    "compile": "truffle compile",
    "migrate": "truffle migrate",
    "test": "truffle test"
  },
  "dependencies": {
    "@truffle/hdwallet-provider": "^2.0.0"
  }
}
EOF
    fi
fi

# Navigate to blockchain directory
cd blockchain || exit

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install dependencies. Please check your npm configuration.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Dependencies installed successfully${NC}"

# Check if VoteSure.sol exists
if [ ! -f "contracts/VoteSure.sol" ]; then
    echo -e "${YELLOW}VoteSure.sol not found. Do you want to create a basic version? (y/n)${NC}"
    read -r create_contract
    if [[ "$create_contract" =~ ^[Yy]$ ]]; then
        # Create a basic VoteSure contract
        echo "Creating basic VoteSure.sol contract..."
        cat > contracts/VoteSure.sol << 'EOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VoteSure {
    address public admin;
    
    enum ElectionState { Inactive, Active, Ended }
    ElectionState public electionState = ElectionState.Inactive;
    
    mapping(uint256 => uint256) public candidateVotes;
    mapping(address => bool) public hasVoted;
    
    event ElectionStarted();
    event ElectionEnded();
    event VoteCast(uint256 candidateId, uint256 newVoteCount);
    event AlreadyStarted();
    event AlreadyEnded();
    
    constructor() {
        admin = msg.sender;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    function startElection() public onlyAdmin {
        if (electionState == ElectionState.Active) {
            emit AlreadyStarted();
            return;
        }
        
        electionState = ElectionState.Active;
        emit ElectionStarted();
    }
    
    function endElection() public onlyAdmin {
        if (electionState == ElectionState.Ended) {
            emit AlreadyEnded();
            return;
        }
        
        if (electionState == ElectionState.Active) {
            electionState = ElectionState.Ended;
            emit ElectionEnded();
        }
    }
    
    function castVote(uint256 candidateId) public {
        require(electionState == ElectionState.Active, "Election is not active");
        require(!hasVoted[msg.sender], "You have already voted");
        
        candidateVotes[candidateId]++;
        hasVoted[msg.sender] = true;
        
        emit VoteCast(candidateId, candidateVotes[candidateId]);
    }
    
    function getCandidateVotes(uint256 candidateId) public view returns (uint256) {
        return candidateVotes[candidateId];
    }
}
EOF
        echo -e "${GREEN}✓ Basic VoteSure.sol contract created${NC}"
    else
        echo -e "${RED}VoteSure.sol is required for compilation. Please create the contract first.${NC}"
        exit 1
    fi
fi

# Compile the contract
echo -e "${YELLOW}Compiling the smart contract...${NC}"
truffle compile
if [ $? -ne 0 ]; then
    echo -e "${RED}Compilation failed. Please check your contract for errors.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Smart contract compiled successfully${NC}"

# Ask about deployment
echo -e "${YELLOW}Do you want to deploy the contract to a local Ganache instance? (y/n)${NC}"
read -r deploy_contract

if [[ "$deploy_contract" =~ ^[Yy]$ ]]; then
    # Check if Ganache is running
    if ! nc -z localhost 7545 > /dev/null 2>&1; then
        echo -e "${RED}Ganache does not seem to be running on port 7545.${NC}"
        echo -e "${YELLOW}Please start Ganache before deploying the contract.${NC}"
        echo "You can start Ganache CLI with: ganache-cli -p 7545"
        echo "Or use the Ganache GUI application set to port 7545."
        exit 1
    fi
    
    echo -e "${YELLOW}Deploying the contract to local Ganache...${NC}"
    truffle migrate --network development --reset
    if [ $? -ne 0 ]; then
        echo -e "${RED}Deployment failed. Please check your Ganache connection.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Smart contract deployed successfully${NC}"
    
    # Extract contract address from build artifacts
    if [ -f "build/contracts/VoteSure.json" ]; then
        CONTRACT_ADDRESS=$(grep -o '"address": "[^"]*"' build/contracts/VoteSure.json | head -1 | cut -d '"' -f 4)
        echo -e "${GREEN}Contract Address: ${YELLOW}$CONTRACT_ADDRESS${NC}"
        
        # Update or create .env file with contract address
        if [ -f "../.env" ]; then
            # Check if CONTRACT_ADDRESS already exists in .env
            if grep -q "CONTRACT_ADDRESS=" "../.env"; then
                # Update existing CONTRACT_ADDRESS
                sed -i.bak "s/CONTRACT_ADDRESS=.*/CONTRACT_ADDRESS=$CONTRACT_ADDRESS/" "../.env"
            else
                # Add CONTRACT_ADDRESS to .env
                echo "CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> "../.env"
            fi
        else
            # Create new .env file
            echo "CONTRACT_ADDRESS=$CONTRACT_ADDRESS" > "../.env"
            echo "BLOCKCHAIN_RPC_URL=http://127.0.0.1:7545" >> "../.env"
        fi
        echo -e "${GREEN}✓ Updated .env file with contract address${NC}"
    else
        echo -e "${RED}Could not find VoteSure.json build artifact. Contract may not have deployed correctly.${NC}"
    fi
fi

echo -e "${GREEN}=== Smart Contract Setup Complete ===${NC}"
echo "You can now use the VoteSure smart contract with your application."
echo "Make sure to update your backend environment variables if necessary."
echo ""

# Return to original directory
cd ..

# Success
exit 0 