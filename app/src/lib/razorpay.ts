import { toast } from 'sonner';
import type { RazorpayOptions, RazorpayResponse, RazorpayError } from '@/types/razorpay';

type Callbacks = {
  onSuccess?: (resp: RazorpayResponse) => void;
  onFailure?: (message: string) => void;
  onDismiss?: () => void;
};

export const loadRazorpay = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const initializeRazorpayPayment = async (
  options: Partial<RazorpayOptions> & { callbacks?: Callbacks }
) => {
  const { callbacks, ...rzpOptions } = options;
  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

  if (!razorpayKey || razorpayKey.includes('REPLACE_WITH_YOUR_KEY')) {
    toast.error('Payment system is not configured. Please contact support.');
    callbacks?.onFailure?.('Razorpay key not configured');
    return;
  }
  if (!razorpayKey.startsWith('rzp_live_') && !razorpayKey.startsWith('rzp_test_')) {
    toast.error('Payment configuration error. Please contact support.');
    callbacks?.onFailure?.('Invalid Razorpay key format');
    return;
  }

  const isLoaded = await loadRazorpay();
  if (!isLoaded) {
    toast.error('Payment system failed to load. Check your internet.');
    callbacks?.onFailure?.('Failed to load Razorpay script');
    return;
  }

  try {
    const rzp = new window.Razorpay({
      key: razorpayKey,
      name: 'Hackknow',
      description: 'Digital Products Marketplace',
      ...rzpOptions,
      theme: { color: '#FFD700' },
      handler: function (response: RazorpayResponse) {
        callbacks?.onSuccess?.(response);
      },
      modal: {
        ondismiss: function () { callbacks?.onDismiss?.(); },
        escape: false,
        backdropclose: false,
      },
    });

    rzp.on('payment.failed', function (response: RazorpayError) {
      const msg = response?.error?.description || 'Payment failed';
      toast.error('Payment failed: ' + msg);
      callbacks?.onFailure?.(msg);
    });

    rzp.open();
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    toast.error('Could not initialize payment. Please try again.');
    callbacks?.onFailure?.(msg);
  }
};
