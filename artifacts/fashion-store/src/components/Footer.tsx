import { Link } from 'wouter';

export function Footer() {
  return (
    <footer className="bg-black text-white border-t border-white/20 pt-24 pb-12 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-24">
        <div className="md:col-span-2">
          <h2 className="font-display text-4xl font-bold uppercase tracking-widest mb-6">Cliqbait</h2>
          <p className="font-sans text-white/60 max-w-sm leading-relaxed text-sm">
            Avant-garde basics. Brutalist luxury. Redefining modern silhouettes through a stark monochromatic lens.
          </p>
        </div>
        
        <div>
          <h3 className="font-sans font-bold uppercase tracking-widest text-sm mb-6">Shop</h3>
          <ul className="space-y-4 font-sans text-white/60 text-sm">
            <li><Link href="/shop/new-arrivals" className="hover:text-white transition-colors">New Arrivals</Link></li>
            <li><Link href="/shop/clothing" className="hover:text-white transition-colors">Clothing</Link></li>
            <li><Link href="/shop/accessories" className="hover:text-white transition-colors">Accessories</Link></li>
            <li><Link href="/shop/objects" className="hover:text-white transition-colors">Objects</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-sans font-bold uppercase tracking-widest text-sm mb-6">Support</h3>
          <ul className="space-y-4 font-sans text-white/60 text-sm">
            <li><a href="#" className="hover:text-white transition-colors">Shipping & Returns</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Terms Conditions</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto border-t border-white/20 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-white/40 font-sans tracking-widest uppercase">
        <p>&copy; {new Date().getFullYear()} Cliqbait. All rights reserved.</p>
        <div className="flex space-x-6 mt-4 md:mt-0">
          <a href="#" className="hover:text-white transition-colors">Instagram</a>
          <a href="#" className="hover:text-white transition-colors">Twitter</a>
        </div>
      </div>
    </footer>
  );
}
