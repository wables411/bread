import { ProductCard } from "@/components/ProductCard";

export default function ShopPage() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Shop</h1>
      <div className="space-y-4">
        <ProductCard product="loaf" />
        <ProductCard product="roll" />
      </div>
    </div>
  );
}
