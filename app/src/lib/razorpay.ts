
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
  // Validate Razorpay key
  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
  
  if (!razorpayKey || razorpayKey === 'rzp_live_REPLACE_WITH_YOUR_KEY') {
    console.error('❌ Razorpay key not configured');
    alert('Payment system is not configured. Please contact support.');
    return;
  }

  if (!razorpayKey.startsWith('rzp_live_') && !razorpayKey.startsWith('rzp_test_')) {
    console.error('❌ Invalid Razorpay key format');
    alert('Payment configuration error. Please contact support.');
    return;
  }

  const isLoaded = await loadRazorpay();
  if (!isLoaded) {
    alert('❌ Payment system failed to load. Please check your internet connection.');
    return;
  }

  try {
    const rzp = new (window as any).Razorpay({
      key: razorpayKey,
      name: 'Hackknow',
      description: 'Digital Products Marketplace',
      // image: 'https://hackknow.com/logo.png', // Add your logo URL here
      ...options,
      theme: {
        color: '#FFD700', // HackKnow yellow
      },
      handler: function (response: any) {
        console.log('✅ Payment Successful:', response);
        alert('🎉 Payment Successful!\nPayment ID: ' + response.razorpay_payment_id);
        // TODO: Send payment details to backend to create order
      },
      modal: {
        ondismiss: function () {
          console.log('Checkout form closed');
        },
        escape: false,
        backdropclose: false,
      },
    });

    rzp.on('payment.failed', function (response: any) {
      console.error('❌ Payment failed:', response.error);
      alert('❌ Payment failed: ' + response.error.description);
    });

    rzp.open();
  } catch (error) {
    console.error('❌ Razorpay initialization error:', error);
    alert('❌ Could not initialize payment. Please try again.');
  }
};
