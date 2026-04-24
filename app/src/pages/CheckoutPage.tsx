import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronLeft, Lock } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";

export default function CheckoutPage() {
  const { state, cartTotal, dispatch, checkout } = useStore();
  const [isComplete, setIsComplete] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
  });

  if (state.cart.length === 0 && !isComplete) {
    return (
      <div className="pt-32 pb-20 text-center">
        <h1 className="font-display font-bold text-2xl mb-4">
          Your cart is empty
        </h1>
        <Link to="/shop">
          <Button className="bg-hack-black text-hack-white rounded-full px-8">
            Start Shopping
          </Button>
        </Link>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="pt-32 pb-20">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="font-display font-bold text-3xl mb-3">
              Order Confirmed!
            </h1>
            <p className="text-hack-black/60 mb-8">
              Thank you for your purchase. Your order has been confirmed and
              you&apos;ll receive a download link via email shortly.
            </p>
            <Link to="/shop">
              <Button className="bg-hack-black text-hack-white hover:bg-hack-black/80 rounded-full px-8 h-12">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkout(cartTotal);
  };

  const handlePaymentSuccess = () => {
    dispatch({ type: "CLEAR_CART" });
    setIsComplete(true);
  };

  return (
    <div className="pt-28 pb-20">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <Link
            to="/cart"
            className="inline-flex items-center gap-1 text-sm text-hack-black/60 hover:text-hack-black transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Cart
          </Link>
          <h1 className="font-display font-bold text-3xl mb-8">Checkout</h1>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Form */}
            <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-6">
              {/* Contact */}
              <div className="bg-white rounded-2xl border border-hack-black/5 p-6">
                <h2 className="font-display font-bold text-lg mb-4">
                  Contact Information
                </h2>
                <div className="space-y-4">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-hack-black/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hack-yellow"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-hack-black/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hack-yellow"
                    required
                  />
                </div>
              </div>

              {/* Billing */}
              <div className="bg-white rounded-2xl border border-hack-black/5 p-6">
                <h2 className="font-display font-bold text-lg mb-4">
                  Billing Details
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="px-4 py-3 bg-hack-black/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hack-yellow"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="px-4 py-3 bg-hack-black/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hack-yellow"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-14 bg-hack-black text-hack-white hover:bg-hack-black/80 rounded-full font-bold text-base gap-2"
              >
                <Lock className="w-4 h-4" />
                Pay with Razorpay — ₹{cartTotal.toFixed(2)}
              </Button>
              <p className="text-center text-xs text-hack-black/40">
                Secured by Razorpay · SSL Encrypted
              </p>
            </form>

            {/* Order Summary */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-hack-black/5 p-6 sticky top-28">
                <h2 className="font-display font-bold text-lg mb-4">
                  Order Summary
                </h2>
                <div className="space-y-3 mb-4">
                  {state.cart.map((item) => (
                    <div key={item.product.id} className="flex gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-hack-black/5 flex-shrink-0">
                        <img
                          src={item.product.image?.sourceUrl}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-hack-black/50 font-mono">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        {item.product.price ?? 'Free'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-hack-black/10 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold">Total</span>
                    <span className="font-display font-bold text-xl">
                      ₹{cartTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
