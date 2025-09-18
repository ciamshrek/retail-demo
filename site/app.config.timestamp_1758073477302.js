// app.config.ts
import { createApp } from "vinxi";
import reactRefresh from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { config } from "vinxi/plugins/config";

// src/server/env.ts
import { z } from "zod";
var envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]),
  BASE_URL: z.string().optional(),
  BASE_URL_OTHER_PORT: z.string().optional(),
  ADMIN_PASSWORD: z.string(),
  JWT_SECRET: z.string(),
  // Auth0
  VITE_AUTH0_DOMAIN: z.string(),
  VITE_AUTH0_CLIENT_ID: z.string(),
  VITE_AUTH0_CLIENT_SECRET: z.string(),
  VITE_AUTH0_AUDIENCE: z.string(),
  // Stripe
  STRIPE_SECRET_KEY: z.string(),
  VITE_STRIPE_PUBLISHABLE_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string()
});
var env = envSchema.parse(process.env);

// app.config.ts
import { nodePolyfills } from "vite-plugin-node-polyfills";

// vite-console-forward-plugin.ts
import { createLogger } from "vite";
var logger = createLogger("info", {
  prefix: "[browser]"
});
function consoleForwardPlugin(options = {}) {
  const {
    enabled = true,
    endpoint = "/api/debug/client-logs",
    levels = ["log", "warn", "error", "info", "debug"]
  } = options;
  const virtualModuleId = "virtual:console-forward";
  const resolvedVirtualModuleId = "\0" + virtualModuleId;
  return {
    name: "console-forward",
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        if (!enabled) {
          return html;
        }
        if (html.includes("virtual:console-forward")) {
          return html;
        }
        return html.replace(
          /<head[^>]*>/i,
          (match) => `${match}
    <script type="module">import "virtual:console-forward";</script>`
        );
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        if (!enabled) {
          return "export default {};";
        }
        return `
// Console forwarding module
const originalMethods = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
};

const logBuffer = [];
let flushTimeout = null;
const FLUSH_DELAY = 100;
const MAX_BUFFER_SIZE = 50;

function createLogEntry(level, args) {
  const stacks = [];
  const extra = [];

  const message = args.map((arg) => {
    if (arg === undefined) return "undefined";
    if (typeof arg === "string") return arg;
    if (arg instanceof Error || typeof arg.stack === "string") {
      let stringifiedError = arg.toString();
      if (arg.stack) {
        let stack = arg.stack.toString();
        if (stack.startsWith(stringifiedError)) {
          stack = stack.slice(stringifiedError.length).trimStart();
        }
        if (stack) {
          stacks.push(stack);
        }
      }
      return stringifiedError;
    }
    if (typeof arg === "object" && arg !== null) {
      try {
        extra.push(JSON.parse(JSON.stringify(arg)));
      } catch {
        extra.push(String(arg));
      }
      return "[extra#" + extra.length + "]";
    }
    return String(arg);
  }).join(" ");

  return {
    level,
    message,
    timestamp: new Date(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    stacks,
    extra,
  };
}

async function sendLogs(logs) {
  try {
    await fetch("${endpoint}", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logs }),
    });
  } catch (error) {
    // Fail silently in production
  }
}

function flushLogs() {
  if (logBuffer.length === 0) return;
  const logsToSend = [...logBuffer];
  logBuffer.length = 0;
  sendLogs(logsToSend);
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
}

function addToBuffer(entry) {
  logBuffer.push(entry);
  if (logBuffer.length >= MAX_BUFFER_SIZE) {
    flushLogs();
    return;
  }
  if (!flushTimeout) {
    flushTimeout = setTimeout(flushLogs, FLUSH_DELAY);
  }
}

// Patch console methods
${levels.map(
          (level) => `
console.${level} = function(...args) {
  originalMethods.${level}(...args);
  const entry = createLogEntry("${level}", args);
  addToBuffer(entry);
};`
        ).join("")}

// Cleanup handlers
window.addEventListener("beforeunload", flushLogs);
setInterval(flushLogs, 10000);

export default { flushLogs };
        `;
      }
    },
    configureServer(server) {
      server.middlewares.use(endpoint, (req, res, next) => {
        const request = req;
        if (request.method !== "POST") {
          return next();
        }
        let body = "";
        request.setEncoding("utf8");
        request.on("data", (chunk) => {
          body += chunk;
        });
        request.on("end", () => {
          try {
            const { logs } = JSON.parse(body);
            logs.forEach((log) => {
              const location = log.url ? ` (${log.url})` : "";
              let message = `[${log.level}] ${log.message}${location}`;
              if (log.stacks && log.stacks.length > 0) {
                message += "\n" + log.stacks.map(
                  (stack) => stack.split("\n").map((line) => `    ${line}`).join("\n")
                ).join("\n");
              }
              if (log.extra && log.extra.length > 0) {
                message += "\n    Extra data: " + JSON.stringify(log.extra, null, 2).split("\n").map((line) => `    ${line}`).join("\n");
              }
              const logOptions = { timestamp: true };
              switch (log.level) {
                case "error": {
                  const error = log.stacks && log.stacks.length > 0 ? new Error(log.stacks.join("\n")) : null;
                  logger.error(message, { ...logOptions, error });
                  break;
                }
                case "warn":
                  logger.warn(message, logOptions);
                  break;
                case "info":
                  logger.info(message, logOptions);
                  break;
                case "debug":
                  logger.info(message, logOptions);
                  break;
                default:
                  logger.info(message, logOptions);
              }
            });
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
          } catch (error) {
            server.config.logger.error("Error processing client logs:", {
              timestamp: true,
              error
            });
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid JSON" }));
          }
        });
      });
    }
  };
}

// app.config.ts
var app_config_default = createApp({
  server: {
    preset: "vercel",
    // changed from "node-server" for Vercel deployment
    experimental: {
      asyncContext: true
    }
  },
  routers: [
    {
      type: "static",
      name: "public",
      dir: "./public"
    },
    {
      type: "http",
      name: "trpc",
      base: "/trpc",
      handler: "./src/server/trpc/handler.ts",
      target: "server",
      plugins: () => [
        config("allowedHosts", {
          // @ts-ignore
          server: {
            allowedHosts: env.BASE_URL ? [env.BASE_URL.split("://")[1], ".vercel.app"] : [".vercel.app", "localhost"]
          }
        }),
        tsConfigPaths({
          projects: ["./tsconfig.json"]
        })
      ]
    },
    {
      type: "http",
      name: "debug",
      base: "/api/debug/client-logs",
      handler: "./src/server/debug/client-logs-handler.ts",
      target: "server",
      plugins: () => [
        config("allowedHosts", {
          // @ts-ignore
          server: {
            allowedHosts: env.BASE_URL ? [env.BASE_URL.split("://")[1], ".vercel.app"] : [".vercel.app", "localhost"]
          }
        }),
        tsConfigPaths({
          projects: ["./tsconfig.json"]
        })
      ]
    },
    {
      type: "spa",
      name: "client",
      handler: "./index.html",
      target: "browser",
      plugins: () => [
        config("allowedHosts", {
          // @ts-ignore
          server: {
            allowedHosts: env.BASE_URL ? [env.BASE_URL.split("://")[1], ".vercel.app"] : [".vercel.app", "localhost"]
          }
        }),
        tsConfigPaths({
          projects: ["./tsconfig.json"]
        }),
        TanStackRouterVite({
          target: "react",
          autoCodeSplitting: true,
          routesDirectory: "./src/routes",
          generatedRouteTree: "./src/generated/routeTree.gen.ts"
        }),
        reactRefresh(),
        nodePolyfills(),
        consoleForwardPlugin({
          enabled: true,
          endpoint: "/api/debug/client-logs",
          levels: ["log", "warn", "error", "info", "debug"]
        })
      ]
    }
  ]
});
export {
  app_config_default as default
};
