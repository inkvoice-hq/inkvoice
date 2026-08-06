import { listProducts } from "@/lib/db/products";
import { ProductsView } from "./ProductsView";

export default async function ProductsPage() {
  const products = await listProducts();
  return <ProductsView initialProducts={products} />;
}
