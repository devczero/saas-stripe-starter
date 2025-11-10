'use client'

import { useState } from 'react'
import { AlertTriangle, Bug, ShieldAlert, Code, ChevronDown, ChevronUp } from 'lucide-react'

type VulnerabilityExample = {
  id: string
  title: string
  severity: 'critical' | 'high' | 'medium'
  category: string
  wrongCode: string
  correctCode: string
  explanation: string
  impact: string
  realWorldExample?: string
}

export default function WrongApproach() {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const vulnerabilities: VulnerabilityExample[] = [
    {
      id: 'missing-userid-filter',
      title: '🚨 CRITICAL: Missing userId Filter in Query',
      severity: 'critical',
      category: 'Data Isolation',
      wrongCode: `// ❌ WRONG - Returns ALL users' records!
export async function GET(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // BUG: No userId filter!
  const records = await prisma.recordTest.findMany()

  return NextResponse.json(records)
}`,
      correctCode: `// ✅ CORRECT - Only returns current user's records
export async function GET(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // FIXED: Filter by userId
  const records = await prisma.recordTest.findMany({
    where: { userId }  // ← CRITICAL!
  })

  return NextResponse.json(records)
}`,
      explanation: 'This is the #1 most common multi-tenant security bug. Without the userId filter, the API returns EVERY user\'s data, not just the authenticated user\'s data.',
      impact: '🔴 CRITICAL: Complete data breach. User A can see all of User B, C, D\'s private data. GDPR violation, lawsuit potential.',
      realWorldExample: 'In 2019, a fitness app leaked 140M records because they forgot userId filters in their API.'
    },
    {
      id: 'update-without-ownership-check',
      title: '🚨 CRITICAL: Update Without Ownership Verification',
      severity: 'critical',
      category: 'Authorization',
      wrongCode: `// ❌ WRONG - User can update ANY record by changing the ID!
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  const { id } = await params
  const body = await req.json()

  // BUG: No check if record belongs to this user!
  const record = await prisma.recordTest.update({
    where: { id },
    data: body
  })

  return NextResponse.json(record)
}`,
      correctCode: `// ✅ CORRECT - Verify ownership before update
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  const { id } = await params
  const body = await req.json()

  // STEP 1: Check if record belongs to user
  const existingRecord = await prisma.recordTest.findFirst({
    where: { id, userId }  // ← CRITICAL!
  })

  if (!existingRecord) {
    return NextResponse.json(
      { error: 'Not found or access denied' },
      { status: 404 }
    )
  }

  // STEP 2: Now safe to update
  const record = await prisma.recordTest.update({
    where: { id },
    data: body
  })

  return NextResponse.json(record)
}`,
      explanation: 'User can modify the record ID in the request and change someone else\'s data! Always verify ownership before UPDATE/DELETE operations.',
      impact: '🔴 CRITICAL: User A can modify/delete User B\'s data. Data corruption, privacy violation.',
      realWorldExample: 'Peloton had a bug where users could modify other users\' profiles by changing the user ID in the API request.'
    },
    {
      id: 'no-auth-check',
      title: '🚨 CRITICAL: No Authentication Check',
      severity: 'critical',
      category: 'Authentication',
      wrongCode: `// ❌ WRONG - No authentication at all!
export async function GET(req: NextRequest) {
  // BUG: No auth check!
  const records = await prisma.recordTest.findMany()

  return NextResponse.json(records)
}

// Anyone can access this endpoint, even unauthenticated users!`,
      correctCode: `// ✅ CORRECT - Always check authentication
export async function GET(req: NextRequest) {
  const { userId } = await auth()

  // STEP 1: Verify authentication
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // STEP 2: Get data for authenticated user only
  const records = await prisma.recordTest.findMany({
    where: { userId }
  })

  return NextResponse.json(records)
}`,
      explanation: 'Every API endpoint MUST check if the user is authenticated before processing the request.',
      impact: '🔴 CRITICAL: Complete unauthorized access. Hackers can access all data without logging in.',
      realWorldExample: 'Facebook accidentally left some admin endpoints unprotected, allowing access to internal tools.'
    },
    {
      id: 'sql-injection-raw-query',
      title: '⚠️ HIGH: SQL Injection via Raw Query',
      severity: 'high',
      category: 'Input Validation',
      wrongCode: `// ❌ WRONG - SQL Injection vulnerability!
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  // BUG: String interpolation in SQL = SQL INJECTION!
  const records = await prisma.$queryRawUnsafe(
    \`SELECT * FROM "RecordTest" WHERE "userId" = '\${userId}' AND status = '\${status}'\`
  )

  return NextResponse.json(records)
}

// Attacker sends: ?status=active' OR '1'='1
// SQL becomes: SELECT * FROM "RecordTest" WHERE "userId" = 'xxx' AND status = 'active' OR '1'='1'
// Returns ALL records!`,
      correctCode: `// ✅ CORRECT - Use parameterized queries or Prisma ORM
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'active'

  // Option 1: Use Prisma (safest)
  const records = await prisma.recordTest.findMany({
    where: {
      userId,
      status  // Prisma automatically parameterizes this
    }
  })

  // Option 2: If you must use raw SQL, use parameters
  // const records = await prisma.$queryRaw\`
  //   SELECT * FROM "RecordTest"
  //   WHERE "userId" = \${userId} AND status = \${status}
  // \`  // ← Note: Template literal, NOT string interpolation!

  return NextResponse.json(records)
}`,
      explanation: 'Never use string interpolation in SQL queries. Always use parameterized queries or ORM methods.',
      impact: '🟠 HIGH: Attacker can read/modify/delete entire database, create admin accounts, steal credentials.',
      realWorldExample: 'SQL injection is #1 in OWASP Top 10. Millions of sites have been hacked this way.'
    },
    {
      id: 'exposing-sensitive-data',
      title: '⚠️ HIGH: Exposing Sensitive User Data',
      severity: 'high',
      category: 'Data Exposure',
      wrongCode: `// ❌ WRONG - Returns sensitive data that shouldn't be exposed!
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // BUG: Returns ALL user fields including sensitive ones
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  return NextResponse.json(user)
}

// Response includes:
// {
//   id: "user_123",
//   email: "user@example.com",
//   stripeCustomerId: "cus_xxx",  // ← Should never expose!
//   // ... other internal fields
// }`,
      correctCode: `// ✅ CORRECT - Only return necessary fields
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      // Only select fields the frontend needs
      id: true,
      email: true,
      name: true,
      createdAt: true
      // stripeCustomerId: false (don't include)
    }
  })

  return NextResponse.json(user)
}`,
      explanation: 'Always use explicit field selection. Don\'t return internal IDs, API keys, or sensitive metadata.',
      impact: '🟠 HIGH: Exposes internal system details that can be used for further attacks.',
      realWorldExample: 'APIs that expose database IDs, internal reference numbers make it easier to enumerate and attack the system.'
    },
    {
      id: 'no-input-validation',
      title: '⚠️ MEDIUM: No Input Validation',
      severity: 'medium',
      category: 'Input Validation',
      wrongCode: `// ❌ WRONG - No validation of input data!
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // BUG: Accepts ANY data, no validation!
  const record = await prisma.recordTest.create({
    data: {
      title: body.title,  // Could be undefined, null, 10MB string, etc.
      description: body.description,
      status: body.status,  // Could be "hacked" instead of valid status
      userId
    }
  })

  return NextResponse.json(record)
}`,
      correctCode: `// ✅ CORRECT - Validate input with Zod
import { z } from 'zod'

const createRecordSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  status: z.enum(['active', 'inactive', 'pending'])
})

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Validate input
  const validation = createRecordSchema.safeParse(body)

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
}`,
      explanation: 'Always validate input data. Check types, lengths, formats, and allowed values.',
      impact: '🟡 MEDIUM: Data corruption, application crashes, potential for injection attacks.',
      realWorldExample: 'Lack of input validation led to the "Billion Laughs" DOS attack on XML parsers.'
    },
    {
      id: 'no-rate-limiting',
      title: '⚠️ MEDIUM: No Rate Limiting',
      severity: 'medium',
      category: 'API Security',
      wrongCode: `// ❌ WRONG - No rate limiting!
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // BUG: Attacker can spam this endpoint 1000s of times per second
  const record = await prisma.recordTest.create({
    data: { ...body, userId }
  })

  return NextResponse.json(record)
}

// Attacker can:
// - Create millions of records (fill up database)
// - Overload your server (DOS attack)
// - Rack up huge cloud bills`,
      correctCode: `// ✅ CORRECT - Add rate limiting
import { rateLimiter } from '@/lib/rateLimiter'

export async function POST(req: NextRequest) {
  // STEP 1: Check rate limit BEFORE anything else
  try {
    await rateLimiter(req)
  } catch (error) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const record = await prisma.recordTest.create({
    data: { ...body, userId }
  })

  return NextResponse.json(record)
}`,
      explanation: 'Rate limiting prevents abuse, DOS attacks, and protects your infrastructure costs.',
      impact: '🟡 MEDIUM: Service disruption, high cloud bills, database filled with spam.',
      realWorldExample: 'In 2021, attackers spammed an unprotected API endpoint and ran up $72,000 in cloud costs overnight.'
    },
    {
      id: 'leaking-errors',
      title: '⚠️ MEDIUM: Leaking Internal Errors',
      severity: 'medium',
      category: 'Information Disclosure',
      wrongCode: `// ❌ WRONG - Exposes internal error details!
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    const records = await prisma.recordTest.findMany({
      where: { userId }
    })

    return NextResponse.json(records)
  } catch (error) {
    // BUG: Sends full error to client!
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}

// Error response reveals:
// - Database table names
// - File paths on server
// - Library versions
// - SQL query details`,
      correctCode: `// ✅ CORRECT - Generic errors, log details server-side
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    const records = await prisma.recordTest.findMany({
      where: { userId }
    })

    return NextResponse.json(records)
  } catch (error) {
    // Log full error server-side
    console.error('[API Error]', {
      error,
      userId,
      timestamp: new Date().toISOString()
    })

    // Return generic error to client
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}`,
      explanation: 'Never expose internal error details to clients. Log them server-side, return generic errors to users.',
      impact: '🟡 MEDIUM: Information disclosure helps attackers understand your system architecture.',
      realWorldExample: 'Detailed error messages have helped hackers identify vulnerable library versions to exploit.'
    },
    {
      id: 'client-side-filtering',
      title: '⚠️ CRITICAL: Client-Side Only Filtering (Trust the Client)',
      severity: 'critical',
      category: 'Authorization',
      wrongCode: `// ❌ WRONG - Trusting client-side filtering!

// Frontend code:
const [records, setRecords] = useState([])

useEffect(() => {
  fetch('/api/all-records')  // Gets ALL records
    .then(res => res.json())
    .then(data => {
      // BUG: Filtering on client side!
      const myRecords = data.filter(r => r.userId === currentUserId)
      setRecords(myRecords)
    })
}, [])

// Backend:
export async function GET() {
  // BUG: Returns everyone's data, trusts client to filter
  const allRecords = await prisma.recordTest.findMany()
  return NextResponse.json(allRecords)
}

// Attacker can:
// 1. Open browser DevTools
// 2. See ALL users' data in Network tab
// 3. Remove the filter in console
// 4. Access everyone's data`,
      correctCode: `// ✅ CORRECT - ALWAYS filter on server!

// Frontend code:
const [records, setRecords] = useState([])

useEffect(() => {
  // Server returns ONLY current user's data
  fetch('/api/my-records')
    .then(res => res.json())
    .then(data => setRecords(data))
}, [])

// Backend:
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // CRITICAL: Filter on server before sending
  const records = await prisma.recordTest.findMany({
    where: { userId }  // Server-side filtering
  })

  return NextResponse.json(records)
}

// Client never sees other users' data!`,
      explanation: 'NEVER trust the client! Always filter, validate, and authorize on the server. Anything sent to the client can be seen and manipulated.',
      impact: '🔴 CRITICAL: Complete data breach. All users can see all data if they know how to use DevTools.',
      realWorldExample: 'A major e-commerce site sent all customer orders to the browser and filtered client-side. Customers could see other customers\' orders, addresses, and payment info.'
    },
    {
      id: 'sequential-ids',
      title: '⚠️ MEDIUM: Predictable Sequential IDs',
      severity: 'medium',
      category: 'Data Enumeration',
      wrongCode: `// ❌ WRONG - Using sequential integer IDs

// Prisma schema:
model RecordTest {
  id Int @id @default(autoincrement())  // 1, 2, 3, 4...
  title String
  userId String
}

// API endpoint:
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // Attacker can enumerate: /api/records/1, /api/records/2, etc.
  const record = await prisma.recordTest.findUnique({
    where: { id: parseInt(id) }
  })
  return NextResponse.json(record)
}

// Even with userId check, attacker knows:
// - Total number of records
// - How fast you're growing
// - When records were created`,
      correctCode: `// ✅ CORRECT - Use UUIDs or CUIDs (unpredictable)

// Prisma schema:
model RecordTest {
  id String @id @default(cuid())  // clxxxxxxxxxxxxxxx
  // or
  id String @id @default(uuid())  // 550e8400-e29b-41d4-a716-446655440000
  title String
  userId String
}

// API endpoint:
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  const { id } = await params

  const record = await prisma.recordTest.findFirst({
    where: { id, userId }  // Still check ownership!
  })

  if (!record) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(record)
}`,
      explanation: 'Sequential IDs leak business intelligence and make enumeration attacks easy. Use UUIDs/CUIDs for unpredictability.',
      impact: '🟡 MEDIUM: Information leakage, easier enumeration attacks, reveals business metrics.',
      realWorldExample: 'Facebook used sequential IDs early on, allowing competitors to estimate their growth rate.'
    }
  ]

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500/50 bg-red-500/10'
      case 'high': return 'border-orange-500/50 bg-orange-500/10'
      case 'medium': return 'border-yellow-500/50 bg-yellow-500/10'
      default: return 'border-gray-500/50 bg-gray-500/10'
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length
  const highCount = vulnerabilities.filter(v => v.severity === 'high').length
  const mediumCount = vulnerabilities.filter(v => v.severity === 'medium').length

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <div className="bg-[#18181a] rounded-2xl border border-[#2f2f2f] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#2f2f2f] bg-red-500/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <ShieldAlert className="h-8 w-8 text-red-400" />
                Security Anti-Patterns & Common Mistakes
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Educational examples of what NOT to do - Real vulnerabilities to avoid in production
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-4 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Total Examples</div>
              <div className="text-2xl font-bold text-white mt-1">{vulnerabilities.length}</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Critical</div>
              <div className="text-2xl font-bold text-red-400 mt-1">{criticalCount}</div>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
              <div className="text-gray-400 text-sm">High</div>
              <div className="text-2xl font-bold text-orange-400 mt-1">{highCount}</div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Medium</div>
              <div className="text-2xl font-bold text-yellow-400 mt-1">{mediumCount}</div>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="p-4 bg-yellow-500/10 border-b border-yellow-500/20">
          <div className="flex items-start gap-3 text-yellow-400">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>Educational Purpose Only:</strong> These examples show real security vulnerabilities found in production applications.
              Never implement these patterns in your code. Use this as a reference to avoid common mistakes.
            </div>
          </div>
        </div>

        {/* Vulnerabilities List */}
        <div className="divide-y divide-[#2f2f2f]">
          {vulnerabilities.map((vuln) => (
            <div key={vuln.id} className={`p-6 border-l-4 ${getSeverityColor(vuln.severity)}`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Bug className="h-5 w-5 text-red-400" />
                    <h3 className="text-lg font-semibold text-white">{vuln.title}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded border ${getSeverityBadge(vuln.severity)}`}>
                      {vuln.severity.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400">{vuln.category}</span>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedId(expandedId === vuln.id ? null : vuln.id)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {expandedId === vuln.id ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Explanation */}
              <p className="text-gray-300 text-sm mb-3">{vuln.explanation}</p>

              {/* Impact */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-red-400 mb-1">Impact:</p>
                <p className="text-sm text-gray-300">{vuln.impact}</p>
              </div>

              {/* Real World Example */}
              {vuln.realWorldExample && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 mb-4">
                  <p className="text-sm font-semibold text-blue-400 mb-1">Real-World Example:</p>
                  <p className="text-sm text-gray-300">{vuln.realWorldExample}</p>
                </div>
              )}

              {/* Code Examples */}
              {expandedId === vuln.id && (
                <div className="mt-4 space-y-4">
                  {/* Wrong Code */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Code className="h-4 w-4 text-red-400" />
                      <h4 className="text-sm font-semibold text-red-400">❌ WRONG APPROACH (VULNERABLE)</h4>
                    </div>
                    <pre className="bg-gray-950 border border-red-500/30 rounded-lg p-4 overflow-x-auto">
                      <code className="text-xs text-gray-300 whitespace-pre">{vuln.wrongCode}</code>
                    </pre>
                  </div>

                  {/* Correct Code */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Code className="h-4 w-4 text-green-400" />
                      <h4 className="text-sm font-semibold text-green-400">✅ CORRECT APPROACH (SECURE)</h4>
                    </div>
                    <pre className="bg-gray-950 border border-green-500/30 rounded-lg p-4 overflow-x-auto">
                      <code className="text-xs text-gray-300 whitespace-pre">{vuln.correctCode}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Summary */}
        <div className="p-6 border-t border-[#2f2f2f] bg-gray-800/30">
          <h3 className="text-lg font-semibold text-white mb-3">Key Takeaways for Students:</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">1.</span>
              <span><strong>Always filter by userId</strong> - Every query must include the authenticated user's ID</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">2.</span>
              <span><strong>Verify ownership before UPDATE/DELETE</strong> - Check if the record belongs to the user first</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">3.</span>
              <span><strong>Never trust the client</strong> - All security decisions must happen on the server</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">4.</span>
              <span><strong>Validate all inputs</strong> - Use schema validation (Zod) for every API endpoint</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">5.</span>
              <span><strong>Use ORMs, avoid raw SQL</strong> - Prisma prevents SQL injection; raw queries are dangerous</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">6.</span>
              <span><strong>Rate limit everything</strong> - Prevent abuse and DOS attacks on all endpoints</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">7.</span>
              <span><strong>Don't leak error details</strong> - Generic errors to users, detailed logs server-side</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">8.</span>
              <span><strong>Use unpredictable IDs</strong> - UUIDs/CUIDs instead of sequential integers</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
