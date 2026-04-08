import type { User } from "@shared/schema";

interface UseAuthReturn {
  user: Partial<User> | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth(): UseAuthReturn {
  // Disabled for guest mode - Farragna Phase 1
  return {
    user: null,
    isLoading: false,
    isAuthenticated: false,
  };
}
