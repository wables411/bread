import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, mainnet } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "Bread Store",
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "bread-store-mvp",
  chains: [mainnet, base],
  ssr: true,
});
