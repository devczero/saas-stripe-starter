import { RedirectComponent } from "@/components/RedirectComponent"
import DashboardContent from "./_components/DashboardContent"
import { checkAuthenticationAndSubscription } from "@/lib/checkAuthSubscription"

export default async function Dashboard() {
    try {
        const authCheck = await checkAuthenticationAndSubscription()
        
        if (authCheck.redirectTo) {
    
          return <RedirectComponent to={authCheck.redirectTo} />
        }

        return (
          <>
            <div className="min-h-screen flex items-center justify-center text-3xl">dashboard content - visible (subscription active)</div>
            <DashboardContent />
          </>
        )
      } catch (error) {
        console.error('Error in Dashboard page:', error)
        return <RedirectComponent to="/" />
      }
}