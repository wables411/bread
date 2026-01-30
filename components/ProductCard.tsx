"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { ProductId } from "@/lib/types";
import { PRODUCT_PRICES } from "@/lib/constants";
import { useCartStore } from "@/lib/cart-store";
import { useWeeklyInventory } from "@/lib/use-weekly-inventory";
import { PriceDisplay } from "@/components/PriceDisplay";
import { toast } from "sonner";
import { ThreeDViewerModal } from "./ThreeDViewerModal";

const SOURDOUGH_GLB = "/models/media/$bread%20on%20base.glb";
const CINNABUNZ_GLB = "/models/media/cinnabunz.glb";

const PRODUCTS: Record<
  ProductId,
  { name: string; modelPath: string; thumbnail: string; desc: string }
> = {
  loaf: {
    name: "sourdough loaf",
    modelPath: SOURDOUGH_GLB,
    thumbnail: "/models/media/bread.png",
    desc: "10 usdc",
  },
  roll: {
    name: "cinnabunz (6) + icing",
    modelPath: CINNABUNZ_GLB,
    thumbnail: "/models/media/cinnabunz.png",
    desc: "20 usdc",
  },
};

interface ProductCardProps {
  product: ProductId;
}

export function ProductCard({ product }: ProductCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [qty, setQty] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const setWeeklyAvailable = useCartStore((s) => s.setWeeklyAvailable);
  const itemCount = useCartStore((s) => s.itemCount);
  const { data: inventory } = useWeeklyInventory();
  const info = PRODUCTS[product];
  const price = PRODUCT_PRICES[product];

  useEffect(() => {
    if (inventory) setWeeklyAvailable(inventory.available);
  }, [inventory, setWeeklyAvailable]);

  const available = inventory?.available ?? 10;
  const soldOut = available === 0;
  const remainingForCart = Math.max(0, available - itemCount());

  return (
    <div className="border border-black p-4">
      <table className="w-full" cellPadding={0} cellSpacing={0}>
        <tbody>
          <tr>
            <td className="w-48 align-top pr-4">
              <button
                type="button"
                className="cursor-pointer h-32 w-full border border-gray-300 block overflow-hidden hover:border-[#00c] focus:border-[#00c] focus:outline-none"
                onClick={() => setShowModal(true)}
                aria-label={`View 3D model of ${info.name}`}
              >
                <img
                  src={info.thumbnail}
                  alt={info.name}
                  className="h-full w-full object-contain"
                />
              </button>
            </td>
            <td className="align-top">
              <h3 className="font-bold">{info.name}</h3>
              <p className="text-sm text-gray-600 mt-1">
                <PriceDisplay usdAmount={price} className="font-bold" />
              </p>
              {soldOut ? (
                <p className="mt-2 text-red-600 font-medium">Sold out for this week</p>
              ) : (
                <>
                  {inventory && (
                    <p className="mt-1 text-sm text-gray-600">
                      {remainingForCart} left this week
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <label htmlFor={`qty-${product}`}>qty:</label>
                    <input
                      id={`qty-${product}`}
                      type="number"
                      min={1}
                      max={Math.min(99, remainingForCart)}
                      value={qty}
                      onChange={(e) => setQty(Math.max(1, Math.min(remainingForCart, parseInt(e.target.value, 10) || 1)))}
                      className="border border-black w-16 px-2 py-1"
                    />
                    <Link
                      href="/cart"
                      onClick={(e) => {
                        const result = addItem(product, qty);
                        if (!result.success) {
                          e.preventDefault();
                          toast.error(result.error);
                        }
                      }}
                      className="text-[#00c] hover:underline"
                    >
                      add to cart
                    </Link>
                  </div>
                </>
              )}
            </td>
          </tr>
        </tbody>
      </table>
      <ThreeDViewerModal
        open={showModal}
        modelPath={info.modelPath}
        title={info.name}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
