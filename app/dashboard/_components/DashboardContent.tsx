'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import SecurityTest from './SecurityTest'
import CrudTest from './CrudTest'
import WrongApproach from './WrongApproach'

export default function DashboardContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [showPaymentSuccess, setShowPaymentSuccess] = useState(false)

    useEffect(() => {
        const isPaymentSuccess = searchParams?.get('payment') === 'success';

        if (isPaymentSuccess) {
            setShowPaymentSuccess(true)
            router.replace('/dashboard')

            const timer = setTimeout(() => {
            setShowPaymentSuccess(false)
            }, 5000)

            return () => clearTimeout(timer)
        }
    }, [searchParams, router])

    return (
        <div className='min-h-screen space-y-10 mt-24 pb-20'>
            {showPaymentSuccess && (
                <div className='bg-green-500/10 max-w-xl mx-auto my-8 border border-green-500/20 rounded-xl p-4 text-green-400'>
                    <div className='flex items-center justify-center'>
                        <CheckCircle className='h-5 w-5 mr-4' />
                        <p>Payment successfull! Your subscription is now active!</p>
                    </div>
                </div>
            )}

            {/* Security Testing Section */}
            <div className='space-y-4'>
                <SecurityTest />
            </div>

            {/* CRUD Testing Section */}
            <div className='space-y-4 mt-6 min-h-screen'>
                <CrudTest />
            </div>

            {/* Security Anti-Patterns (Educational) */}
            <div className='space-y-4'>
                <WrongApproach />
            </div>
        </div>
    )
}