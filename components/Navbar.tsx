"use client";

import Link from "next/link";
import { useCartStore } from "@/lib/cart-store";
import { AppKitButton } from "@reown/appkit/react";

export function Navbar() {
  const itemCount = useCartStore((s) => s.itemCount());

  return (
    <header className="border-b border-black py-2 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <Link href="/" className="text-xl font-bold">
          $BREAD
        </Link>
        <nav className="flex flex-wrap gap-3 text-sm sm:text-base">
          <Link href="/">home</Link>
          <Link href="/shop">shop</Link>
          <Link href="/cart">
            cart
            {itemCount > 0 && (
              <span className="ml-1 animate-pulse" style={{ color: "#00c" }}>
                ({itemCount})
              </span>
            )}
          </Link>
          <Link href="/token" className="text-[#00c] hover:underline">
            token
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <AppKitButton />
        </div>
      </div>
    </header>
  );
}
