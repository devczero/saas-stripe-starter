import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { handleApiError, ApiError } from '@/lib/errors'

// GET - List all records for authenticated user
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new ApiError(401, 'Unauthorized')
    }

    const records = await prisma.recordTest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(records, { status: 200 })
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

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
