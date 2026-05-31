import { NFT_COLLECTIONS } from "./constants";

// ABI fragments for on-chain reads
const ERC721_BALANCE_ABI = [
  { inputs: [{ name: "owner", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

const ERC1155_BALANCE_ABI = [
  { inputs: [{ name: "account", type: "address" }, { name: "id", type: "uint256" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const NFT_READ_CONFIG = {
  breadDelivery: {
    address: NFT_COLLECTIONS.breadDelivery.address,
    abi: ERC1155_BALANCE_ABI,
    chainId: NFT_COLLECTIONS.breadDelivery.chainId,
    functionName: "balanceOf" as const,
  },
  cinnabunz: {
    address: NFT_COLLECTIONS.cinnabunz.address,
    abi: ERC721_BALANCE_ABI,
    chainId: NFT_COLLECTIONS.cinnabunz.chainId,
    functionName: "balanceOf" as const,
  },
  bread8: {
    address: NFT_COLLECTIONS.bread8.address,
    abi: ERC1155_BALANCE_ABI,
    chainId: NFT_COLLECTIONS.bread8.chainId,
    functionName: "balanceOf" as const,
  },
} as const;

export { ERC721_BALANCE_ABI, ERC1155_BALANCE_ABI };
