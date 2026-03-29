import { Link, useLocation } from 'wouter';
import { Search, ShoppingBag } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function Navigation() {
  const [location] = useLocation();
  const cart = useCart();
  const [isScrolled, setIsScrolled] = useState(false);
  
  const isDarkArea = location === '/' && !isScrolled;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > window.innerHeight - 100);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 w-full z-50 transition-colors duration-500",
        isDarkArea 
          ? "bg-transparent text-white" 
          : "bg-white text-black border-b border-black"
      )}
    >
      <div className="flex items-center justify-between px-6 h-20">
        <div className="flex-1">
          <Link 
            href="/" 
            className="font-display font-bold text-2xl uppercase tracking-widest"
          >
            Cliqbait
          </Link>
        </div>

        <nav className="hidden md:flex flex-1 justify-center space-x-8">
          {[
            { label: 'SHOP', path: '/shop/tshirts' },
            { label: 'T-SHIRTS', path: '/shop/tshirts' },
            { label: 'NEW ARRIVALS', path: '/shop/tshirts' },
            { label: 'ABOUT', path: '/' },
          ].map((item) => (
            <Link 
              key={item.label} 
              href={item.path}
              className="text-xs font-semibold tracking-[0.2em] link-underline"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1 flex justify-end space-x-6 items-center">
          <button className="hover:opacity-60 transition-opacity">
            <Search className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <button 
            className="relative hover:opacity-60 transition-opacity flex items-center"
            onClick={() => cart.setIsOpen(true)}
          >
            <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
            {cart.itemCount() > 0 && (
              <span className={cn(
                "absolute -top-2 -right-2 w-4 h-4 text-[10px] flex items-center justify-center font-bold",
                isDarkArea ? "bg-white text-black" : "bg-black text-white"
              )}>
                {cart.itemCount()}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
