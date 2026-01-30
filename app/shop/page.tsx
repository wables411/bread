"use client";

import { ProductCard } from "@/components/ProductCard";
import { useWeeklyInventory } from "@/lib/use-weekly-inventory";

export default function ShopPage() {
  const { data: inventory, loading } = useWeeklyInventory();

  const showBanner = !loading && inventory;
  const soldOut = inventory?.available === 0;
  const bannerClass = soldOut
    ? "border-red-500 bg-red-50 text-red-800"
    : "border-gray-300 bg-gray-50";

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Shop</h1>
      {showBanner && (
        <div className={`mb-4 p-3 border ${bannerClass}`}>
          {soldOut ? (
            <>
              <strong>Sold out for this week</strong> - check back next week.
            </>
          ) : (
            <strong>{inventory?.available} baked goods left this week</strong>
          )}
        </div>
      )}
      <div className="space-y-4">
        <ProductCard product="loaf" />
        <ProductCard product="roll" />
      </div>
    </div>
  );
}
