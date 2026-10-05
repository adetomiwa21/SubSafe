require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PK = process.env.PRIVATE_KEY;

module.exports = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true } },
  paths: { sources: "./src", tests: "./test" },
  networks: {
    botchain: {
      url: process.env.BOTCHAIN_RPC || "https://rpc.bohr.life",
      chainId: 968,
      accounts: PK ? [PK] : [],
    },
  },
  etherscan: {
    apiKey: { botchain: "empty" },
    customChains: [
      {
        network: "botchain",
        chainId: 968,
        urls: { apiURL: "https://scan.bohr.life/api", browserURL: "https://scan.bohr.life" },
      },
    ],
  },
  sourcify: { enabled: false },
};
