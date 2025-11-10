# Vulnerable API Examples (Educational Only)

⚠️ **WARNING: DO NOT USE THESE IN PRODUCTION** ⚠️

These are examples of vulnerable API endpoints to show your students what NOT to do.

---

## Example 1: No userId Filter (Data Breach)

```typescript
// ❌ CRITICAL VULNERABILITY
// File: app/api/vulnerable/all-records/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 🚨 BUG: No userId filter!
  // This returns EVERYONE's records, not just the current user's
  const records = await prisma.recordTest.findMany()

  return NextResponse.json(records)
}
```

**Attack scenario:**
1. User A logs in
2. Calls `/api/vulnerable/all-records`
3. Receives records from User B, User C, User D...
4. Complete data breach!

**Fix:**
```typescript
const records = await prisma.recordTest.findMany({
  where: { userId }  // ← Add this!
})
```

---

## Example 2: No Ownership Check on Update

```typescript
// ❌ CRITICAL VULNERABILITY
// File: app/api/vulnerable/update/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()

  // 🚨 BUG: No check if this record belongs to the user!
  // User can update ANY record by changing the ID in the request
  const record = await prisma.recordTest.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description
    }
  })

  return NextResponse.json(record)
}
```

**Attack scenario:**
1. User A creates a record with ID "clxxx123"
2. User B intercepts the request and changes ID to "clxxx123"
3. User B can now modify User A's data!

**Fix:**
```typescript
// First, verify ownership
const existingRecord = await prisma.recordTest.findFirst({
  where: { id, userId }
})

if (!existingRecord) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

// Now safe to update
const record = await prisma.recordTest.update({
  where: { id },
  data: { title: body.title, description: body.description }
})
```

---

## Example 3: SQL Injection

```typescript
// ❌ HIGH VULNERABILITY
// File: app/api/vulnerable/search/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')

  // 🚨 BUG: String interpolation in SQL = SQL INJECTION!
  const records = await prisma.$queryRawUnsafe(
    `SELECT * FROM "RecordTest" WHERE "userId" = '${userId}' AND title LIKE '%${query}%'`
  )

  return NextResponse.json(records)
}
```

**Attack scenario:**
```
Normal request:
GET /api/vulnerable/search?q=test

Malicious request:
GET /api/vulnerable/search?q=%' OR '1'='1

SQL becomes:
SELECT * FROM "RecordTest" WHERE "userId" = 'user_123' AND title LIKE '%%' OR '1'='1%'

Returns ALL records from ALL users!
```

**Even worse attack:**
```
GET /api/vulnerable/search?q=%'; DROP TABLE "RecordTest"; --

SQL becomes:
SELECT * FROM "RecordTest" WHERE "userId" = 'user_123' AND title LIKE '%%'; DROP TABLE "RecordTest"; --%'

Deletes the entire table!
```

**Fix:**
```typescript
// Use Prisma ORM (automatically parameterized)
const records = await prisma.recordTest.findMany({
  where: {
    userId,
    title: {
      contains: query || ''
    }
  }
})

// OR use parameterized raw query
const records = await prisma.$queryRaw`
  SELECT * FROM "RecordTest"
  WHERE "userId" = ${userId}
  AND title LIKE ${'%' + query + '%'}
`
```

---

## Example 4: No Authentication

```typescript
// ❌ CRITICAL VULNERABILITY
// File: app/api/vulnerable/public-data/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  // 🚨 BUG: No authentication check at all!
  // Anyone can access this, even without logging in

  const records = await prisma.recordTest.findMany()

  return NextResponse.json(records)
}
```

**Attack scenario:**
1. Hacker doesn't even need to create an account
2. Just calls the endpoint directly
3. Gets all data from the database

**Fix:**
```typescript
export async function GET(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const records = await prisma.recordTest.findMany({
    where: { userId }
  })

  return NextResponse.json(records)
}
```

---

## Example 5: Exposing Sensitive Data

```typescript
// ❌ HIGH VULNERABILITY
// File: app/api/vulnerable/user-profile/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 🚨 BUG: Returns ALL user fields including sensitive ones
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true  // Includes Stripe IDs, payment info, etc.
    }
  })

  return NextResponse.json(user)
}
```

**Response exposes:**
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "stripeCustomerId": "cus_xxxxx",  // ← Should NOT expose
  "subscription": {
    "stripeSubscriptionId": "sub_xxxxx",  // ← Should NOT expose
    "status": "active",
    "currentPeriodEnd": "2024-12-31",
    // ... other sensitive payment info
  }
}
```

**Fix:**
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    email: true,
    name: true,
    createdAt: true,
    subscription: {
      select: {
        status: true,
        currentPeriodEnd: true
        // Don't include Stripe IDs
      }
    }
  }
})
```

---

## Example 6: No Input Validation

```typescript
// ❌ MEDIUM VULNERABILITY
// File: app/api/vulnerable/create/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  // 🚨 BUG: No validation!
  // Accepts ANY data - could be empty, too long, wrong type, etc.
  const record = await prisma.recordTest.create({
    data: {
      title: body.title,  // Could be undefined, null, 10MB string, etc.
      description: body.description,
      status: body.status,  // Could be "hacked" instead of valid status
      userId
    }
  })

  return NextResponse.json(record)
}
```

**Attack scenarios:**
```javascript
// 1. Empty title
fetch('/api/vulnerable/create', {
  method: 'POST',
  body: JSON.stringify({ title: '' })  // Database error!
})

// 2. Huge string (DOS attack)
fetch('/api/vulnerable/create', {
  method: 'POST',
  body: JSON.stringify({
    title: 'A'.repeat(10000000)  // 10MB string!
  })
})

// 3. Invalid status
fetch('/api/vulnerable/create', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Test',
    status: 'HACKED'  // Not a valid status
  })
})
```

**Fix:**
```typescript
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  status: z.enum(['active', 'inactive', 'pending'])
})

export async function POST(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const validation = createSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: validation.error },
      { status: 400 }
    )
  }

  const record = await prisma.recordTest.create({
    data: {
      ...validation.data,
      userId
    }
  })

  return NextResponse.json(record)
}
```

---

## Example 7: No Rate Limiting

```typescript
// ❌ MEDIUM VULNERABILITY
// File: app/api/vulnerable/spam/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  // 🚨 BUG: No rate limiting!
  // Attacker can spam this endpoint 1000s of times per second
  const record = await prisma.recordTest.create({
    data: {
      title: body.title,
      userId
    }
  })

  return NextResponse.json(record)
}
```

**Attack scenario:**
```javascript
// Spam script
for (let i = 0; i < 100000; i++) {
  fetch('/api/vulnerable/spam', {
    method: 'POST',
    body: JSON.stringify({ title: `Spam ${i}` })
  })
}

// Result:
// - Database filled with 100,000 spam records
// - Server overloaded
// - Cloud bill skyrockets
// - Service unavailable for legitimate users
```

**Fix:**
```typescript
import { rateLimiter } from '@/lib/rateLimiter'

export async function POST(req: NextRequest) {
  // Check rate limit FIRST
  try {
    await rateLimiter(req)
  } catch (error) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const record = await prisma.recordTest.create({
    data: {
      title: body.title,
      userId
    }
  })

  return NextResponse.json(record)
}
```

---

## Example 8: Trust Client-Side Data

```typescript
// ❌ CRITICAL VULNERABILITY
// File: app/api/vulnerable/trust-client/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()

  // 🚨 BUG: Trusting userId from client!
  // Client sends userId in the request body
  const { userId, title, description } = body

  // No authentication check!
  // Just creates record with whatever userId the client sends
  const record = await prisma.recordTest.create({
    data: {
      userId,  // ← NEVER trust this from client!
      title,
      description
    }
  })

  return NextResponse.json(record)
}
```

**Attack scenario:**
```javascript
// Attacker sends:
fetch('/api/vulnerable/trust-client', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'user_SOMEONE_ELSE',  // ← Impersonating another user!
    title: 'Hacked',
    description: 'I can create records as any user!'
  })
})

// Result: Record created under someone else's account!
```

**Fix:**
```typescript
export async function POST(req: NextRequest) {
  // Get userId from authentication, NEVER from request body
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { title, description } = body  // Don't accept userId from body

  const record = await prisma.recordTest.create({
    data: {
      userId,  // Use authenticated userId
      title,
      description
    }
  })

  return NextResponse.json(record)
}
```

---

## Direct Database Access Examples

These show what can happen when someone accesses your database directly (not through your API):

### Scenario 1: Database Admin Tool

```sql
-- Admin using pgAdmin or similar tool

-- Without RLS:
SELECT * FROM "RecordTest";
-- Returns ALL users' records (no filtering!)

-- Can see data from all tenants
SELECT "userId", COUNT(*) as record_count
FROM "RecordTest"
GROUP BY "userId";

-- Can modify any user's data
UPDATE "RecordTest"
SET title = 'Admin was here'
WHERE id = 'clxxx123';  -- Any record!

-- Can delete any data
DELETE FROM "RecordTest"
WHERE "userId" = 'user_competitor';
```

**With RLS properly configured:**
```sql
-- Would only return/modify records for the current database role
-- Postgres enforces row-level security at database level
```

---

### Scenario 2: Forgotten Where Clause (Code Bug)

```typescript
// Developer writes this code in a hurry:

export async function GET(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 🚨 BUG: Copy-pasted code, forgot to add where clause!
  const totalRecords = await prisma.recordTest.count()
  //                                                    ^^^^
  // Should be: .count({ where: { userId } })

  // Returns total count across ALL users, leaking business intelligence
  return NextResponse.json({ count: totalRecords })
}
```

---

### Scenario 3: Debugging Query in Production

```typescript
// Developer debugging in production (bad practice!)

export async function GET(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Temporary debugging code that accidentally got deployed:
  const debugMode = req.headers.get('x-debug') === 'true'

  if (debugMode) {
    // 🚨 BUG: Debug mode returns ALL data!
    const allRecords = await prisma.recordTest.findMany()
    return NextResponse.json(allRecords)
  }

  const records = await prisma.recordTest.findMany({
    where: { userId }
  })

  return NextResponse.json(records)
}
```

---

## Summary: Why These Bugs Happen

1. **Copy-Paste Errors** - Copying code and forgetting to add userId filter
2. **Rushed Development** - Shipping features without security review
3. **Lack of Testing** - Not testing multi-tenant isolation
4. **Trust Assumptions** - Assuming client/input is valid
5. **Missing Code Reviews** - No second pair of eyes on security
6. **No Automated Checks** - No security testing in CI/CD
7. **Documentation Gap** - New developers don't know the security patterns

---

## Prevention Checklist

For every API endpoint, verify:

- [ ] Authentication check (`await auth()`)
- [ ] Authorization check (user owns the resource)
- [ ] Input validation (Zod schema)
- [ ] Rate limiting applied
- [ ] userId filter in all queries
- [ ] Ownership check before UPDATE/DELETE
- [ ] No raw SQL with string interpolation
- [ ] No sensitive data in responses
- [ ] Error handling doesn't leak details
- [ ] Tests cover multi-tenant scenarios

---

## Teaching Your Students

Use these examples to show:

1. **The vulnerability** - What's wrong with the code
2. **The attack** - How a hacker would exploit it
3. **The impact** - What damage it could cause
4. **The fix** - How to do it correctly
5. **The prevention** - How to avoid it in the future

**Hands-on exercise:**
- Give students the vulnerable code
- Ask them to identify the security flaw
- Have them write the exploit
- Then have them fix the code
- Finally, write tests to prevent regression

This creates security-conscious developers!
