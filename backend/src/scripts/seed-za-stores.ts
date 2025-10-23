import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function seedZAStores({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

  logger.info("=== Starting South African Stores Seed ===");

  // Get the main store
  const [store] = await storeModuleService.listStores();

  // Update store to support ZAR currency
  logger.info("Adding ZAR currency support to store...");
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [
          {
            currency_code: "eur",
            is_default: false,
          },
          {
            currency_code: "usd",
          },
          {
            currency_code: "zar",
            is_default: true,
          },
        ],
      },
    },
  });

  // Create Sales Channels for Electronics and Health stores
  logger.info("Creating sales channels for Electronics and Health stores...");
  const { result: salesChannelResult } = await createSalesChannelsWorkflow(
    container
  ).run({
    input: {
      salesChannelsData: [
        {
          name: "Electronics Store",
          description: "Sales channel for electronic products",
        },
        {
          name: "Health Store",
          description: "Sales channel for health and wellness products",
        },
      ],
    },
  });

  const [electronicsChannel, healthChannel] = salesChannelResult;
  logger.info(`Created Electronics Store channel: ${electronicsChannel.id}`);
  logger.info(`Created Health Store channel: ${healthChannel.id}`);

  // Create South Africa Region
  logger.info("Creating South Africa region with ZAR currency...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "South Africa",
          currency_code: "zar",
          countries: ["za"],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const zaRegion = regionResult[0];
  logger.info(`Created South Africa region: ${zaRegion.id}`);

  // Create tax region for South Africa
  logger.info("Creating tax region for South Africa...");
  await createTaxRegionsWorkflow(container).run({
    input: [
      {
        country_code: "za",
        provider_id: "tp_system",
      },
    ],
  });

  // Create Stock Locations for both stores
  logger.info("Creating stock locations...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "Electronics Store Warehouse - Johannesburg",
          address: {
            city: "Johannesburg",
            country_code: "ZA",
            address_1: "123 Tech Street",
            province: "Gauteng",
            postal_code: "2000",
          },
        },
        {
          name: "Health Store Warehouse - Cape Town",
          address: {
            city: "Cape Town",
            country_code: "ZA",
            address_1: "456 Wellness Avenue",
            province: "Western Cape",
            postal_code: "8000",
          },
        },
      ],
    },
  });

  const [electronicsStockLocation, healthStockLocation] = stockLocationResult;
  logger.info(
    `Created Electronics stock location: ${electronicsStockLocation.id}`
  );
  logger.info(`Created Health stock location: ${healthStockLocation.id}`);

  // Link stock locations to fulfillment provider
  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: electronicsStockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: healthStockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  // Create shipping profiles
  logger.info("Creating shipping profiles...");
  const { result: shippingProfileResult } =
    await createShippingProfilesWorkflow(container).run({
      input: {
        data: [
          {
            name: "Electronics Shipping Profile",
            type: "default",
          },
          {
            name: "Health Products Shipping Profile",
            type: "default",
          },
        ],
      },
    });

  const [electronicsShippingProfile, healthShippingProfile] =
    shippingProfileResult;

  // Create fulfillment sets
  logger.info("Creating fulfillment sets...");
  const electronicsFulfillmentSet =
    await fulfillmentModuleService.createFulfillmentSets({
      name: "Electronics Store Delivery",
      type: "shipping",
      service_zones: [
        {
          name: "South Africa",
          geo_zones: [
            {
              country_code: "za",
              type: "country",
            },
          ],
        },
      ],
    });

  const healthFulfillmentSet =
    await fulfillmentModuleService.createFulfillmentSets({
      name: "Health Store Delivery",
      type: "shipping",
      service_zones: [
        {
          name: "South Africa",
          geo_zones: [
            {
              country_code: "za",
              type: "country",
            },
          ],
        },
      ],
    });

  // Link fulfillment sets to stock locations
  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: electronicsStockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: electronicsFulfillmentSet.id,
    },
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: healthStockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: healthFulfillmentSet.id,
    },
  });

  // Create shipping options for Electronics Store
  logger.info("Creating shipping options for Electronics Store...");
  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Delivery",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: electronicsFulfillmentSet.service_zones[0].id,
        shipping_profile_id: electronicsShippingProfile.id,
        type: {
          label: "Standard",
          description: "Delivered in 3-5 business days",
          code: "standard",
        },
        prices: [
          {
            currency_code: "zar",
            amount: 9999, // R99.99
          },
          {
            region_id: zaRegion.id,
            amount: 9999,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Express Delivery",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: electronicsFulfillmentSet.service_zones[0].id,
        shipping_profile_id: electronicsShippingProfile.id,
        type: {
          label: "Express",
          description: "Delivered in 1-2 business days",
          code: "express",
        },
        prices: [
          {
            currency_code: "zar",
            amount: 19999, // R199.99
          },
          {
            region_id: zaRegion.id,
            amount: 19999,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  });

  // Create shipping options for Health Store
  logger.info("Creating shipping options for Health Store...");
  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Delivery",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: healthFulfillmentSet.service_zones[0].id,
        shipping_profile_id: healthShippingProfile.id,
        type: {
          label: "Standard",
          description: "Delivered in 3-5 business days",
          code: "standard",
        },
        prices: [
          {
            currency_code: "zar",
            amount: 7999, // R79.99
          },
          {
            region_id: zaRegion.id,
            amount: 7999,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Express Delivery",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: healthFulfillmentSet.service_zones[0].id,
        shipping_profile_id: healthShippingProfile.id,
        type: {
          label: "Express",
          description: "Delivered in 1-2 business days",
          code: "express",
        },
        prices: [
          {
            currency_code: "zar",
            amount: 14999, // R149.99
          },
          {
            region_id: zaRegion.id,
            amount: 14999,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  });

  // Link sales channels to stock locations
  logger.info("Linking sales channels to stock locations...");
  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: electronicsStockLocation.id,
      add: [electronicsChannel.id],
    },
  });

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: healthStockLocation.id,
      add: [healthChannel.id],
    },
  });

  // Create product categories for Electronics Store
  logger.info("Creating Electronics Store categories...");
  const { result: electronicsCategoryResult } =
    await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: [
          {
            name: "Smartphones",
            is_active: true,
            description: "Latest smartphones and mobile devices",
          },
          {
            name: "Laptops",
            is_active: true,
            description: "High-performance laptops and notebooks",
          },
          {
            name: "Tablets",
            is_active: true,
            description: "Tablets and iPad devices",
          },
          {
            name: "Accessories",
            is_active: true,
            description: "Electronic accessories and peripherals",
          },
          {
            name: "Audio",
            is_active: true,
            description: "Headphones, speakers, and audio equipment",
          },
          {
            name: "Gaming",
            is_active: true,
            description: "Gaming consoles and accessories",
          },
        ],
      },
    });

  // Create product categories for Health Store
  logger.info("Creating Health Store categories...");
  const { result: healthCategoryResult } =
    await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: [
          {
            name: "Vitamins & Supplements",
            is_active: true,
            description: "Essential vitamins and dietary supplements",
          },
          {
            name: "Personal Care",
            is_active: true,
            description: "Personal care and hygiene products",
          },
          {
            name: "Fitness & Wellness",
            is_active: true,
            description: "Fitness equipment and wellness products",
          },
          {
            name: "First Aid",
            is_active: true,
            description: "First aid supplies and medical equipment",
          },
          {
            name: "Natural Remedies",
            is_active: true,
            description: "Natural and herbal remedies",
          },
          {
            name: "Baby & Mother",
            is_active: true,
            description: "Products for babies and mothers",
          },
        ],
      },
    });

  // Create Electronics Store Products
  logger.info("Creating Electronics Store products...");
  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Samsung Galaxy S24 Ultra",
          category_ids: [
            electronicsCategoryResult.find((cat) => cat.name === "Smartphones")!
              .id,
          ],
          description:
            "The latest flagship smartphone with AI-powered features, stunning display, and advanced camera system.",
          handle: "samsung-galaxy-s24-ultra",
          weight: 233,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: electronicsShippingProfile.id,
          images: [
            {
              url: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800",
            },
          ],
          options: [
            {
              title: "Storage",
              values: ["256GB", "512GB", "1TB"],
            },
            {
              title: "Color",
              values: ["Titanium Black", "Titanium Gray", "Titanium Violet"],
            },
          ],
          variants: [
            {
              title: "256GB / Titanium Black",
              sku: "SGS24U-256-BLK",
              options: {
                Storage: "256GB",
                Color: "Titanium Black",
              },
              prices: [
                {
                  amount: 2199900, // R21,999.00
                  currency_code: "zar",
                },
              ],
            },
            {
              title: "512GB / Titanium Gray",
              sku: "SGS24U-512-GRY",
              options: {
                Storage: "512GB",
                Color: "Titanium Gray",
              },
              prices: [
                {
                  amount: 2599900, // R25,999.00
                  currency_code: "zar",
                },
              ],
            },
            {
              title: "1TB / Titanium Violet",
              sku: "SGS24U-1TB-VIO",
              options: {
                Storage: "1TB",
                Color: "Titanium Violet",
              },
              prices: [
                {
                  amount: 2999900, // R29,999.00
                  currency_code: "zar",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: electronicsChannel.id,
            },
          ],
        },
        {
          title: "MacBook Pro 16-inch M3",
          category_ids: [
            electronicsCategoryResult.find((cat) => cat.name === "Laptops")!.id,
          ],
          description:
            "Powerful laptop with M3 chip, stunning Liquid Retina XDR display, and all-day battery life.",
          handle: "macbook-pro-16-m3",
          weight: 2150,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: electronicsShippingProfile.id,
          images: [
            {
              url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
            },
          ],
          options: [
            {
              title: "Configuration",
              values: ["16GB RAM / 512GB", "32GB RAM / 1TB", "64GB RAM / 2TB"],
            },
          ],
          variants: [
            {
              title: "16GB RAM / 512GB",
              sku: "MBP16-M3-16-512",
              options: {
                Configuration: "16GB RAM / 512GB",
              },
              prices: [
                {
                  amount: 4499900, // R44,999.00
                  currency_code: "zar",
                },
              ],
            },
            {
              title: "32GB RAM / 1TB",
              sku: "MBP16-M3-32-1TB",
              options: {
                Configuration: "32GB RAM / 1TB",
              },
              prices: [
                {
                  amount: 5499900, // R54,999.00
                  currency_code: "zar",
                },
              ],
            },
            {
              title: "64GB RAM / 2TB",
              sku: "MBP16-M3-64-2TB",
              options: {
                Configuration: "64GB RAM / 2TB",
              },
              prices: [
                {
                  amount: 6999900, // R69,999.00
                  currency_code: "zar",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: electronicsChannel.id,
            },
          ],
        },
        {
          title: "iPad Pro 12.9-inch",
          category_ids: [
            electronicsCategoryResult.find((cat) => cat.name === "Tablets")!.id,
          ],
          description:
            "The ultimate iPad experience with M2 chip, ProMotion display, and Apple Pencil support.",
          handle: "ipad-pro-12-9",
          weight: 682,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: electronicsShippingProfile.id,
          images: [
            {
              url: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800",
            },
          ],
          options: [
            {
              title: "Storage",
              values: ["128GB", "256GB", "512GB", "1TB"],
            },
            {
              title: "Connectivity",
              values: ["Wi-Fi", "Wi-Fi + Cellular"],
            },
          ],
          variants: [
            {
              title: "128GB / Wi-Fi",
              sku: "IPADPRO129-128-WIFI",
              options: {
                Storage: "128GB",
                Connectivity: "Wi-Fi",
              },
              prices: [
                {
                  amount: 1799900, // R17,999.00
                  currency_code: "zar",
                },
              ],
            },
            {
              title: "256GB / Wi-Fi + Cellular",
              sku: "IPADPRO129-256-CELL",
              options: {
                Storage: "256GB",
                Connectivity: "Wi-Fi + Cellular",
              },
              prices: [
                {
                  amount: 2299900, // R22,999.00
                  currency_code: "zar",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: electronicsChannel.id,
            },
          ],
        },
        {
          title: "Sony WH-1000XM5 Headphones",
          category_ids: [
            electronicsCategoryResult.find((cat) => cat.name === "Audio")!.id,
          ],
          description:
            "Industry-leading noise cancelling headphones with premium sound quality and 30-hour battery life.",
          handle: "sony-wh-1000xm5",
          weight: 250,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: electronicsShippingProfile.id,
          images: [
            {
              url: "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800",
            },
          ],
          options: [
            {
              title: "Color",
              values: ["Black", "Silver"],
            },
          ],
          variants: [
            {
              title: "Black",
              sku: "SONYWH1000XM5-BLK",
              options: {
                Color: "Black",
              },
              prices: [
                {
                  amount: 699900, // R6,999.00
                  currency_code: "zar",
                },
              ],
            },
            {
              title: "Silver",
              sku: "SONYWH1000XM5-SLV",
              options: {
                Color: "Silver",
              },
              prices: [
                {
                  amount: 699900, // R6,999.00
                  currency_code: "zar",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: electronicsChannel.id,
            },
          ],
        },
        {
          title: "PlayStation 5",
          category_ids: [
            electronicsCategoryResult.find((cat) => cat.name === "Gaming")!.id,
          ],
          description:
            "Next-gen gaming console with ultra-high speed SSD, ray tracing, and 4K gaming capabilities.",
          handle: "playstation-5",
          weight: 4500,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: electronicsShippingProfile.id,
          images: [
            {
              url: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800",
            },
          ],
          options: [
            {
              title: "Edition",
              values: ["Standard Edition", "Digital Edition"],
            },
          ],
          variants: [
            {
              title: "Standard Edition",
              sku: "PS5-STD",
              options: {
                Edition: "Standard Edition",
              },
              prices: [
                {
                  amount: 1199900, // R11,999.00
                  currency_code: "zar",
                },
              ],
            },
            {
              title: "Digital Edition",
              sku: "PS5-DIG",
              options: {
                Edition: "Digital Edition",
              },
              prices: [
                {
                  amount: 999900, // R9,999.00
                  currency_code: "zar",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: electronicsChannel.id,
            },
          ],
        },
        {
          title: "USB-C Hub Multi-Port Adapter",
          category_ids: [
            electronicsCategoryResult.find((cat) => cat.name === "Accessories")!
              .id,
          ],
          description:
            "7-in-1 USB-C hub with HDMI, USB 3.0 ports, SD card reader, and 100W power delivery.",
          handle: "usb-c-hub-adapter",
          weight: 85,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: electronicsShippingProfile.id,
          images: [
            {
              url: "https://images.unsplash.com/photo-1625948515291-69613efd103f?w=800",
            },
          ],
          variants: [
            {
              title: "Default",
              sku: "USBCHUB-7IN1",
              prices: [
                {
                  amount: 59900, // R599.00
                  currency_code: "zar",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: electronicsChannel.id,
            },
          ],
        },
      ],
    },
  });

  // Create Health Store Products
  logger.info("Creating Health Store products...");
  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Multivitamin Complex",
          category_ids: [
            healthCategoryResult.find(
              (cat) => cat.name === "Vitamins & Supplements"
            )!.id,
          ],
          description:
            "Complete daily multivitamin with essential vitamins and minerals for overall health and wellness. 90 capsules.",
          handle: "multivitamin-complex",
          weight: 150,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: healthShippingProfile.id,
          images: [
            {
              url: "https://images.unsplash.com/photo-1550572017-4e6c5b0c3b3c?w=800",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["90 Capsules", "180 Capsules"],
            },
          ],
          variants: [
            {
              title: "90 Capsules",
              sku: "MULTI-90",
              options: {
                Size: "90 Capsules",
              },
              prices: [
                {
                  amount: 29900, // R299.00
                  currency_code: "zar",
                },
              ],
            },
            {
              title: "180 Capsules",
              sku: "MULTI-180",
              options: {
                Size: "180 Capsules",
              },
              prices: [
                {
                  amount: 49900, // R499.00
                  currency_code: "zar",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: healthChannel.id,
            },
          ],
        },
        {
          title: "Omega-3 Fish Oil",
          category_ids: [
            healthCategoryResult.find(
              (cat) => cat.name === "Vitamins & Supplements"
            )!.id,
          ],
          description:
            "High-strength Omega-3 EPA and DHA for heart, brain, and joint health. 1000mg per capsule.",
          handle: "omega-3-fish-oil",
          weight: 200,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: healthShippingProfile.id,
          images: [
            {
              url: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["60 Capsules", "120 Capsules"],
            },
          ],
          variants: [
            {
              title: "60 Capsules",
              sku: "OMEGA3-60",
              options: {
                Size: "60 Capsules",
              },
              prices: [
                {
                  amount: 24900, // R249.00
                  currency_code: "zar",
                },
              ],
            },
            {
              title: "120 Capsules",
              sku: "OMEGA3-120",
              options: {
                Size: "120 Capsules",
              },
              prices: [
                {
                  amount: 39900, // R399.00
                  currency_code: "zar",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: healthChannel.id,
            },
          ],
        },
        {
          title: "Vitamin D3 5000 IU",
          category_ids: [
            healthCategoryResult.find(
              (cat) => cat.name === "Vitamins & Supplements"
            )!.id,
          ],
          description:
            "High-potency Vitamin D3 for bone health, immune support, and mood regulation.",
          handle: "vitamin-d3-5000",
          weight: 100,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: healthShippingProfile.id,
          images: [
            {
              url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800",
            },
          ],
          variants: [
            {
              title: "90 Softgels",
              sku: "VITD3-90",
              prices: [
                {
                  amount: 19900, // R199.00
                  currency_code: "zar",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: healthChannel.id,
            },
          ],
        },
        {
          title: "Natural Hand Sanitizer Gel",
          category_ids: [
            healthCategoryResult.find((cat) => cat.name === "Personal Care")!
              .id,
          ],
          description:
            "Alcohol-based hand sanitizer with aloe vera and vitamin E. 70% alcohol content. 500ml bottle.",
          handle: "hand-sanitizer-gel",
          weight: 500,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: healthShippingProfile.id,
          images: [
            {
              url: "https://images.unsplash.com/photo-1584744982493-c4b1e0b0c1d0?w=800",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["250ml", "500ml", "1L"],
            },
          ],
          variants: [
            {
              title: "250ml",
              sku: "SANITIZER-250",
              options: {
                Size: "250ml",
              },
              prices: [
                {
                  amount: 7900, // R79.00
                  currency_code: "zar",
                },
              ],
            },
            {
              title: "500ml",
              sku: "SANITIZER-500",
              options: {
                Size: "500ml",
              },
              prices: [
                {
                  amount: 12900, // R129.00
                  currency_code: "zar",
                },
              ],
            },
            {
              title: "1L",
              sku: "SANITIZER-1L",
              options: {
                Size: "1L",
              },
              prices: [
                {
                  amount: 19900, // R199.00
                  currency_code: "zar",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: healthChannel.id,
            },
          ],
        },
        {
          title: "Yoga Mat Premium",
          category_ids: [
            healthCategoryResult.find(
              (cat) => cat.name === "Fitness & Wellness"
            )!.id,
          ],
          description:
            "Non-slip, eco-friendly yoga mat with extra cushioning. 6mm thickness, 183cm x 61cm.",
          handle: "yoga-mat-premium",
          weight: 1200,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: healthShippingProfile.id,
          images: [
            {
              url: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800",
            },
          ],
          options: [
            {
              title: "Color",
              values: ["Purple", "Blue", "Pink", "Black"],
            },
          ],
          variants: [
            {
              title: "Purple",
              sku: "YOGAMAT-PUR",
              options: {
                Color: "Purple",
              },
              prices: [
                {
                  amount: 39900, // R399.00
                  currency_code: "zar",
                },
              ],
            },
            {
              title: "Blue",
              sku: "YOGAMAT-BLU",
              options: {
                Color: "Blue",
              },
              prices: [
                {
                  amount: 39900, // R399.00
                  currency_code: "zar",
                },
              ],
            },
            {
              title: "Pink",
              sku: "YOGAMAT-PNK",
              options: {
                Color: "Pink",
              },
              prices: [
                {
                  amount: 39900, // R399.00
                  currency_code: "zar",
                },
              ],
            },
            {
              title: "Black",
              sku: "YOGAMAT-BLK",
              options: {
                Color: "Black",
              },
              prices: [
                {
                  amount: 39900, // R399.00
                  currency_code: "zar",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: healthChannel.id,
            },
          ],
        },
        {
          title: "First Aid Kit Complete",
          category_ids: [
            healthCategoryResult.find((cat) => cat.name === "First Aid")!.id,
          ],
          description:
            "Comprehensive first aid kit with 120+ pieces for home, office, or travel. Includes bandages, antiseptics, and emergency supplies.",
          handle: "first-aid-kit-complete",
          weight: 800,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: healthShippingProfile.id,
          images: [
            {
              url: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=800",
            },
          ],
          variants: [
            {
              title: "Standard",
              sku: "FIRSTAID-STD",
              prices: [
                {
                  amount: 49900, // R499.00
                  currency_code: "zar",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: healthChannel.id,
            },
          ],
        },
        {
          title: "Organic Rooibos Tea",
          category_ids: [
            healthCategoryResult.find((cat) => cat.name === "Natural Remedies")!
              .id,
          ],
          description:
            "Premium organic South African Rooibos tea, naturally caffeine-free with antioxidants. 100 teabags.",
          handle: "organic-rooibos-tea",
          weight: 200,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: healthShippingProfile.id,
          images: [
            {
              url: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800",
            },
          ],
          options: [
            {
              title: "Flavor",
              values: ["Original", "Vanilla", "Chai"],
            },
          ],
          variants: [
            {
              title: "Original",
              sku: "ROOIBOS-ORG",
              options: {
                Flavor: "Original",
              },
              prices: [
                {
                  amount: 8900, // R89.00
                  currency_code: "zar",
                },
              ],
            },
            {
              title: "Vanilla",
              sku: "ROOIBOS-VAN",
              options: {
                Flavor: "Vanilla",
              },
              prices: [
                {
                  amount: 9900, // R99.00
                  currency_code: "zar",
                },
              ],
            },
            {
              title: "Chai",
              sku: "ROOIBOS-CHA",
              options: {
                Flavor: "Chai",
              },
              prices: [
                {
                  amount: 9900, // R99.00
                  currency_code: "zar",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: healthChannel.id,
            },
          ],
        },
        {
          title: "Baby Diaper Pack",
          category_ids: [
            healthCategoryResult.find((cat) => cat.name === "Baby & Mother")!
              .id,
          ],
          description:
            "Ultra-soft, hypoallergenic disposable diapers with 12-hour protection. Pack of 60.",
          handle: "baby-diaper-pack",
          weight: 2500,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: healthShippingProfile.id,
          images: [
            {
              url: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["Newborn", "Size 1", "Size 2", "Size 3", "Size 4"],
            },
          ],
          variants: [
            {
              title: "Newborn",
              sku: "DIAPER-NB",
              options: {
                Size: "Newborn",
              },
              prices: [
                {
                  amount: 19900, // R199.00
                  currency_code: "zar",
                },
              ],
            },
            {
              title: "Size 1",
              sku: "DIAPER-S1",
              options: {
                Size: "Size 1",
              },
              prices: [
                {
                  amount: 21900, // R219.00
                  currency_code: "zar",
                },
              ],
            },
            {
              title: "Size 2",
              sku: "DIAPER-S2",
              options: {
                Size: "Size 2",
              },
              prices: [
                {
                  amount: 21900, // R219.00
                  currency_code: "zar",
                },
              ],
            },
            {
              title: "Size 3",
              sku: "DIAPER-S3",
              options: {
                Size: "Size 3",
              },
              prices: [
                {
                  amount: 23900, // R239.00
                  currency_code: "zar",
                },
              ],
            },
            {
              title: "Size 4",
              sku: "DIAPER-S4",
              options: {
                Size: "Size 4",
              },
              prices: [
                {
                  amount: 23900, // R239.00
                  currency_code: "zar",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: healthChannel.id,
            },
          ],
        },
      ],
    },
  });

  // Seed inventory levels
  logger.info("Seeding inventory levels for both stores...");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "sku"],
  });

  const inventoryLevels: CreateInventoryLevelInput[] = [];

  // Add inventory for electronics products
  for (const inventoryItem of inventoryItems) {
    const isElectronicsProduct =
      inventoryItem.sku?.startsWith("SGS24U") ||
      inventoryItem.sku?.startsWith("MBP16") ||
      inventoryItem.sku?.startsWith("IPADPRO") ||
      inventoryItem.sku?.startsWith("SONYWH") ||
      inventoryItem.sku?.startsWith("PS5") ||
      inventoryItem.sku?.startsWith("USBCHUB");

    const isHealthProduct =
      inventoryItem.sku?.startsWith("MULTI") ||
      inventoryItem.sku?.startsWith("OMEGA3") ||
      inventoryItem.sku?.startsWith("VITD3") ||
      inventoryItem.sku?.startsWith("SANITIZER") ||
      inventoryItem.sku?.startsWith("YOGAMAT") ||
      inventoryItem.sku?.startsWith("FIRSTAID") ||
      inventoryItem.sku?.startsWith("ROOIBOS") ||
      inventoryItem.sku?.startsWith("DIAPER");

    if (isElectronicsProduct) {
      inventoryLevels.push({
        location_id: electronicsStockLocation.id,
        stocked_quantity: 100,
        inventory_item_id: inventoryItem.id,
      });
    }

    if (isHealthProduct) {
      inventoryLevels.push({
        location_id: healthStockLocation.id,
        stocked_quantity: 500,
        inventory_item_id: inventoryItem.id,
      });
    }
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryLevels,
    },
  });

  logger.info("Finished seeding inventory levels.");

  logger.info("=== South African Stores Seed Complete ===");
  logger.info("");
  logger.info("Summary:");
  logger.info(`✓ Created 2 sales channels: Electronics Store, Health Store`);
  logger.info(`✓ Created South Africa region with ZAR currency`);
  logger.info(`✓ Created 2 stock locations in Johannesburg and Cape Town`);
  logger.info(`✓ Created 6 Electronics categories with 6 demo products`);
  logger.info(`✓ Created 6 Health categories with 8 demo products`);
  logger.info(`✓ Configured shipping options for both stores`);
  logger.info(`✓ Set up inventory for all products`);
  logger.info("");
  logger.info("Sales Channel IDs:");
  logger.info(`  Electronics Store: ${electronicsChannel.id}`);
  logger.info(`  Health Store: ${healthChannel.id}`);
}
