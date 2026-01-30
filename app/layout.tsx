import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "$BREAD – Fresh Loaves & Token on Base",
  description: "Physical bread loaves and cinnamon rolls. $BREAD token on Base.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Toaster position="top-center" richColors />
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <aside className="border-b border-black px-4 py-2 text-sm bg-gray-50">
              <a href="/shop" style={{ color: "#00c" }}>
                shop
              </a>
              {" | "}
              <a href="/token" style={{ color: "#00c" }}>
                $BREAD token
              </a>
              {" | "}
              <a href="/cart" style={{ color: "#00c" }}>
                cart
              </a>
            </aside>
            <main className="flex-1 px-4 py-6">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
