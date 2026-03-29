import { Link } from 'wouter';
import type { Product } from '@workspace/api-client-react';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/product/${product.id}`}>
      <div className="group relative cursor-crosshair overflow-hidden block">
        <div className="aspect-[3/4] bg-[#f5f5f5] relative">
          <img 
            src={product.imageUrl} 
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {product.additionalImages?.[0] && (
            <img 
              src={product.additionalImages[0]} 
              alt={`${product.name} alternate view`}
              className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-700 ease-in-out group-hover:opacity-100"
            />
          )}
        </div>
        
        <div className="absolute bottom-0 left-0 w-full p-6 bg-white transform translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:translate-y-0">
          <div className="flex justify-between items-center text-black">
            <h3 className="font-display font-bold uppercase tracking-wide text-lg">{product.name}</h3>
            <span className="font-sans text-sm">${product.basePrice}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
