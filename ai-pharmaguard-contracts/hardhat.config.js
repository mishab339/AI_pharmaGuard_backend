const path = require('path')
require("dotenv").config({path:path.resolve(__dirname, "../ai-pharmaguard-server/.env")}); 

require("@nomicfoundation/hardhat-toolbox");


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
    networks: {
    // This is the network definition for the Shardeum Sphinx Dapp testnet
    shardeum: {
      url: process.env.SHARDEUM_RPC_URL, // This comes from your .env file
      accounts: [process.env.ORACLE_PRIVATE_KEY], // This also comes from your .env file
      chainId: 8081 // The specific Chain ID for the Sphinx Dapp network
    }
  }

};
