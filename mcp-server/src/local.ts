import 'dotenv/config';
import { serve } from '@hono/node-server'
import app from './index.js'

const port = process.env.PORT ? parseInt(process.env.PORT) : 3002

console.log(`🚀 Starting Hono MCP Server on port ${port}`)
console.log(`📡 MCP endpoint: http://localhost:${port}/mcp`)
console.log(`🏠 Welcome page: http://localhost:${port}/`)

serve({
  fetch: app.fetch,
  port,
})

console.log(`✅ Server is running on http://localhost:${port}`)
