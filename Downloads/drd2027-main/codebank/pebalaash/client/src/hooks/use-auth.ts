import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  return useQuery({
    queryKey: ["/api/auth/session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      if (!res.ok) throw new Error("No session");
      return res.json() as Promise<{ id: string; email: string; roles: string[]; wallet?: { balance: number } }>;
    },
    staleTime: 60000,
  });
}