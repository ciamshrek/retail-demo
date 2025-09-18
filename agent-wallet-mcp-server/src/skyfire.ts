import { z } from 'zod'

// Skyfire API Configuration
export const SKYFIRE_API_BASE_URL = 'https://api-qa.skyfire.xyz/api/v1'

// Environment schema for Skyfire
export const skyfireEnvSchema = z.object({
  SKYFIRE_API_KEY: z.string().describe('Skyfire API key for buyer agent'),
  SKYFIRE_AGENT_ID: z.string().optional().describe('Skyfire agent ID (optional)'),
})

// Skyfire Token Types
export enum TokenType {
  KYA = 'kya',
  PAY = 'pay',
  KYA_PAY = 'kya+pay'
}

// Request/Response Schemas
export const createTokenRequestSchema = z.object({
  type: z.nativeEnum(TokenType).describe('Type of token to create: kya | pay | kya+pay'),
  buyerTag: z.string().describe('Buyer internal transaction ID'),
  sellerServiceId: z.string().describe('Seller service ID'),
  tokenAmount: z.string().optional().describe('Amount in USD as string (required for pay and kya+pay tokens)'),
  expiresAt: z.number().optional().describe('Seconds since Unix epoch (default: 24 hours)'),
  identityPermissions: z.array(z.string()).optional().describe('Additional identity fields for kya/kya+pay tokens')
})

export const tokenResponseSchema = z.object({
  token: z.string(),
  tokenId: z.string(),
  expiresAt: z.string(),
  amount: z.number().optional(),
  buyerTag: z.string(),
  sellerServiceId: z.string(),
  tokenType: z.string()
})

export const serviceSchema = z.object({
  serviceId: z.string(),
  agentId: z.string(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  pricePerCall: z.number().optional(),
  isActive: z.boolean()
})

export const walletBalanceSchema = z.object({
  available: z.string(),
  heldAmount: z.string(),
  pendingCharges: z.string(),
  pendingDeposits: z.string()
})

// Skyfire API Client
export class SkyfireAPIClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, baseUrl: string = SKYFIRE_API_BASE_URL) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    
    const requestHeaders = {
      'Content-Type': 'application/json',
      'skyfire-api-key': `${this.apiKey}`,
      'x-client': 'ciamshrek-mcp-proxy',
      ...options.headers
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: requestHeaders
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Skyfire API error (${response.status}): ${errorText}`)
      }

      return await response.json()
    } catch (error) {
      throw error
    }
  }

  async createToken(params: {
    buyerTag: string
    sellerServiceId: string
    amount?: number
    tokenType: TokenType
  }): Promise<any> {
    const body: any = {
      type: params.tokenType,
      buyerTag: params.buyerTag,
      sellerServiceId: params.sellerServiceId
    }

    if (params.tokenType === TokenType.PAY || params.tokenType === TokenType.KYA_PAY) {
      if (!params.amount) {
        throw new Error('Amount is required for pay and kya+pay tokens')
      }
      body.tokenAmount = params.amount.toString()
    }

    return await this.makeRequest('/tokens', {
      method: 'POST',
      body: JSON.stringify(body)
    })
  }

  async getServices(): Promise<any> {
    return await this.makeRequest('/directory/services')
  }

  async getServiceTags(): Promise<any> {
    return await this.makeRequest('/directory/tags')
  }

  async getServicesByTags(tags: string[]): Promise<any> {
    const commaDelimitedTags = tags.join(',')
    return await this.makeRequest(`/directory/services/search?commaDelimitedTags=${encodeURIComponent(commaDelimitedTags)}`)
  }

  async getWalletBalance(): Promise<any> {
    return await this.makeRequest('/agents/balance')
  }

  async getTokenCharges(tokenId: string): Promise<any> {
    return await this.makeRequest(`/tokens/${tokenId}/charges`)
  }

  async introspectToken(token: string): Promise<any> {
    return await this.makeRequest('/tokens/introspect', {
      method: 'POST',
      body: JSON.stringify({ token })
    })
  }
}
