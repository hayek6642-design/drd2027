import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useWallet() {
  return useQuery({
    queryKey: [api.wallet.get.path],
    queryFn: async () => {
      const res = await fetch(api.wallet.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch wallet");
      return api.wallet.get.responses[200].parse(await res.json());
    },
  });
}
