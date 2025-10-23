# South African Stores Seed Script

This seed script adds two South African stores to your Medusa backend with demo products and proper channel configuration.

## What This Script Creates

### 🏪 Two Sales Channels

1. **Electronics Store** - For electronic products and gadgets
2. **Health Store** - For health, wellness, and personal care products

### 💰 Currency

- **ZAR (South African Rand)** as the primary currency
- All products are priced in ZAR

### 🌍 Region

- **South Africa** region with country code `ZA`
- Configured with proper tax settings

### 📦 Stock Locations

1. **Electronics Store Warehouse** - Johannesburg, Gauteng
2. **Health Store Warehouse** - Cape Town, Western Cape

### 📂 Electronics Store Categories & Products

- **Smartphones** - Samsung Galaxy S24 Ultra (R21,999 - R29,999)
- **Laptops** - MacBook Pro 16-inch M3 (R44,999 - R69,999)
- **Tablets** - iPad Pro 12.9-inch (R17,999 - R22,999)
- **Audio** - Sony WH-1000XM5 Headphones (R6,999)
- **Gaming** - PlayStation 5 (R9,999 - R11,999)
- **Accessories** - USB-C Hub (R599)

### 🏥 Health Store Categories & Products

- **Vitamins & Supplements** - Multivitamin Complex, Omega-3, Vitamin D3 (R199 - R499)
- **Personal Care** - Hand Sanitizer Gel (R79 - R199)
- **Fitness & Wellness** - Yoga Mat Premium (R399)
- **First Aid** - First Aid Kit Complete (R499)
- **Natural Remedies** - Organic Rooibos Tea (R89 - R99)
- **Baby & Mother** - Baby Diaper Pack (R199 - R239)

### 🚚 Shipping Options

Both stores have:

- **Standard Delivery** - 3-5 business days (Electronics: R99.99, Health: R79.99)
- **Express Delivery** - 1-2 business days (Electronics: R199.99, Health: R149.99)

### 📊 Inventory

- Electronics products: 100 units per variant
- Health products: 500 units per variant

## How to Run the Seed Script

### Option 1: Using Medusa CLI (Recommended)

```bash
# Navigate to the backend directory
cd backend

# Run the seed script
pnpm medusa exec ./src/scripts/seed-za-stores.ts
```

### Option 2: Using npm scripts

Add this to your `package.json` scripts section:

```json
"scripts": {
  "seed:za": "medusa exec ./src/scripts/seed-za-stores.ts"
}
```

Then run:

```bash
pnpm run seed:za
```

## Important Notes

⚠️ **Run After Initial Setup**

- This script should be run AFTER your initial database setup and the original seed script
- It adds to the existing store configuration rather than replacing it

⚠️ **Currency Configuration**

- The script updates your store to support ZAR currency and sets it as the default
- Your existing EUR and USD currencies will still be available

⚠️ **Sales Channels**

- Each store has its own sales channel for proper product segregation
- You'll need to configure your storefront to filter by sales channel

## Sales Channel IDs

After running the script, it will output the sales channel IDs:

- Electronics Store: `{electronicsChannel.id}`
- Health Store: `{healthChannel.id}`

Save these IDs for your storefront configuration!

## Testing the Setup

After running the seed script:

1. **Check Sales Channels**: Log into the Medusa Admin and navigate to Settings → Sales Channels
2. **Verify Products**: Check that products are properly assigned to their respective channels
3. **Test Currency**: Create a test order to verify ZAR pricing is working correctly
4. **Check Inventory**: Verify that inventory levels are set for both warehouses

## Storefront Integration

To display products from specific stores in your storefront, use the sales channel ID in your API requests:

```typescript
// Example: Fetch Electronics Store products
const products = await medusaClient.products.list({
  sales_channel_id: ["electronics_channel_id_here"],
});

// Example: Fetch Health Store products
const products = await medusaClient.products.list({
  sales_channel_id: ["health_channel_id_here"],
});
```

## Troubleshooting

### Error: "Cannot resolve dependency"

- Make sure you've run `pnpm install` after updating the Medusa packages

### Error: "Region already exists"

- The script creates a new South Africa region. If it already exists, comment out the region creation section

### Products not showing in storefront

- Verify that your storefront is filtering by the correct sales channel ID
- Check that products are published (status: PUBLISHED)

## Next Steps

1. Run this seed script
2. Note the sales channel IDs from the output
3. Update your storefront to filter products by sales channel
4. Configure payment providers for ZAR currency
5. Test the complete checkout flow with ZAR pricing

## Support

For issues or questions about this seed script, refer to the Medusa documentation:

- [Sales Channels](https://docs.medusajs.com/resources/commerce-modules/sales-channel)
- [Multi-Currency](https://docs.medusajs.com/resources/commerce-modules/currency)
- [Product Management](https://docs.medusajs.com/resources/commerce-modules/product)
