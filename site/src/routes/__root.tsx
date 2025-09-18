import {
  Outlet,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router";
import toast, { Toaster } from "react-hot-toast";
import { TRPCReactProvider } from "~/trpc/react";
import { Header } from "~/components/Header";
import { Auth0Initializer } from "~/components/Auth0Initializer";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const isFetching = useRouterState({ select: (s) => s.isLoading });

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <TRPCReactProvider>
      <Auth0Initializer>
        <div className="min-h-screen bg-white">
          <Header />
          <main>
            <Outlet />
          </main>
          <Toaster 
            position="bottom-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Auth0Initializer>
    </TRPCReactProvider>
  );
}
