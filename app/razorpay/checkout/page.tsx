"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

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

function CheckoutContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const orderId = searchParams.get("order_id");
    const callback = searchParams.get("callback");
    if (!orderId || !callback) {
      setError("Invalid checkout parameters.");
      return;
    }

    const key = searchParams.get("key");
    const amount = searchParams.get("amount");
    const currency = searchParams.get("currency") || "INR";
    const name = searchParams.get("name") || "VectoSilo AI";
    const description = searchParams.get("description") || "";
    const prefillEmail = searchParams.get("email") || undefined;

    loadRazorpayScript()
      .then(() => {
        const options = {
          key: key || "",
          amount: parseInt(amount || "0"),
          currency,
          name,
          description,
          order_id: orderId,
          prefill: prefillEmail ? { email: prefillEmail, contact: "" } : undefined,
          modal: {
            ondismiss: () => {
              window.location.href = callback;
            },
          },
          handler: () => {
            window.location.href = callback;
          },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      })
      .catch((e) => setError(e.message));
  }, [searchParams]);

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>{error}</p>
        <a href="/">Go home</a>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <p>Opening payment window...</p>
    </div>
  );
}

export default function RazorpayCheckoutPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
