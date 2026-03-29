import { useRoute, Link } from 'wouter';
import { useGetOrderBySession } from '@workspace/api-client-react';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';

export function OrderConfirmation() {
  const [, params] = useRoute('/order-confirmation');
  
  // Extract session_id from URL query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get('session_id') || '';

  const { data: order, isLoading, error } = useGetOrderBySession(sessionId);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-white pt-32 px-6 flex flex-col items-center justify-center text-center">
        <h1 className="font-display text-4xl font-bold uppercase mb-4">Invalid Session</h1>
        <Link href="/" className="font-sans uppercase tracking-widest text-sm link-underline font-bold">Return Home</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-black mb-4" />
        <p className="font-sans uppercase tracking-widest text-sm font-bold animate-pulse">Confirming Order...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-white pt-32 px-6 flex flex-col items-center justify-center text-center">
        <h1 className="font-display text-4xl font-bold uppercase mb-4 text-red-600">Verification Failed</h1>
        <p className="font-sans text-muted-foreground mb-8 max-w-md">
          We couldn't verify this order session. If your payment went through, please contact support.
        </p>
        <Link href="/" className="font-sans uppercase tracking-widest text-sm border border-black px-8 py-4 font-bold hover:bg-black hover:text-white transition-colors">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-32 pb-24 px-6 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full">
        <div className="flex flex-col items-center text-center mb-16">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            className="w-24 h-24 bg-black rounded-full flex items-center justify-center text-white mb-8"
          >
            <Check className="w-12 h-12" strokeWidth={3} />
          </motion.div>
          
          <h1 className="font-display text-5xl md:text-6xl font-bold uppercase tracking-tighter mb-4">
            Order Confirmed
          </h1>
          <p className="font-sans text-muted-foreground">
            Thank you. Your order #{order.id} has been received.
          </p>
        </div>

        <div className="border border-black p-8 md:p-12">
          <h2 className="font-sans font-bold uppercase tracking-widest text-sm border-b border-black pb-4 mb-6">
            Order Summary
          </h2>
          
          <div className="space-y-6 mb-8">
            {order.lineItems?.map((item, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="w-16 h-20 bg-gray-100 flex-shrink-0">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex justify-between">
                  <div>
                    <h3 className="font-display font-bold uppercase text-sm">{item.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 font-sans">
                      QTY: {item.quantity} 
                      {item.size && ` / SIZE: ${item.size}`}
                    </p>
                  </div>
                  <span className="font-sans text-sm">${item.price}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-black pt-6 flex justify-between items-center">
            <span className="font-sans uppercase tracking-widest text-sm font-bold">Total Status</span>
            <span className="font-sans uppercase tracking-widest text-sm bg-black text-white px-3 py-1">
              {order.status}
            </span>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link 
            href="/shop/all" 
            className="inline-block bg-black text-white font-sans font-bold uppercase tracking-[0.2em] px-12 py-5 hover:bg-black/90 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
