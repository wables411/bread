"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, cookieToInitialState } from "wagmi";
import type { Config } from "wagmi";
import { createAppKit } from "@reown/appkit/react";
import { base, mainnet } from "@reown/appkit/networks";
import { wagmiAdapter, wagmiConfig } from "@/lib/wagmi-config";

const queryClient = new QueryClient();

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "bread-store-mvp";

const metadata = {
  name: "Bread Store",
  description: "Physical bread loaves and $BREAD token on Base",
  url: typeof window !== "undefined" ? window.location.origin : "https://bread.store",
  icons: ["/icon.png"],
};

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [mainnet, base],
  defaultNetwork: base,
  metadata,
  features: {
    analytics: true,
  },
});

export function Providers({
  children,
  cookies,
}: {
  children: React.ReactNode;
  cookies: string | null;
}) {
  let initialState;
  try {
    initialState = cookieToInitialState(wagmiConfig as Config, cookies);
  } catch {
    initialState = undefined;
  }

  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
