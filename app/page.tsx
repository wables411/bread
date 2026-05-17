import Link from "next/link";
import { HomeHero } from "@/components/HomeHero";

export default function HomePage() {
  return (
    <div>
      <section className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-1/2">
            <HomeHero />
          </div>
          <div className="w-full sm:w-1/2">
            <h1 className="text-2xl font-bold mb-2">
              Welcome traveler!
            </h1>
            <p className="mb-4">
              Trade in your $BREAD or other tokens here for fresh baked goods.
            </p>
            <Link href="/shop" className="text-[#00c] hover:underline">
              shop now →
            </Link>
          </div>
        </div>
      </section>

      <section className="mb-8 border-t border-black pt-6">
        <h2 className="font-bold mb-2">How it works</h2>
        <p className="text-sm sm:text-base">
          Order Placed → Bread Baked → Bread Cools → Bread Ships → You Eat Bread
        </p>
      </section>

      <section className="mb-8 border-t border-black pt-6">
        <h2 className="font-bold mb-2">Exchange Options</h2>
        <p className="mb-2">
          $BREAD, $CULT, $ETH, USDC
        </p>
        <div className="flex gap-4 my-4 items-center flex-wrap">
          <img src="/models/media/bread.png" alt="$BREAD" className="h-12 w-auto" />
          <img src="/models/media/cult.png" alt="$CULT" className="h-12 w-auto" />
          <img src="/models/media/eth.png" alt="ETH" className="h-12 w-auto" />
          <img src="/models/media/usdc.png" alt="USDC" className="h-12 w-auto" />
        </div>
      </section>
    </div>
  );
}
