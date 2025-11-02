import { authenticate } from "@medusajs/framework/http";
import { MiddlewaresConfig } from "@medusajs/medusa";

export const config: MiddlewaresConfig = {
  routes: [
    {
      matcher: "/store/customers/me*",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
  ],
};
