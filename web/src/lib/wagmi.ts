import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { activeChain, botchainMainnet, botchainTestnet } from "./chain";

// Injected only: MetaMask, BO Wallet, TokenPocket, OKX… no backend or API keys needed.
export const config = createConfig({
  chains: [activeChain],
  connectors: [injected()],
  transports: { [botchainMainnet.id]: http(), [botchainTestnet.id]: http() },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
