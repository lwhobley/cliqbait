import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Loader2, ShoppingBag } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useCreateCheckoutSession } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';

export function CartDrawer() {
  const cart = useCart();
  const { toast } = useToast();
  const { mutate: createCheckout, isPending } = useCreateCheckoutSession();

  const handleCheckout = () => {
    if (cart.items.length === 0) return;

    const base = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

    createCheckout(
      {
        data: {
          items: cart.items,
          successUrl: `${window.location.origin}${base}/order-confirmation`,
          cancelUrl: `${window.location.origin}${base}/`,
        }
      },
      {
        onSuccess: (data) => {
          if (data.url) {
            window.location.href = data.url;
          }
        },
        onError: () => {
          toast({
            title: "Checkout Error",
            description: "Failed to initialize checkout. Please try again.",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <AnimatePresence>
      {cart.isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => cart.setIsOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l-2 border-black z-[101] flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-black">
              <h2 className="font-display text-2xl font-bold uppercase tracking-widest">
                Your Bag ({cart.itemCount()})
              </h2>
              <button
                onClick={() => cart.setIsOpen(false)}
                className="p-2 hover:bg-black hover:text-white transition-colors"
              >
                <X className="w-6 h-6" strokeWidth={1} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {cart.items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
                  <ShoppingBag className="w-12 h-12 mb-4 opacity-20" strokeWidth={1} />
                  <p className="font-sans uppercase tracking-widest text-sm">Your bag is empty</p>
                </div>
              ) : (
                cart.items.map((item) => (
                  <div key={`${item.productId}-${item.variantId}`} className="flex gap-4">
                    <div className="w-24 h-32 bg-gray-100 flex-shrink-0">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-display font-bold uppercase leading-tight">{item.name}</h3>
                          <button
                            onClick={() => cart.removeItem(item.productId, item.variantId)}
                            className="text-muted-foreground hover:text-black transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 font-sans">
                          {item.color && <span className="uppercase">{item.color}</span>}
                          {item.color && item.size && " / "}
                          {item.size && <span className="uppercase">{item.size}</span>}
                        </p>
                        <p className="font-sans mt-2">${item.price}</p>
                      </div>
                      <div className="flex items-center border border-black w-fit">
                        <button
                          onClick={() => cart.updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                          className="p-2 hover:bg-black hover:text-white transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-sans text-sm">{item.quantity}</span>
                        <button
                          onClick={() => cart.updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                          className="p-2 hover:bg-black hover:text-white transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.items.length > 0 && (
              <div className="p-6 bg-white border-t border-black">
                <div className="flex justify-between items-center mb-6">
                  <span className="font-sans uppercase tracking-widest text-sm">Subtotal</span>
                  <span className="font-display text-xl font-bold">${cart.subtotal().toFixed(2)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={isPending}
                  className="w-full bg-black text-white font-sans uppercase tracking-[0.2em] py-5 font-bold hover:bg-black/80 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Checkout"}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
