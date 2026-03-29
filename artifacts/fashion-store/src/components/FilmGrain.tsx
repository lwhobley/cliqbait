import { useEffect, useRef } from 'react';

interface FilmGrainProps {
  opacity?: number;
}

export function FilmGrain({ opacity = 0.04 }: FilmGrainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', resize);
    resize();

    const render = () => {
      const imageData = ctx.createImageData(width, height);
      const buffer32 = new Uint32Array(imageData.data.buffer);
      const len = buffer32.length;

      for (let i = 0; i < len; i++) {
        if (Math.random() < 0.5) {
          buffer32[i] = 0xff000000; // Black pixel
        } else {
          buffer32[i] = 0xffffffff; // White pixel
        }
      }

      ctx.putImageData(imageData, 0, 0);
      
      // Control framerate of noise for film effect (approx 12-24fps)
      setTimeout(() => {
        animationFrameId = requestAnimationFrame(render);
      }, 50); 
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999] mix-blend-difference"
      style={{ opacity }}
    />
  );
}
