import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useAdminStats(enabled: boolean) {
  return useQuery({
    queryKey: [api.admin.stats.path],
    queryFn: async () => {
      const res = await fetch(api.admin.stats.path, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 403) throw new Error("Unauthorized");
        throw new Error("Failed to fetch stats");
      }
      return api.admin.stats.responses[200].parse(await res.json());
    },
    enabled,
  });
}
