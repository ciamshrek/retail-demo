# Hono Remote MCP Server with Checkout

This demo shows an end‑to‑end, minimal Model Context Protocol (MCP) server built with [Hono](https://hono.dev/) and deployed to Vercel **with simple Auth0-backed authorization**. 

It intentionally avoids Auth0 SDKs to keep the flow transparent—just plain HTTP + JWT Validation + environment variables + a [lightweight tenant configuration (`tenant.yaml`)](./auth0/tenant.yaml).

You can leverage teh contents of this demo to build your own, or use the tenant as a baseline to protect other MCP Servers that are ports of the calculator sample.

## Demo

Live MCP endpoint: [https://mcp-auth0-basic.vercel.app/mcp](https://mcp-auth0-basic.vercel.app/mcp). You can also visit [https://mcp-auth0-basic.vercel.app](https://mcp-auth0-basic.vercel.app) in your browser.

## What is MCP?
The Model Context Protocol (MCP) standardizes how applications expose context and tools to LLMs. Here we expose simple math tools over an `/mcp` HTTP endpoint compatible with MCP clients (e.g. editors) while protecting access with an Auth0-issued access token.

## Features

- **Math Tools**: add, subtract, multiply, divide
- **Authorization**: Uses an Auth0 with OAuth 2.1 to obtain the tokens
- **MCP Transport**: Via `mcp-handler` with Hono
- **Runtime Validation**: Zod + TypeScript
- **Config as Code**: `auth0/tenant.yaml` & `auth0/config.json` capture tenant resources for automation


## Prerequisites

You only need:

1. **An Auth0 Tenant** – create one at https://auth0.com 
2. **A Machine‑to‑Machine (Service) Application** in Auth0, see below for instructions.
3. **Vercel Account + Vercel CLI** (`npm i -g vercel`) to deploy

> Why a Management (M2M) client? It can be granted Auth0 Management API scopes so you can automate or later script additional tenant configuration. In this demo we just read its credentials as environment variables.

### Create the Auth0 Deployment (Management) Client

In the Auth0 Dashboard:

1. Applications → + Create Application
2. Name: `Deployment Client` (screenshot shows `Deployment Helper` – either name is fine)
3. Type: **Machine to Machine** → Create
4. When prompted to authorize an API: choose **Auth0 Management API**
5. For production you can trim to the minimal set you actually need (e.g. `read:clients update:clients read:connections read:grants` etc.).
6. Click **Authorize**.
7. Copy the displayed values for Domain, Client ID, Client Secret.

#### Visual Flow (Screenshots)

| Step | Image | Notes |
|------|-------|-------|
| 1 | ![Auth0 Applications list with + Create Application highlighted](./screenshots/create-client-0.png) | Starting point: Applications list. Click + Create Application. |
| 2 | ![Create Application modal with name Deployment Helper and Machine to Machine selected](./screenshots/create-client-1.png) | Provide name (Deployment Helper) and pick Machine to Machine. |
| 3 | ![Authorize Machine to Machine dialog with Management API and all scopes selected](./screenshots/create-client-2.png) | Select Auth0 Management API and grant demo scopes (reduce later). |
| 4 | ![Deployment Helper application Settings tab showing domain and credentials fields](./screenshots/create-client-3.png) | Copy Domain, Client ID, Client Secret for env vars. |

> Redact / never commit secrets. Only the domain and client ID are safe to show publicly.

### Required Environment Variables

| Variable | Where to get it | Example / Notes |
|----------|-----------------|-----------------|
| `AUTH0_DOMAIN` | From the Deployment Client page (`Domain`) | `{TENANT}.{REGION}.auth0.com` |
| `AUTH0_CLIENT_ID` | Deployment Client (`Client ID`) | alphanumeric |
| `AUTH0_CLIENT_SECRET` | Deployment Client (`Client Secret`) | keep secret |
| `RESOURCE_URL` | Your deployed Vercel base URL + `/mcp` | e.g. `https://your-app.vercel.app/mcp` |

`RESOURCE_URL` is what MCP clients will call. Locally you can use `http://localhost:3000/mcp`.

See `.env.example` for the minimal list. In Vercel you set these under Project → Settings → Environment Variables (set for `Production` and optionally `Preview`).


### Running Locally

If you do not want to deploy to vercel and just want to run this locally, you can do so by creating a `.env` file and then running the following commands.

```sh
$ pnpm deploy:auth0
```
This will setup the auth0 environment for you, and create the MCP Server, Declare scopes etc.

```sh
$ pnpm dev
```

## Deployment

1. Push this repo (or your fork) to GitHub / GitLab / Bitbucket.
2. Create a new Vercel Project pointing at it.
3. Add the four environment variables (`AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `RESOURCE_URL`). For `RESOURCE_URL` you can temporarily set a placeholder and then update it after first deploy with the real production URL + `/mcp`.
4. (Optional) Redeploy after updating `RESOURCE_URL` so clients get the correct value.
5. Or via CLI:
	```bash
	npm install
	vercel deploy
	```

#### Deployment Screenshot

![Vercel project setup screen with environment variables filled in prior to deploy](./screenshots/vercel-setup-1.png)

After deployment your MCP endpoint will be:

```
https://<your-vercel-domain>/mcp
```

## API Endpoints

- `GET /` – Basic welcome & health info
- `POST /mcp/*` – MCP protocol (tools transport)

## Available Tools

| Tool | Description |
|------|-------------|
| add | Add two numbers |
| subtract | Subtract second from first |
| multiply | Multiply two numbers |
| divide | Divide first by second (zero guarded) |

## Using the MCP Server

Point any MCP-compatible client to your `RESOURCE_URL` (the `/mcp` endpoint). Provide an Auth0 access token if/where required by your integration (this demo keeps validation logic intentionally minimal—extend it for stricter claims / audience checks).


For how to do this in Claude see, [Anthropic's Documentation](https://support.anthropic.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp)

## Extending

Add new tools by registering them in the MCP handler (see `src/` code). Consider introducing more granular scopes, caching JWKS, or adding structured logging.

## Troubleshooting

| Issue | Tip |
|-------|-----|
| 401 / unauthorized | Verify token audience & domain; confirm env vars set in correct Vercel environment. |
| Wrong `RESOURCE_URL` | Remember to append `/mcp`. Redeploy after updating. |
| Tool not visible | Restart / refresh MCP client session; clear any local caching. |

---

Happy hacking! Feel free to adapt this starting point into a richer secured MCP service.
