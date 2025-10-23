import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { 
  createCustomerAccountWorkflow,
} from "@medusajs/medusa/core-flows";

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const body = req.body as any;
  const { email, password, first_name, last_name, phone } = body;

  if (!email || !password) {
    res.status(400).json({
      message: "Email and password are required",
    });
    return;
  }

  try {
    const { result } = await createCustomerAccountWorkflow(req.scope).run({
      input: {
        authIdentityId: `emailpass_${email}`,
        customerData: {
          email,
          first_name,
          last_name,
          phone,
        },
      },
    });

    res.status(201).json({
      customer: result,
    });
  } catch (error: any) {
    console.error("Error registering customer:", error);
    res.status(400).json({
      message: error.message || "Failed to register customer",
    });
  }
}
