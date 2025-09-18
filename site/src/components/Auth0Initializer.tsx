import { useAuth0Integration } from "~/hooks/useAuth0Integration";

/**
 * Component that initializes Auth0 integration
 * This should be rendered at the root level to ensure auth state is synced
 */
export function Auth0Initializer({ children }: { children: React.ReactNode }) {
  // This hook will automatically sync Auth0 state with our auth store
  useAuth0Integration();
  
  return <>{children}</>;
}
