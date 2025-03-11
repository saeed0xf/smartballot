const HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config();

const privateKey = process.env.ADMIN_PRIVATE_KEY || '0x10cad5763124cef978bf07e4bedfbc13a13bae80868a642abe8750e1d8b2e5aa';

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*", // Match any network id
    },
    ganache: {
      provider: () => new HDWalletProvider(privateKey, 'http://127.0.0.1:7545'),
      network_id: '*',
      gas: 5000000,
      gasPrice: 20000000000,
      confirmations: 0,
      timeoutBlocks: 50,
      skipDryRun: true
    }
  },
  compilers: {
    solc: {
      version: "0.8.19",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  },
  contracts_directory: './contracts/',
  contracts_build_directory: './build/contracts/',
  migrations_directory: './migrations/'
}; 