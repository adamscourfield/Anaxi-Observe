import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import DualEngineSection from "@/components/landing/DualEngineSection";
import ValuePropsSection from "@/components/landing/ValuePropsSection";
import CTASection from "@/components/landing/CTASection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <main>
        <HeroSection />
        <DualEngineSection />
        <ValuePropsSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
