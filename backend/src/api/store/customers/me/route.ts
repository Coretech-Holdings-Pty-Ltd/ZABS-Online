import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

export const AUTHENTICATE_CUSTOMER = true;

/**
 * GET /store/customers/me
 * Get the currently authenticated customer
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    console.log("🔍 GET /store/customers/me called");
    
    // Get the authenticated user from the request
    const authContext = (req as any).auth_context || (req as any).auth;
    const authUser = authContext?.actor_id;
    
    console.log("👤 Auth user:", authUser);
    console.log("🔐 Full auth context:", JSON.stringify(authContext, null, 2));
    
    if (!authUser) {
      console.error("❌ No auth user found");
      res.status(401).json({
        type: "unauthorized",
        message: "Authentication required",
      });
      return;
    }

    // Get customer ID from app_metadata
    const customerId = authContext?.app_metadata?.customer_id;
    
    console.log("🆔 Customer ID from metadata:", customerId);
    
    if (!customerId) {
      console.error("❌ No customer ID in app_metadata");
      res.status(404).json({
        type: "not_found",
        message: "Customer not found for this user",
      });
      return;
    }

    // Get the customer service
    const customerModuleService = req.scope.resolve(Modules.CUSTOMER);

    // Fetch the customer
    const customer = await customerModuleService.retrieveCustomer(customerId, {
      relations: ["addresses"],
    });

    console.log("✅ Customer found:", customer?.email);

    if (!customer) {
      console.error("❌ Customer not found in database");
      res.status(404).json({
        type: "not_found",
        message: "Customer not found",
      });
      return;
    }

    res.status(200).json({
      customer,
    });
  } catch (error: any) {
    console.error("❌ Error fetching customer:", error);
    res.status(500).json({
      type: "internal_error",
      message: error.message || "Failed to fetch customer",
    });
  }
}

/**
 * POST /store/customers/me
 * Update the currently authenticated customer
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    console.log("📝 POST /store/customers/me called");
    
    // Get the authenticated user from the request
    const authContext = (req as any).auth_context || (req as any).auth;
    const authUser = authContext?.actor_id;
    
    if (!authUser) {
      console.error("❌ No auth user found");
      res.status(401).json({
        type: "unauthorized",
        message: "Authentication required",
      });
      return;
    }

    // Get customer ID from app_metadata
    const customerId = authContext?.app_metadata?.customer_id;
    
    if (!customerId) {
      console.error("❌ No customer ID in app_metadata");
      res.status(404).json({
        type: "not_found",
        message: "Customer not found for this user",
      });
      return;
    }

    // Get the customer service
    const customerModuleService = req.scope.resolve(Modules.CUSTOMER);

    // Update the customer
    const body = req.body as any;
    const { first_name, last_name, phone, metadata } = body;

    console.log("📝 Updating customer with:", { first_name, last_name, phone });

    const customer = await customerModuleService.updateCustomers(customerId, {
      first_name,
      last_name,
      phone,
      metadata,
    });

    console.log("✅ Customer updated:", customer?.email);

    res.status(200).json({
      customer,
    });
  } catch (error: any) {
    console.error("❌ Error updating customer:", error);
    res.status(500).json({
      type: "internal_error",
      message: error.message || "Failed to update customer",
    });
  }
}
