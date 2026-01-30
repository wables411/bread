"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useSwitchChain,
  useWriteContract,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits } from "viem";
import type { PaymentOption } from "@/lib/payment-options";

// ERC20 transfer ABI
const ERC20_TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

interface PayButtonProps {
  option: PaymentOption;
  amount: number;
  totalUsd: number;
  merchantAddress: string;
  /** Called before sending tx - return form data if valid, null to abort */
  onBeforePay?: () => Promise<unknown>;
  /** Called when tx is confirmed */
  onPaySuccess?: (txHash: string) => void | Promise<void>;
}

export function PayButton({
  option,
  amount,
  totalUsd,
  merchantAddress,
  onBeforePay,
  onPaySuccess,
}: PayButtonProps) {
  const { address, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [pendingHash, setPendingHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const { sendTransactionAsync, isPending: isSendPending } =
    useSendTransaction();

  const { data: receipt, isSuccess: isReceiptSuccess } =
    useWaitForTransactionReceipt({ hash: (pendingHash ?? undefined) as `0x${string}` | undefined });

  useEffect(() => {
    if (pendingHash && isReceiptSuccess && receipt && onPaySuccess) {
      onPaySuccess(pendingHash);
      setPendingHash(null);
    }
  }, [pendingHash, isReceiptSuccess, receipt, onPaySuccess]);

  const isPending = isWritePending || isSendPending || (!!pendingHash && !isReceiptSuccess);
  const needsChainSwitch = chain?.id !== option.chainId;

  const handleSwitchChain = async () => {
    setError(null);
    try {
      await switchChainAsync?.({ chainId: option.chainId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to switch chain");
    }
  };

  const handlePay = async () => {
    setError(null);
    setPendingHash(null);

    if (onBeforePay) {
      const formData = await onBeforePay();
      if (formData == null) return;
    }

    if (needsChainSwitch) {
      await handleSwitchChain();
      return;
    }

    try {
      if (option.contractAddress) {
        const decimals = option.decimals;
        const amountWei = parseUnits(amount.toFixed(decimals), decimals);
        const hash = await writeContractAsync({
          address: option.contractAddress as `0x${string}`,
          abi: ERC20_TRANSFER_ABI,
          functionName: "transfer",
          args: [merchantAddress as `0x${string}`, amountWei],
        });
        setPendingHash(hash);
      } else {
        const amountWei = parseUnits(amount.toFixed(18), 18);
        const hash = await sendTransactionAsync({
          to: merchantAddress as `0x${string}`,
          value: amountWei,
        });
        setPendingHash(hash ?? "");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    }
  };

  if (!address) {
    return (
      <p className="text-sm text-amber-600">
        Connect wallet to send payment.
      </p>
    );
  }

  return (
    <div>
      {needsChainSwitch ? (
        <button
          type="button"
          onClick={handleSwitchChain}
          disabled={isPending}
          className="border border-black px-4 py-2 text-[#00c] hover:underline disabled:opacity-50"
        >
          Switch to {option.chain === "base" ? "Base" : "Ethereum"}
        </button>
      ) : (
        <button
          type="button"
          onClick={handlePay}
          disabled={isPending}
          className="border border-black px-4 py-2 text-[#00c] hover:underline disabled:opacity-50"
        >
          {isPending ? "sending..." : `Send ${option.token}`}
        </button>
      )}

      {pendingHash && !isReceiptSuccess && (
        <div className="mt-2 p-2 bg-amber-50 border border-amber-200">
          <p className="text-sm font-bold">Confirming transaction…</p>
          <p className="text-xs font-mono break-all">{pendingHash}</p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}
