import { useState } from 'react';
import { useRoute } from 'wouter';
import { useGetProduct } from '@workspace/api-client-react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

export function ProductDetail() {
  const [, params] = useRoute('/product/:id');
  const productId = parseInt(params?.id || '0', 10);
  
  const { data: product, isLoading, error } = useGetProduct(productId);
  const cart = useCart();
  const { toast } = useToast();

  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white pt-32 px-6 text-center">
        <h1 className="font-display text-4xl font-bold uppercase">Product Not Found</h1>
      </div>
    );
  }

  const images = [product.imageUrl, ...(product.additionalImages || [])];
  const currentImage = activeImage || images[0];
  
  const variants = product.variants || [];
  const selectedVariant = variants.find(v => v.id === selectedVariantId) || variants[0];
  const price = selectedVariant?.price || product.basePrice;

  // Group variants by size to create size selector
  const sizes = Array.from(new Set(variants.map(v => v.size).filter(Boolean))) as string[];

  const handleAddToBag = () => {
    if (!selectedVariant) {
      toast({ title: "Please select an option", variant: "destructive" });
      return;
    }

    setIsAdding(true);
    
    // Simulate slight network delay for premium feel
    setTimeout(() => {
      cart.addItem({
        productId: product.id,
        variantId: selectedVariant.id,
        name: product.name,
        size: selectedVariant.size,
        color: selectedVariant.color,
        price: selectedVariant.price,
        quantity,
        imageUrl: product.imageUrl
      });
      
      setIsAdding(false);
      toast({
        title: "Added to bag",
        description: `${quantity}x ${product.name}`,
        className: "bg-black text-white border-none rounded-none rounded-sm uppercase tracking-widest font-sans text-xs",
      });
    }, 400);
  };

  return (
    <div className="min-h-screen bg-white pt-20 flex flex-col md:flex-row">
      {/* Left: Sticky Image Gallery */}
      <div className="w-full md:w-[60vw] md:h-[calc(100vh-80px)] md:sticky top-20 bg-[#f5f5f5] flex flex-col border-r border-black">
        <div className="flex-1 overflow-hidden relative">
          <motion.img 
            key={currentImage}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            src={currentImage} 
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
        
        {images.length > 1 && (
          <div className="h-32 border-t border-black flex overflow-x-auto no-scrollbar bg-white">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(img)}
                className={`flex-none w-24 h-full border-r border-black last:border-r-0 transition-opacity ${currentImage === img ? 'opacity-100' : 'opacity-40 hover:opacity-80'}`}
              >
                <img src={img} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Scrollable Product Info */}
      <div className="w-full md:w-[40vw] p-8 md:p-16 flex flex-col justify-center min-h-[calc(100vh-80px)]">
        <span className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">
          Cliqbait
        </span>
        <h1 className="font-display text-4xl md:text-5xl font-bold uppercase tracking-tight mb-4">
          {product.name}
        </h1>
        <p className="font-sans text-xl mb-12">${price}</p>

        {sizes.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <span className="font-sans text-sm font-bold uppercase tracking-widest">Size</span>
              <button className="font-sans text-xs uppercase text-muted-foreground underline decoration-1 underline-offset-4">Size Guide</button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {sizes.map((size) => {
                // Find first variant with this size
                const v = variants.find(v => v.size === size);
                const isSelected = selectedVariant?.size === size;
                
                return (
                  <button
                    key={size}
                    onClick={() => v && setSelectedVariantId(v.id)}
                    className={`
                      py-4 border text-sm font-sans font-bold uppercase tracking-widest transition-colors
                      ${isSelected ? 'border-black bg-black text-white' : 'border-black/20 text-black hover:border-black'}
                    `}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-4 mb-12">
          <div className="flex border border-black h-16 w-32 items-center justify-between px-4">
            <button 
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="text-black hover:opacity-50 transition-opacity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-sans font-bold">{quantity}</span>
            <button 
              onClick={() => setQuantity(quantity + 1)}
              className="text-black hover:opacity-50 transition-opacity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <motion.button
            whileTap={{ scaleY: 0.95 }}
            onClick={handleAddToBag}
            className="flex-1 bg-black text-white font-sans font-bold uppercase tracking-[0.2em] flex items-center justify-center hover:bg-black/90 transition-colors"
          >
            {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : "Add to Bag"}
          </motion.button>
        </div>

        <div className="prose prose-sm prose-neutral border-t border-black pt-8">
          <h3 className="font-sans font-bold uppercase tracking-widest text-sm mb-4">Details</h3>
          <p className="font-sans text-muted-foreground leading-relaxed">
            {product.description || "A staple redefined. Cut from heavy-weight premium cotton, featuring a stark structural silhouette that drapes effortlessly. Designed in Paris."}
          </p>
          <ul className="mt-4 space-y-2 font-sans text-muted-foreground text-sm list-none p-0">
            <li>— 100% Heavyweight Cotton</li>
            <li>— Oversized brutalist fit</li>
            <li>— Machine wash cold</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
