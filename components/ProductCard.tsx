"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProductId } from "@/lib/types";
import { PRODUCT_PRICES } from "@/lib/constants";
import { useCartStore, CART_MAX_ITEMS } from "@/lib/cart-store";
import { toast } from "sonner";
import { ThreeDViewer } from "./ThreeDViewer";
import { ThreeDViewerModal } from "./ThreeDViewerModal";

const PRODUCTS: Record<
  ProductId,
  { name: string; modelPath: string; desc: string }
> = {
  loaf: {
    name: "Fresh Bread Loaf",
    modelPath: "/models/bread-loaf.glb",
    desc: "Artisan loaf, $10",
  },
  roll: {
    name: "Cinnamon Roll Pack",
    modelPath: "/models/cinnamon-roll.glb",
    desc: "Pack of 6, $20",
  },
};

interface ProductCardProps {
  product: ProductId;
}

export function ProductCard({ product }: ProductCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [qty, setQty] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const info = PRODUCTS[product];
  const price = PRODUCT_PRICES[product];

  return (
    <div className="border border-black p-4">
      <table className="w-full" cellPadding={0} cellSpacing={0}>
        <tbody>
          <tr>
            <td className="w-48 align-top pr-4">
              <div
                className="cursor-pointer h-32 border border-gray-300"
                onClick={() => setShowModal(true)}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#00c")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
              >
                <ThreeDViewer
                  modelPath={info.modelPath}
                  className="h-full w-full"
                  autoRotate
                />
              </div>
            </td>
            <td className="align-top">
              <h3 className="font-bold">{info.name}</h3>
              <p className="text-sm text-gray-600">{info.desc}</p>
              <p className="mt-2 font-bold">${price}</p>
              <div className="mt-2 flex items-center gap-2">
                <label htmlFor={`qty-${product}`}>qty:</label>
                <input
                  id={`qty-${product}`}
                  type="number"
                  min={1}
                  max={99}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
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
            </td>
          </tr>
        </tbody>
      </table>
      {showModal && (
        <ThreeDViewerModal
          modelPath={info.modelPath}
          title={info.name}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
