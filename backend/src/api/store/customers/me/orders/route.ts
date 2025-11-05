import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

export const AUTHENTICATE_CUSTOMER = true;

/**
 * GET /store/customers/me/orders
 * Get all orders for the currently authenticated customer
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    console.log("🔍 GET /store/customers/me/orders called");
    
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
    
    console.log("🆔 Customer ID:", customerId);
    
    if (!customerId) {
      console.error("❌ No customer ID in app_metadata");
      res.status(404).json({
        type: "not_found",
        message: "Customer not found for this user",
      });
      return;
    }

    // Get the order service
    const orderModuleService = req.scope.resolve(Modules.ORDER);

    // Fetch orders for this customer
    const orders = await orderModuleService.listOrders({
      customer_id: customerId,
    });

    console.log(`✅ Found ${orders?.length || 0} orders for customer`);

    res.status(200).json({
      orders: orders || [],
      count: orders?.length || 0,
    });
  } catch (error: any) {
    console.error("❌ Error fetching customer orders:", error);
    res.status(500).json({
      type: "internal_error",
      message: error.message || "Failed to fetch orders",
    });
  }
}
