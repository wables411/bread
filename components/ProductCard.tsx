"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PRODUCTS } from "@/lib/constants";
import { useCartStore } from "@/lib/cart-store";
import { useWeeklyInventory } from "@/lib/use-weekly-inventory";
import { PriceDisplay } from "@/components/PriceDisplay";
import { toast } from "sonner";
import { ThreeDViewerModal } from "./ThreeDViewerModal";

interface ProductCardProps {
  productId: string;
}

export function ProductCard({ productId }: ProductCardProps) {
  const info = PRODUCTS.find((p) => p.id === productId);
  const [showModal, setShowModal] = useState(false);
  const [qty, setQty] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const setWeeklyAvailable = useCartStore((s) => s.setWeeklyAvailable);
  const itemCount = useCartStore((s) => s.itemCount);
  const { data: inventory } = useWeeklyInventory();

  useEffect(() => {
    if (inventory) setWeeklyAvailable(inventory.available);
  }, [inventory, setWeeklyAvailable]);

  if (!info) return null;

  const available = inventory?.available ?? 10;
  const soldOut = !info.inStock || available === 0;
  const remainingForCart = Math.max(0, available - itemCount());

  return (
    <div className="border border-black p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-48 shrink-0">
          {info.modelPath ? (
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
          ) : (
            <div className="h-32 w-full border border-gray-300 overflow-hidden">
              <img
                src={info.thumbnail}
                alt={info.name}
                className="h-full w-full object-contain"
              />
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-bold">{info.name}</h3>
          <p className="text-sm text-gray-600 mt-1">
            <PriceDisplay usdAmount={info.price} className="font-bold" />
          </p>
          {soldOut ? (
            <p className="mt-2 text-red-600 font-medium">
              {!info.inStock ? "Out of stock" : "Sold out for this week"}
            </p>
          ) : (
            <>
              {inventory && (
                <p className="mt-1 text-sm text-gray-600">
                  {remainingForCart} left this week
                </p>
              )}
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <label htmlFor={`qty-${info.id}`}>qty:</label>
                <input
                  id={`qty-${info.id}`}
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
                    const result = addItem(info.id, qty);
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
        </div>
      </div>
      {info.modelPath && (
        <ThreeDViewerModal
          open={showModal}
          modelPath={info.modelPath}
          title={info.name}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
