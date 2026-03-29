import { ReactNode } from 'react';
import { Navigation } from './Navigation';
import { CartDrawer } from './CartDrawer';
import { Footer } from './Footer';
import { FilmGrain } from './FilmGrain';
import { useLocation } from 'wouter';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const isIntro = location === '/intro';

  if (isIntro) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      <FilmGrain opacity={0.025} />
      <Navigation />
      <CartDrawer />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
