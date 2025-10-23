# South African Payment Gateways Integration Guide

Complete guide for integrating **PayFast**, **Paystack**, and **Ozow** payment gateways into your ZABS Online Medusa store.

---

## 🇿🇦 Overview

Medusa doesn't have official plugins for South African payment gateways yet. This guide provides:

1. **PayFast** - Most popular in SA, supports EFT, credit cards
2. **Paystack** - Growing in Africa, supports cards, bank transfers
3. **Ozow** - Instant EFT specialist

---

## 📦 Installation & Setup

### Option 1: Use Third-Party Community Plugins (Recommended for Quick Setup)

While official plugins don't exist yet, you can:

1. **Search npm registry**:

   ```bash
   npm search medusa-payment-payfast
   npm search medusa-payment-paystack
   npm search medusa-payment-ozow
   ```

2. **Or use generic HTTP payment module** and integrate APIs directly

### Option 2: Custom Payment Provider (Full Control)

I've created a custom PayFast provider template at:

```
backend/src/modules/payment-payfast/service.ts
```

This needs to be completed based on your specific Medusa version's payment provider interface.

---

## 🔐 Payment Gateway Credentials

### PayFast Setup

1. **Create Account**:

   - Sandbox: https://sandbox.payfast.co.za
   - Production: https://www.payfast.co.za

2. **Get Credentials**:

   - Login to PayFast dashboard
   - Go to **Settings** → **Integration**
   - Copy:
     - `Merchant ID`
     - `Merchant Key`
     - `Passphrase` (create one if not set)

3. **Add to `.env`**:
   ```bash
   # PayFast Configuration
   PAYFAST_MERCHANT_ID=your_merchant_id
   PAYFAST_MERCHANT_KEY=your_merchant_key
   PAYFAST_PASSPHRASE=your_passphrase
   PAYFAST_SANDBOX=true # Set to false for production
   ```

### Paystack Setup

1. **Create Account**:

   - https://dashboard.paystack.com/signup

2. **Get API Keys**:

   - Dashboard → Settings → API Keys & Webhooks
   - Copy:
     - `Public Key`
     - `Secret Key`

3. **Add to `.env`**:
   ```bash
   # Paystack Configuration
   PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
   PAYSTACK_SECRET_KEY=sk_test_xxxxx
   PAYSTACK_WEBHOOK_SECRET=your_webhook_secret
   ```

### Ozow Setup

1. **Create Account**:

   - Contact Ozow sales: https://ozow.com
   - Complete onboarding process

2. **Get Credentials**:

   - Site Code
   - Private Key
   - API Key

3. **Add to `.env`**:
   ```bash
   # Ozow Configuration
   OZOW_SITE_CODE=your_site_code
   OZOW_PRIVATE_KEY=your_private_key
   OZOW_API_KEY=your_api_key
   OZOW_IS_TEST=true # Set to false for production
   ```

---

## 🏗️ Implementation Approaches

### Approach 1: Direct API Integration (Frontend Handles Payment)

**Best for**: Quick implementation, flexibility

**Flow**:

1. Customer checks out on your frontend
2. Frontend calls payment gateway API directly
3. Payment gateway redirects back to your site
4. Frontend notifies backend of successful payment
5. Backend creates order

**Example - PayFast Frontend Integration**:

```typescript
// storefront/src/lib/payment/payfast.ts

interface PayFastPaymentData {
  merchant_id: string;
  merchant_key: string;
  amount: string;
  item_name: string;
  email_address: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
}

export async function initiatePayFastPayment(
  orderId: string,
  amount: number,
  customerEmail: string
) {
  const paymentData: PayFastPaymentData = {
    merchant_id: process.env.NEXT_PUBLIC_PAYFAST_MERCHANT_ID!,
    merchant_key: process.env.NEXT_PUBLIC_PAYFAST_MERCHANT_KEY!,
    amount: (amount / 100).toFixed(2), // Convert cents to ZAR
    item_name: `Order #${orderId}`,
    email_address: customerEmail,
    return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success?order_id=${orderId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/cancel`,
    notify_url: `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/webhooks/payfast`,
  };

  // Generate signature
  const signature = generatePayFastSignature(paymentData);

  // Redirect to PayFast
  const form = document.createElement("form");
  form.method = "POST";
  form.action =
    process.env.NEXT_PUBLIC_PAYFAST_SANDBOX === "true"
      ? "https://sandbox.payfast.co.za/eng/process"
      : "https://www.payfast.co.za/eng/process";

  // Add fields
  Object.entries({ ...paymentData, signature }).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

function generatePayFastSignature(data: Record<string, string>): string {
  const crypto = require("crypto");
  let paramString = "";

  for (const key in data) {
    paramString += `${key}=${encodeURIComponent(data[key])}&`;
  }

  paramString = paramString.slice(0, -1);

  // Add passphrase if set
  if (process.env.NEXT_PUBLIC_PAYFAST_PASSPHRASE) {
    paramString += `&passphrase=${encodeURIComponent(
      process.env.NEXT_PUBLIC_PAYFAST_PASSPHRASE
    )}`;
  }

  return crypto.createHash("md5").update(paramString).digest("hex");
}
```

**Frontend Payment Component**:

```tsx
// storefront/src/components/checkout/PaymentMethod.tsx

"use client";

import { useState } from "react";
import { initiatePayFastPayment } from "@/lib/payment/payfast";

export default function PaymentMethod({ cart, onPaymentComplete }: any) {
  const [selectedMethod, setSelectedMethod] = useState("payfast");

  const handlePayFastPayment = async () => {
    await initiatePayFastPayment(cart.id, cart.total, cart.email);
  };

  const handlePaystackPayment = async () => {
    // Similar implementation for Paystack
  };

  const handleOzowPayment = async () => {
    // Similar implementation for Ozow
  };

  return (
    <div className="payment-methods">
      <h3>Select Payment Method</h3>

      {/* PayFast */}
      <div className="payment-option">
        <input
          type="radio"
          id="payfast"
          name="payment"
          value="payfast"
          checked={selectedMethod === "payfast"}
          onChange={() => setSelectedMethod("payfast")}
        />
        <label htmlFor="payfast">
          <img src="/payfast-logo.png" alt="PayFast" />
          PayFast (Credit Card, EFT)
        </label>
      </div>

      {/* Paystack */}
      <div className="payment-option">
        <input
          type="radio"
          id="paystack"
          name="payment"
          value="paystack"
          checked={selectedMethod === "paystack"}
          onChange={() => setSelectedMethod("paystack")}
        />
        <label htmlFor="paystack">
          <img src="/paystack-logo.png" alt="Paystack" />
          Paystack (Card, Bank Transfer)
        </label>
      </div>

      {/* Ozow */}
      <div className="payment-option">
        <input
          type="radio"
          id="ozow"
          name="payment"
          value="ozow"
          checked={selectedMethod === "ozow"}
          onChange={() => setSelectedMethod("ozow")}
        />
        <label htmlFor="ozow">
          <img src="/ozow-logo.png" alt="Ozow" />
          Ozow (Instant EFT)
        </label>
      </div>

      <button
        onClick={() => {
          if (selectedMethod === "payfast") handlePayFastPayment();
          if (selectedMethod === "paystack") handlePaystackPayment();
          if (selectedMethod === "ozow") handleOzowPayment();
        }}
        className="pay-now-button"
      >
        Pay Now
      </button>
    </div>
  );
}
```

### Approach 2: Backend Payment Provider Module (Full Integration)

**Best for**: Seamless integration with Medusa admin, better security

**Requirements**:

1. Create payment provider service
2. Register in `medusa-config.js`
3. Handle webhooks
4. Update admin dashboard

Due to Medusa v2's evolving payment provider interface, I recommend:

1. **Wait for official plugins** (check Medusa plugin marketplace)
2. **Use Approach 1** (frontend integration) for now
3. **Migrate to official plugins** when available

---

## 🔗 Webhook Setup

### PayFast Webhook (ITN - Instant Transaction Notification)

1. **Create Webhook Endpoint**:

```typescript
// backend/src/api/webhooks/payfast/route.ts

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import crypto from "crypto";

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const data = req.body;

  // Verify signature
  const isValid = verifyPayFastSignature(data);

  if (!isValid) {
    res.status(400).json({ message: "Invalid signature" });
    return;
  }

  // Process payment
  const paymentStatus = data.payment_status;
  const orderId = data.m_payment_id;

  if (paymentStatus === "COMPLETE") {
    // Update order status
    const orderService = req.scope.resolve("orderService");
    await orderService.capturePayment(orderId);
  }

  res.status(200).json({ message: "Webhook received" });
}

function verifyPayFastSignature(data: Record<string, any>): boolean {
  const receivedSignature = data.signature;
  delete data.signature;

  let paramString = "";
  for (const key in data) {
    paramString += `${key}=${encodeURIComponent(data[key])}&`;
  }
  paramString = paramString.slice(0, -1);

  if (process.env.PAYFAST_PASSPHRASE) {
    paramString += `&passphrase=${encodeURIComponent(
      process.env.PAYFAST_PASSPHRASE
    )}`;
  }

  const calculatedSignature = crypto
    .createHash("md5")
    .update(paramString)
    .digest("hex");

  return receivedSignature === calculatedSignature;
}
```

2. **Configure in PayFast Dashboard**:
   - Go to PayFast Dashboard → Integration
   - Set **Notify URL**: `https://your-backend.railway.app/webhooks/payfast`

### Paystack Webhook

```typescript
// backend/src/api/webhooks/paystack/route.ts

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import crypto from "crypto";

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    res.status(400).json({ message: "Invalid signature" });
    return;
  }

  const event = req.body;

  if (event.event === "charge.success") {
    const orderId = event.data.metadata.order_id;
    const orderService = req.scope.resolve("orderService");
    await orderService.capturePayment(orderId);
  }

  res.status(200).json({ message: "Webhook received" });
}
```

### Ozow Webhook

```typescript
// backend/src/api/webhooks/ozow/route.ts

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import crypto from "crypto";

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { TransactionId, Status, Amount, SiteCode, Hash } = req.body;

  // Verify hash
  const calculatedHash = crypto
    .createHash("sha512")
    .update(
      `${SiteCode}${TransactionId}${Status}${Amount}${process.env.OZOW_PRIVATE_KEY}`
    )
    .digest("hex");

  if (calculatedHash.toLowerCase() !== Hash.toLowerCase()) {
    res.status(400).json({ message: "Invalid hash" });
    return;
  }

  if (Status === "Complete") {
    const orderService = req.scope.resolve("orderService");
    await orderService.capturePayment(TransactionId);
  }

  res.status(200).json({ message: "Webhook received" });
}
```

---

## ⚙️ Backend Configuration

Add payment providers to your environment:

```bash
# backend/.env

# PayFast
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a
PAYFAST_PASSPHRASE=your_passphrase_here
PAYFAST_SANDBOX=true

# Paystack
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Ozow
OZOW_SITE_CODE=YOUR-SITE-CODE
OZOW_PRIVATE_KEY=your_private_key_here
OZOW_API_KEY=your_api_key_here
OZOW_IS_TEST=true
```

---

## 🎨 Admin Dashboard Integration

### Enable Payment Methods in Admin

1. **Login to Medusa Admin**: `https://your-backend.railway.app/app`

2. **Go to Settings** → **Regions**

3. **Select South Africa Region**

4. **Payment Providers**:

   - If using custom providers, they'll appear here
   - Select which ones to enable

5. **Save**

### Manual Payment Option (Interim Solution)

Until full integration is complete:

1. Use **"Manual Payment"** option in admin
2. Customer selects payment gateway on frontend
3. Payment is processed outside Medusa
4. Admin manually marks order as paid

---

## 🧪 Testing

### PayFast Sandbox Testing

**Test Cards**:

- Card Number: `4000 0000 0000 0002`
- CVV: Any 3 digits
- Expiry: Any future date

**Test Bank Account**:

- Use sandbox credentials
- Follow on-screen prompts

### Paystack Test Mode

**Test Cards**:

- Success: `4084 0840 8408 4081`
- Decline: `5060 9999 9999 9991`

### Ozow Test Environment

Contact Ozow for test credentials and test bank accounts.

---

## 📚 Resources

### PayFast

- **Documentation**: https://developers.payfast.co.za
- **API Reference**: https://developers.payfast.co.za/api
- **Support**: support@payfast.co.za

### Paystack

- **Documentation**: https://paystack.com/docs
- **API Reference**: https://paystack.com/docs/api
- **Support**: https://paystack.com/contact

### Ozow

- **Documentation**: https://docs.ozow.com
- **Support**: support@ozow.com

### Medusa

- **Payment Providers Guide**: https://docs.medusajs.com/resources/commerce-modules/payment
- **Custom Providers**: https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider

---

## ✅ Implementation Checklist

- [ ] Choose integration approach (frontend vs backend)
- [ ] Sign up for payment gateway accounts
- [ ] Get sandbox/test credentials
- [ ] Add credentials to `.env` files
- [ ] Implement payment flow on frontend
- [ ] Create webhook endpoints
- [ ] Test with sandbox credentials
- [ ] Configure webhook URLs in gateway dashboards
- [ ] Test complete checkout flow
- [ ] Switch to production credentials
- [ ] Test with real (small) transactions
- [ ] Monitor webhook logs
- [ ] Set up error notifications

---

## 🚨 Important Notes

1. **PCI Compliance**: If handling card details, ensure PCI compliance
2. **HTTPS Required**: All payment URLs must use HTTPS
3. **Webhook Security**: Always verify webhook signatures
4. **Currency**: PayFast requires ZAR, others support multiple currencies
5. **Fees**: Each gateway has different transaction fees
6. **Settlement**: Payment settlement times vary (instant to 2-3 days)

---

## 💡 Recommended Approach

**For Production Launch**:

1. ✅ **Use frontend integration** (Approach 1) for quick launch
2. ✅ **Start with PayFast** (most popular in SA)
3. ✅ **Add Paystack** for card payments
4. ✅ **Add Ozow** for instant EFT
5. ✅ **Migrate to official plugins** when available

This gets you to market fastest while maintaining flexibility!

---

## 🆘 Need Help?

If you need custom development for payment integration:

1. Consider hiring a Medusa expert
2. Post in Medusa Discord community
3. Check Medusa Partners directory

---

**Status**: Basic structure created. Full implementation requires additional development based on your specific Medusa version and requirements.
