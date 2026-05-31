"use client";

import dynamic from "next/dynamic";
import { BREAD_TOKEN_ADDRESS, BASE_CHAIN_ID } from "@/lib/constants";

// Dynamic import to avoid SSR issues with the widget
const LiFiWidget = dynamic(
  () => import("@lifi/widget").then((m) => m.LiFiWidget),
  { ssr: false, loading: () => <p className="text-sm text-gray-500">Loading swap...</p> }
);

export function SwapWidget() {
  return (
    <div>
      <h2 className="font-bold mb-2">Get $BREAD</h2>
      <p className="text-sm text-gray-600 mb-3">
        Swap any token for $BREAD directly. Routes through Uniswap and other DEXes for best price.
      </p>
      <div className="max-w-[480px]">
        <LiFiWidget
          integrator="orderbread"
          toChain={BASE_CHAIN_ID}
          toToken={BREAD_TOKEN_ADDRESS}
          fromChain={BASE_CHAIN_ID}
          appearance="light"
          hiddenUI={["appearance", "language", "poweredBy"]}
          theme={{
            container: {
              border: "1px solid #000",
              borderRadius: "0px",
            },
          }}
        />
      </div>
    </div>
  );
}
