import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PreloadModels } from "@/components/PreloadModels";

export const metadata: Metadata = {
  title: "$bread",
  description: "Physical bread loaves and cinnamon rolls. $BREAD token on Base.",
  icons: {
    icon: "/models/media/bread.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let cookies: string | null = null;
  try {
    const headersObj = await headers();
    cookies = headersObj.get("cookie");
  } catch {
    // headers() can throw during static gen or edge cases
  }

  return (
    <html lang="en" className="light">
      <body className="bg-white text-black">
        <Providers cookies={cookies}>
          <PreloadModels />
          <Toaster position="top-center" richColors />
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 px-4 py-6">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
