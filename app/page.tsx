import Link from "next/link";
import { HomeHero } from "@/components/HomeHero";

export default function HomePage() {
  return (
    <div>
      <section className="mb-8">
        <table className="w-full" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td className="w-1/2 align-top pr-4">
                <HomeHero />
              </td>
              <td className="align-top">
                <h1 className="text-2xl font-bold mb-2">
                  Welcome traveler!
                </h1>
                <p className="mb-4">
                  Trade in your $BREAD or other tokens here for fresh baked goods.
                </p>
                <Link href="/shop" className="text-[#00c] hover:underline">
                  shop now →
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mb-8 border-t border-black pt-6">
        <h2 className="font-bold mb-2">How it works</h2>
        <p>
          Order Placed → Bread Baked → Bread Cools → Bread Ships → You Eat Bread
        </p>
      </section>

      <section className="mb-8 border-t border-black pt-6">
        <h2 className="font-bold mb-2">Exchange Options</h2>
        <p className="mb-2">
          $BREAD, $CULT, $ETH, USDC
        </p>
        <div className="flex gap-4 my-4 items-center">
          <img src="/models/media/bread.png" alt="$BREAD" className="h-12 w-auto max-h-12" style={{ height: 48, maxHeight: 48 }} />
          <img src="/models/media/cult.png" alt="$CULT" className="h-12 w-auto max-h-12" style={{ height: 48, maxHeight: 48 }} />
          <img src="/models/media/eth.png" alt="ETH" className="h-12 w-auto max-h-12" style={{ height: 48, maxHeight: 48 }} />
          <img src="/models/media/usdc.png" alt="USDC" className="h-12 w-auto max-h-12" style={{ height: 48, maxHeight: 48 }} />
        </div>
      </section>
    </div>
  );
}
