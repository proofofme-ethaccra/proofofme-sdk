import "hardhat";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ignition-ethers";
import "@nomicfoundation/hardhat-ethers-chai-matchers";
import "@nomicfoundation/hardhat-keystore";
import "@nomicfoundation/hardhat-mocha";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-typechain";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import * as dotenv from "dotenv";

dotenv.config();

const config = {
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.SEPOLIA_PRIVATE_KEY!],
    },
  },
};

export default config;
