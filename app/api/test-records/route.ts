import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { handleApiError, ApiError } from '@/lib/errors'
import { apiLimiter, getRateLimitIdentifier, validateContentType } from '@/lib/rate-limit'

// GET - List all records for authenticated user
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new ApiError(401, 'Unauthorized')
    }

    // Rate limiting - 20 requests per minute
    const identifier = getRateLimitIdentifier(req, userId)
    const { success, remaining } = await apiLimiter.check(20, identifier)

    if (!success) {
      throw new ApiError(429, 'Rate limit exceeded. Please try again later.')
    }

    const records = await prisma.recordTest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    const response = NextResponse.json(records, { status: 200 })
    response.headers.set('X-RateLimit-Remaining', remaining.toString())

    return response
  } catch (error) {
    return handleApiError(error)
  }
}

// POST - Create new record
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new ApiError(401, 'Unauthorized')
    }

    // Content-Type validation
    if (!validateContentType(req, 'application/json')) {
      throw new ApiError(415, 'Content-Type must be application/json')
    }

    // Rate limiting - 20 requests per minute
    const identifier = getRateLimitIdentifier(req, userId)
    const { success, remaining } = await apiLimiter.check(20, identifier)

    if (!success) {
      throw new ApiError(429, 'Rate limit exceeded. Please try again later.')
    }

    const body = await req.json()
    const { title, description, status } = body

    if (!title || typeof title !== 'string') {
      throw new ApiError(400, 'Title is required and must be a string')
    }

    const record = await prisma.recordTest.create({
      data: {
        title,
        description: description || null,
        status: status || 'active',
        userId
      }
    })

    const response = NextResponse.json(record, { status: 201 })
    response.headers.set('X-RateLimit-Remaining', remaining.toString())

    return response
  } catch (error) {
    return handleApiError(error)
  }
}
