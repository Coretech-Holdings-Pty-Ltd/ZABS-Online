import { defineMiddlewares } from "@medusajs/medusa";
import { authenticate } from "@medusajs/framework/http";

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/customers/me*",
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
      ],
    },
  ],
});
