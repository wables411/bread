import Link from "next/link";
import { ThreeDViewer } from "@/components/ThreeDViewer";

export default function HomePage() {
  return (
    <div>
      <section className="mb-8">
        <table className="w-full" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td className="w-1/2 align-top pr-4">
                <div className="h-64 border border-gray-300">
                  <ThreeDViewer
                    modelPath="/models/bread-loaf.glb"
                    className="h-full w-full"
                    autoRotate
                  />
                </div>
              </td>
              <td className="align-top">
                <h1 className="text-2xl font-bold mb-2">
                  Fresh $BREAD – Physical Loaves or Trade the Token on Base
                </h1>
                <p className="mb-4">
                  Order artisan bread loaves and cinnamon rolls. Pay with USDC or
                  $BREAD token on Base.
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
          Order → Bake next day → Vacuum seal → Ship day after cooling
        </p>
      </section>

      <section className="mb-8 border-t border-black pt-6">
        <h2 className="font-bold mb-2">$BREAD Token</h2>
        <p className="mb-2">
          Trade $BREAD on Base. Pay for orders with $BREAD or USDC.
        </p>
        <Link href="/token" className="text-[#00c] hover:underline">
          token info →
        </Link>
      </section>
    </div>
  );
}
