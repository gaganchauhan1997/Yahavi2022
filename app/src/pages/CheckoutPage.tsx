import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, ChevronLeft, Download, Lock } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";
import {
  createServerOrder,
  verifyServerPayment,
  type VerifyPaymentResult,
} from "@/lib/checkout-api";
import { initializeRazorpayPayment } from "@/lib/razorpay";
import { toast } from "sonner";

export default function CheckoutPage() {
  const { state, cartTotal, dispatch } = useStore();
  const navigate = useNavigate();
  const [isComplete, setIsComplete] = useState(false);
  const [completionResult, setCompletionResult] =
    useState<VerifyPaymentResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
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
    const downloads = completionResult?.downloads ?? [];
    const orderNumber =
      completionResult?.order_number ?? completionResult?.wc_order_id ?? "";
    const buyerEmail = completionResult?.email ?? formData.email;
    return (
      <div className="pt-32 pb-20">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="font-display font-bold text-3xl mb-2">
              Payment Successful!
            </h1>
            {orderNumber && (
              <p className="text-hack-black/60 mb-2">
                Order <span className="font-mono">#{orderNumber}</span>
              </p>
            )}
            <p className="text-hack-black/60 mb-8">
              {downloads.length > 0
                ? "Your files are ready below. We've also emailed them to "
                : "We've emailed your download link to "}
              <strong className="text-hack-black">{buyerEmail}</strong>.
            </p>

            {downloads.length > 0 && (
              <div className="text-left bg-white border-2 border-hack-black/10 rounded-2xl p-5 mb-8">
                <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Your Downloads
                </h2>
                <ul className="space-y-3">
                  {downloads.map((d, idx) => (
                    <li
                      key={`${d.product_id}-${idx}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-hack-black/10 hover:border-hack-black/30 transition"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{d.product_name}</p>
                        <p className="text-xs text-hack-black/50 truncate">
                          {d.download_name}
                        </p>
                      </div>
                      <a
                        href={d.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="shrink-0 inline-flex items-center gap-2 bg-hack-black text-hack-white px-4 py-2 rounded-full text-sm font-bold hover:bg-hack-black/85 transition"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-hack-black/50 mt-4">
                  These links are personal to your order. You can also
                  re-download anytime from the{" "}
                  <Link
                    to="/account/downloads"
                    className="underline font-medium"
                  >
                    Downloads page
                  </Link>{" "}
                  using the email above.
                </p>
              </div>
            )}

            {downloads.length === 0 && (
              <div className="text-left bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-5 mb-8">
                <p className="text-sm">
                  Your file is being prepared. If it doesn&apos;t arrive in your
                  inbox within a minute, please open the{" "}
                  <Link
                    to="/account/downloads"
                    className="underline font-medium"
                  >
                    Downloads page
                  </Link>{" "}
                  and enter <strong>{buyerEmail}</strong> to access it
                  immediately.
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <Link to="/account/downloads">
                <Button className="bg-hack-yellow text-hack-black border-2 border-hack-black hover:bg-hack-yellow/90 rounded-full px-6 h-12">
                  My Downloads
                </Button>
              </Link>
              <Link to="/shop">
                <Button className="bg-hack-black text-hack-white hover:bg-hack-black/80 rounded-full px-6 h-12">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const order = await createServerOrder({
        items: state.cart.map((i) => ({
          product_id: Number(i.product.id),
          quantity: i.quantity,
        })),
        email: formData.email,
        phone: formData.phone,
        first_name: formData.firstName,
        last_name: formData.lastName,
      });

      initializeRazorpayPayment({
        key: order.key_id,
        order_id: order.razorpay_order,
        amount: order.amount,
        currency: order.currency,
        name: "HackKnow",
        description: `Order #${order.wc_order_id}`,
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          contact: formData.phone,
        },
        callbacks: {
          onSuccess: async (resp) => {
            const razorpayPaymentId = resp.razorpay_payment_id;
            try {
              const verifyResult = await verifyServerPayment({
                razorpay_order_id: resp.razorpay_order_id ?? order.razorpay_order,
                razorpay_payment_id: razorpayPaymentId,
                razorpay_signature: resp.razorpay_signature ?? "",
                wc_order_id: order.wc_order_id,
              });
              dispatch({ type: "CLEAR_CART" });
              setCompletionResult(verifyResult);
              setIsComplete(true);
            } catch {
              /**
               * Payment was captured by Razorpay but our server-sync failed.
               * CRITICAL: clear the cart immediately so the user cannot
               * accidentally attempt a second payment, then redirect to the
               * /order-pending page with the Razorpay payment ID so the
               * support team can manually confirm.
               */
              dispatch({ type: "CLEAR_CART" });
              toast.error(
                "Payment received! Our server sync had an issue — redirecting you to your order status.",
                { duration: 4000 }
              );
              setTimeout(() => {
                navigate(`/order-pending?payment_id=${razorpayPaymentId}`);
              }, 2000);
            } finally {
              setIsProcessing(false);
            }
          },
          onFailure: () => setIsProcessing(false),
          onDismiss: () => setIsProcessing(false),
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start checkout");
      setIsProcessing(false);
    }
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
                disabled={isProcessing}
                className="w-full h-14 bg-hack-black text-hack-white hover:bg-hack-black/80 rounded-full font-bold text-base gap-2 disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                {isProcessing ? 'Processing…' : `Pay with Razorpay — ₹${cartTotal.toFixed(2)}`}
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
                        {item.product.image?.sourceUrl && (
                          <img
                            src={item.product.image.sourceUrl}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
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
