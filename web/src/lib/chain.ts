import { defineChain } from "viem";
import { CHAIN_ID } from "./contract";

export const botchainMainnet = defineChain({
  id: 677,
  name: "BOT Chain",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.botchain.ai"] } },
  blockExplorers: { default: { name: "BOT Chain Explorer", url: "https://scan.botchain.ai" } },
});

export const botchainTestnet = defineChain({
  id: 968,
  name: "BOT Chain Testnet",
  nativeCurrency: { name: "BOT", symbol: "tBOT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.bohr.life"] } },
  blockExplorers: { default: { name: "BOT Chain Testnet Explorer", url: "https://scan.bohr.life" } },
  testnet: true,
});

/** The chain the deployed contract lives on (written by the deploy script). */
export const activeChain = CHAIN_ID === botchainMainnet.id ? botchainMainnet : botchainTestnet;
export const IS_MAINNET = activeChain.id === botchainMainnet.id;
export const NETWORK_LABEL = IS_MAINNET ? "Mainnet" : "Testnet";
export const EXPLORER = activeChain.blockExplorers.default.url;
