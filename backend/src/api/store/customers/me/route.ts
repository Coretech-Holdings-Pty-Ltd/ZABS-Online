import { MedusaRequest, MedusaResponse, authenticate } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

/**
 * GET /store/customers/me
 * Get the currently authenticated customer
 */
export const GET = authenticate("customer", ["session", "bearer"])(
  async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
    try {
      console.log("🔍 GET /store/customers/me called");
      console.log("🔐 Auth context:", (req as any).auth_context);
      console.log("🔐 Auth:", (req as any).auth);
      
      // Get the authenticated user from the request
      const authContext = (req as any).auth_context || (req as any).auth;
      const authUser = authContext?.actor_id;
      
      console.log("👤 Auth user:", authUser);
      
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
      console.error("Error fetching customer:", error);
      res.status(500).json({
        type: "internal_error",
        message: error.message || "Failed to fetch customer",
      });
    }
  }
);

/**
 * POST /store/customers/me
 * Update the currently authenticated customer
 */
export const POST = authenticate("customer", ["session", "bearer"])(
  async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  try {
    // Get the authenticated user from the request
    const authContext = (req as any).auth_context || (req as any).auth;
    const authUser = authContext?.actor_id;
    
    if (!authUser) {
      res.status(401).json({
        type: "unauthorized",
        message: "Authentication required",
      });
      return;
    }

    // Get customer ID from app_metadata
    const customerId = authContext?.app_metadata?.customer_id;
    
    if (!customerId) {
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

    const customer = await customerModuleService.updateCustomers(customerId, {
      first_name,
      last_name,
      phone,
      metadata,
    });

    res.status(200).json({
      customer,
    });
  } catch (error: any) {
    console.error("Error updating customer:", error);
    res.status(500).json({
      type: "internal_error",
      message: error.message || "Failed to update customer",
    });
  }
}
