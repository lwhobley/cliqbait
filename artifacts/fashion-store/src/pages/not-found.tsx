import { Link } from "wouter";
import { GlitchText } from "@/components/GlitchText";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <GlitchText 
        text="404" 
        active={true}
        className="font-display text-[20vw] leading-none font-bold uppercase tracking-tighter"
      />
      <h2 className="font-display text-2xl font-bold uppercase tracking-widest mt-8 mb-8">
        Page Not Found
      </h2>
      <Link 
        href="/" 
        className="font-sans uppercase tracking-[0.2em] text-sm border border-black px-8 py-4 font-bold hover:bg-black hover:text-white transition-colors"
      >
        Return to Surface
      </Link>
    </div>
  );
}
