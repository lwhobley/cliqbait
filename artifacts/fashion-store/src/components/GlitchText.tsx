import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlitchTextProps {
  text: string;
  active?: boolean;
  dark?: boolean;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function GlitchText({ 
  text, 
  active = false, 
  dark = false,
  className, 
  as: Component = 'div' 
}: GlitchTextProps) {
  return (
    <Component
      data-text={text}
      className={cn(
        className,
        active && 'is-glitching',
        active && dark && 'dark-glitch'
      )}
    >
      {text}
    </Component>
  );
}
