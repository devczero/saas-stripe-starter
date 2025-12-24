import { LRUCache } from 'lru-cache'
import { NextRequest } from 'next/server'

type RateLimitOptions = {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval: number // Max number of unique users to track
}

type RateLimiter = {
  check: (limit: number, token: string) => Promise<{ success: boolean; remaining: number }>
}

export function rateLimit(options: RateLimitOptions): RateLimiter {
  const tokenCache = new LRUCache<string, number[]>({
    max: options.uniqueTokenPerInterval,
    ttl: options.interval
  })

  return {
    check: async (limit: number, token: string): Promise<{ success: boolean; remaining: number }> => {
      const tokenCount = tokenCache.get(token) || [0]
      const currentTime = Date.now()

      // Filter out timestamps outside the current window
      const validTimestamps = tokenCount.filter(
        timestamp => currentTime - timestamp < options.interval
      )

      if (validTimestamps.length >= limit) {
        return {
          success: false,
          remaining: 0
        }
      }

      // Add current timestamp
      validTimestamps.push(currentTime)
      tokenCache.set(token, validTimestamps)

      return {
        success: true,
        remaining: limit - validTimestamps.length
      }
    }
  }
}

// Create rate limiter instances for different endpoints
// 20 requests per minute per user
export const apiLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500 // Max 500 unique users tracked
})

// Helper to get rate limit identifier from request
export function getRateLimitIdentifier(req: NextRequest, userId?: string): string {
  // Prefer userId if available, fallback to IP
  if (userId) {
    return `user:${userId}`
  }

  const ip = req.headers.get('x-forwarded-for') ||
             req.headers.get('x-real-ip') ||
             'unknown'

  return `ip:${ip}`
}

// Helper to validate Content-Type header
export function validateContentType(req: NextRequest, expectedType: string = 'application/json'): boolean {
  const contentType = req.headers.get('content-type')

  if (!contentType) {
    return false
  }

  // Content-Type can include charset, so check if it starts with the expected type
  return contentType.toLowerCase().startsWith(expectedType.toLowerCase())
}
