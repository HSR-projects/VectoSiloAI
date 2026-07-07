function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK."));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(
  order: Record<string, any>,
  callbackUrl: string
): Promise<void> {
  await loadRazorpayScript();
  const options = {
    key: order.key,
    amount: order.amount,
    currency: order.currency,
    name: order.name,
    description: order.description,
    order_id: order.id,
    prefill: order.prefill,
    handler: () => {
      window.location.href = callbackUrl;
    },
    modal: {
      ondismiss: () => {},
    },
  };
  const rzp = new (window as any).Razorpay(options);
  rzp.open();
}
