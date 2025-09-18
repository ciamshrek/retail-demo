import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import { useAuthStore } from "~/stores/authStore";

/**
 * Hook that synchronizes Auth0 state with our Zustand auth store
 * This ensures our app's auth state stays in sync with Auth0
 */
export function useAuth0Integration() {
  const { 
    isAuthenticated: auth0IsAuthenticated, 
    user: auth0User, 
    isLoading: auth0IsLoading,
    getAccessTokenSilently,
    loginWithRedirect,
    logout: auth0Logout
  } = useAuth0();
  
  const { login, logout, setLoading, isAuthenticated } = useAuthStore();

  // Sync loading state
  useEffect(() => {
    setLoading(auth0IsLoading);
  }, [auth0IsLoading, setLoading]);

  // Sync authentication state
  useEffect(() => {
    const syncAuthState = async () => {
      if (auth0IsAuthenticated && auth0User) {
        try {
          // Get the access token
          const accessToken = await getAccessTokenSilently();
          
          // Update our auth store with Auth0 data
          login(
            {
              id: auth0User.sub!,
              email: auth0User.email!,
              name: auth0User.name,
              picture: auth0User.picture,
            },
            accessToken
          );
        } catch (error) {
          console.error("Failed to get access token:", error);
          // If we can't get a token, logout
          logout();
        }
      } else if (!auth0IsAuthenticated && isAuthenticated) {
        // Auth0 says we're not authenticated but our store thinks we are
        logout();
      }
    };

    if (!auth0IsLoading) {
      void syncAuthState();
    }
  }, [
    auth0IsAuthenticated, 
    auth0User, 
    auth0IsLoading, 
    getAccessTokenSilently, 
    login, 
    logout, 
    isAuthenticated
  ]);

  return {
    loginWithRedirect: () => loginWithRedirect({
      authorizationParams: {
        screen_hint: "login",
      }
    }),
    logout: () => auth0Logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    }),
    getAccessTokenSilently,
    isLoading: auth0IsLoading,
  };
}
