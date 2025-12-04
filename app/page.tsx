import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import HeroSection from '@/components/sections/HeroSection';
import ConceptSection from '@/components/sections/ConceptSection';
import UserBenefits from '@/components/sections/UserBenefits';
import InstructorBenefits from '@/components/sections/InstructorBenefits';
import Categories from '@/components/sections/Categories';
import FeaturesSection from '@/components/sections/FeaturesSection';
import HowItWorksSection from '@/components/sections/HowItWorksSection';
import Message from '@/components/sections/Message';
import CTASection from '@/components/sections/CTASection';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <ConceptSection />
        <UserBenefits />
        <InstructorBenefits />
        <Categories />
        <FeaturesSection />
        <HowItWorksSection />
        <Message />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
