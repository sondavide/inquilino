import { useState } from 'react'
import LandingHeader       from '@/components/landing/LandingHeader'
import HeroSection         from '@/components/landing/HeroSection'
import HowItWorksSection   from '@/components/landing/HowItWorksSection'
import MunicipalitySearch  from '@/components/landing/MunicipalitySearch'
import PricingSection      from '@/components/landing/PricingSection'
import TestimonialsSection from '@/components/landing/TestimonialsSection'
import FaqSection          from '@/components/landing/FaqSection'
import LandingFooter       from '@/components/landing/LandingFooter'
import AgencyContactModal  from '@/components/landing/AgencyContactModal'
import CookieNotice        from '@/components/landing/CookieNotice'

export default function LandingPage() {
  const [agencyModalOpen, setAgencyModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />

      <main>
        <HeroSection />
        <HowItWorksSection  onAgencyCta={() => setAgencyModalOpen(true)} />
        <MunicipalitySearch />
        <PricingSection     onAgencyCta={() => setAgencyModalOpen(true)} />
        <TestimonialsSection />
        <FaqSection />
      </main>

      <LandingFooter />
      <CookieNotice />

      {agencyModalOpen && (
        <AgencyContactModal onClose={() => setAgencyModalOpen(false)} />
      )}
    </div>
  )
}
