/// <reference types="vinxi/types/client" />

import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { Auth0Provider } from "@auth0/auth0-react";

import "./styles.css";

import { createRouter } from "./router";
import { env } from "./client/env";

// Set up a Router instance
const router = createRouter();

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <Auth0Provider clientId={env.VITE_AUTH0_CLIENT_ID} domain={env.VITE_AUTH0_DOMAIN}>
        <RouterProvider router={router} />
      </Auth0Provider>
    </React.StrictMode>,
  );
}
