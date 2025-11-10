import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { handleApiError, ApiError } from '@/lib/errors'

// GET - Get single record
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new ApiError(401, 'Unauthorized')
    }

    const { id } = await params

    const record = await prisma.recordTest.findFirst({
      where: {
        id,
        userId // Critical: ensure user can only access their own records
      }
    })

    if (!record) {
      throw new ApiError(404, 'Record not found')
    }

    return NextResponse.json(record, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT - Update record
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new ApiError(401, 'Unauthorized')
    }

    const { id } = await params
    const body = await req.json()
    const { title, description, status } = body

    // First verify the record belongs to the user
    const existingRecord = await prisma.recordTest.findFirst({
      where: { id, userId }
    })

    if (!existingRecord) {
      throw new ApiError(404, 'Record not found or access denied')
    }

    const record = await prisma.recordTest.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && { status })
      }
    })

    return NextResponse.json(record, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE - Delete record
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new ApiError(401, 'Unauthorized')
    }

    const { id } = await params

    // First verify the record belongs to the user
    const existingRecord = await prisma.recordTest.findFirst({
      where: { id, userId }
    })

    if (!existingRecord) {
      throw new ApiError(404, 'Record not found or access denied')
    }

    await prisma.recordTest.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Record deleted successfully' }, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}
