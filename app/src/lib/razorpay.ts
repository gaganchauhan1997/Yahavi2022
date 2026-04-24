
export const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const initializeRazorpayPayment = async (options: any) => {
  const isLoaded = await loadRazorpay();
  if (!isLoaded) {
    alert('Razorpay SDK failed to load. Are you online?');
    return;
  }

  const rzp = new (window as any).Razorpay({
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    ...options,
    handler: function (response: any) {
      console.log('Payment Successful:', response);
      alert('Payment Successful! Payment ID: ' + response.razorpay_payment_id);
    },
    modal: {
      ondismiss: function () {
        console.log('Checkout form closed');
      },
    },
  });

  rzp.open();
};
