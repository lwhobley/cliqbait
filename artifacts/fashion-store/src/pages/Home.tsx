import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useGetProducts } from '@workspace/api-client-react';
import { ProductCard } from '@/components/ProductCard';
import { motion } from 'framer-motion';


// ARC1 FIX: slug must match the category values stored in the database
// (set by mapCategoryFromName in printfulService.ts).
const COLLECTIONS = [
  { name: 'T-SHIRTS', slug: 'tshirts', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600' },
  { name: 'HOODIES', slug: 'hoodies', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600' },
  { name: 'PANTS', slug: 'pants', image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600' },
  { name: 'ACCESSORIES', slug: 'accessories', image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=600' },
];

export function Home() {
  const [, setLocation] = useLocation();
  const [isReady, setIsReady] = useState(false);
  const { data: products } = useGetProducts();

  useEffect(() => {
    if (!localStorage.getItem('intro-seen')) {
      setLocation('/intro');
    } else {
      setIsReady(true);
    }
  }, [setLocation]);

  if (!isReady) return null;

  const bestSellers = products?.slice(0, 3) || [];

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen w-full bg-black text-white flex items-center justify-center overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <video
            src="/hero.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="relative z-10 font-display text-[12vw] leading-none font-bold uppercase tracking-tighter mix-blend-difference text-white"
        >
          Cliqbait
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2 }}
          className="absolute bottom-12 left-12 font-sans text-xs uppercase tracking-[0.3em] font-bold"
        >
          New Season. Now Available.
        </motion.p>
      </section>

      {/* Best Sellers */}
      <section className="border-t border-black">
        <div className="p-6 border-b border-black">
          <h2 className="font-display text-4xl font-bold uppercase tracking-widest">Best Sellers</h2>
        </div>
        
        {bestSellers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 bg-black border-b border-black">
            {bestSellers.map((product, i) => (
              <div key={product.id} className={`bg-white ${i === 0 ? 'md:col-span-2 lg:col-span-1' : ''} border-r border-black last:border-r-0`}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-24 text-center border-b border-black">
            <p className="font-sans uppercase tracking-widest text-muted-foreground">Curating collection...</p>
          </div>
        )}
      </section>

      {/* Collections Strip */}
      <section className="border-b border-black py-24 bg-[#f5f5f5]">
        <div className="px-6 mb-12 flex justify-between items-end">
          <h2 className="font-display text-4xl font-bold uppercase tracking-widest">Explore</h2>
          <Link href="/shop/all" className="font-sans text-sm uppercase tracking-widest font-bold link-underline">
            View All
          </Link>
        </div>
        
        <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar px-6 gap-6 pb-8">
          {COLLECTIONS.map((collection) => (
            <Link 
              key={collection.name} 
              href={`/shop/${collection.slug}`}
              className="group relative flex-none w-[300px] h-[400px] md:w-[400px] md:h-[500px] snap-center overflow-hidden bg-black cursor-pointer"
            >
              <img 
                src={collection.image} 
                alt={collection.name}
                className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700 grayscale group-hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-500" />
              <div className="absolute inset-0 flex items-center justify-center">
                <h3 className="font-display text-3xl font-bold uppercase tracking-widest text-white">
                  {collection.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Editorial Banner */}
      <section className="bg-black text-white py-32 px-6 flex flex-col items-center justify-center text-center">
        <h2 className="font-display text-5xl md:text-7xl font-bold uppercase tracking-tighter mb-8 max-w-4xl">
          The Anatomy of Modern Luxury
        </h2>
        <Link 
          href="/shop/all" 
          className="bg-white text-black font-sans font-bold uppercase tracking-[0.2em] px-12 py-5 hover:bg-white/90 transition-colors"
        >
          Shop The Look
        </Link>
      </section>
    </div>
  );
}
