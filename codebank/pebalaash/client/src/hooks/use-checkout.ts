import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

type CheckoutInput = z.infer<typeof api.checkout.purchase.input>;

export function usePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CheckoutInput) => {
      const res = await fetch(api.checkout.purchase.path, {
        method: api.checkout.purchase.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Purchase failed");
      }
      
      return api.checkout.purchase.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.wallet.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.admin.stats.path] });
    },
  });
}
