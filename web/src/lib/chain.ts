import { defineChain } from "viem";

export const botchainTestnet = defineChain({
  id: 968,
  name: "BOTChain Testnet",
  nativeCurrency: { name: "BOT", symbol: "tBOT", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_BOTCHAIN_RPC || "https://rpc.bohr.life"] } },
  blockExplorers: { default: { name: "BOTChain Explorer", url: "https://scan.bohr.life" } },
  testnet: true,
});

export const EXPLORER = botchainTestnet.blockExplorers.default.url;
