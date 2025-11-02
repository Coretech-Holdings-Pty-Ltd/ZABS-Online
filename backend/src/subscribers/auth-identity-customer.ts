import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";

/**
 * Subscriber that listens for auth.identity.created events
 * and automatically creates a customer record for the user
 */
export default async function handleAuthIdentityCreated({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; provider: string; entity_id: string }>) {
  const authModuleService = container.resolve(Modules.AUTH);
  const customerModuleService = container.resolve(Modules.CUSTOMER);

  console.log("🔐 Auth identity created event received:", data);

  // Only handle emailpass provider for customer registration
  if (data.provider !== "emailpass") {
    console.log("⏭️  Skipping non-emailpass provider:", data.provider);
    return;
  }

  try {
    // Get the auth identity details
    const authIdentity = await authModuleService.retrieveAuthIdentity(data.id, {
      relations: ["provider_identities"],
    });

    console.log("🔍 Auth identity details:", authIdentity);

    // Extract email from provider metadata
    const providerIdentity = authIdentity.provider_identities?.[0];
    const email = providerIdentity?.user_metadata?.email || providerIdentity?.provider_metadata?.email;

    if (!email) {
      console.error("❌ No email found in auth identity");
      return;
    }

    console.log("📧 Email extracted:", email);

    // Check if customer already exists
    const existingCustomers = await customerModuleService.listCustomers({
      email: email,
    });

    if (existingCustomers && existingCustomers.length > 0) {
      console.log("✅ Customer already exists for email:", email);
      
      // Link the customer to the auth identity if not already linked
      const customerId = existingCustomers[0].id;
      
      // Update the auth identity's app_metadata with customer_id
      await authModuleService.updateAuthIdentities({
        id: data.id,
        app_metadata: {
          customer_id: customerId,
        },
      });
      
      console.log("🔗 Linked existing customer to auth identity:", customerId);
      return;
    }

    // Create a new customer
    const customer = await customerModuleService.createCustomers({
      email: email as string,
      has_account: true,
    });

    console.log("✅ Customer created:", customer);

    // Update the auth identity's app_metadata with the new customer_id
    await authModuleService.updateAuthIdentities({
      id: data.id,
      app_metadata: {
        customer_id: customer.id,
      },
    });

    console.log("🔗 Linked new customer to auth identity:", customer.id);
  } catch (error) {
    console.error("❌ Error creating customer for auth identity:", error);
  }
}

export const config: SubscriberConfig = {
  event: "auth.identity.created",
};
