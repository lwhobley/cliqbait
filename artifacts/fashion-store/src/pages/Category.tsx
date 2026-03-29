import { useRoute } from 'wouter';
import { useGetProductsByCategory, useGetProducts } from '@workspace/api-client-react';
import { ProductCard } from '@/components/ProductCard';
import { Loader2 } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  tshirts: 'T-Shirts',
  hoodies: 'Hoodies',
  sweats: 'Sweats',
  shirts: 'Shirts',
  pants: 'Pants',
  bags: 'Bags',
  accessories: 'Accessories',
  all: 'All Products',
  'new-arrivals': 'New Arrivals',
};

export function Category() {
  const [, params] = useRoute('/shop/:category');
  const category = params?.category || 'all';
  
  // If category is 'all', we might want to fetch all products, else fetch by category.
  // Using a conditional approach with React Query
  const isAll = category === 'all';
  
  const allProductsQuery = useGetProducts({ query: { enabled: isAll } });
  const categoryProductsQuery = useGetProductsByCategory(category, { query: { enabled: !isAll } });

  const isLoading = isAll ? allProductsQuery.isLoading : categoryProductsQuery.isLoading;
  const products = isAll ? allProductsQuery.data : categoryProductsQuery.data;

  return (
    <div className="min-h-screen bg-white pt-24">
      <div className="px-6 py-12 md:py-24 border-b border-black">
        <h1 className="font-display text-5xl md:text-7xl font-bold uppercase tracking-tighter">
          {CATEGORY_LABELS[category] ?? category.replace('-', ' ')}
        </h1>
        <div className="mt-8 flex gap-6 font-sans text-xs font-bold uppercase tracking-widest">
          <button className="link-underline">Price ↑</button>
          <button className="link-underline">Price ↓</button>
          <button className="link-underline">Newest</button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-black" />
        </div>
      ) : products && products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 bg-black gap-px border-b border-black">
          {products.map((product) => (
            <div key={product.id} className="bg-white h-full">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-32 px-6 text-center border-b border-black">
          <h3 className="font-display text-3xl font-bold uppercase tracking-widest mb-4">Void</h3>
          <p className="font-sans uppercase tracking-widest text-muted-foreground text-sm">
            No products available in this collection yet.
          </p>
        </div>
      )}
    </div>
  );
}
