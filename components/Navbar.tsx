"use client";

import Link from "next/link";
import { useCartStore } from "@/lib/cart-store";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Navbar() {
  const itemCount = useCartStore((s) => s.itemCount());

  return (
    <header className="border-b border-black py-2 px-4">
      <table className="w-full" cellPadding={0} cellSpacing={0}>
        <tbody>
          <tr>
            <td className="w-1/3 align-top">
              <Link href="/" className="text-xl font-bold">
                $BREAD
              </Link>
            </td>
            <td className="w-1/3 text-center align-top">
              <nav className="space-x-4">
                <Link href="/">home</Link>
                <Link href="/shop">shop</Link>
                <Link href="/cart">
                  cart
                  {itemCount > 0 && (
                    <span
                      className="ml-1 animate-pulse"
                      style={{ color: "#00c" }}
                    >
                      ({itemCount})
                    </span>
                  )}
                </Link>
                <Link href="/token">token</Link>
              </nav>
            </td>
            <td className="w-1/3 text-right align-top">
              <div className="flex justify-end gap-2 items-center">
                <input
                  type="text"
                  placeholder="search..."
                  className="border border-black px-2 py-1 text-sm w-32"
                  readOnly
                  aria-label="Search (placeholder)"
                />
                <ConnectButton />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </header>
  );
}
