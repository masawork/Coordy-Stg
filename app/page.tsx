'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import StickyCTABar from '@/components/common/StickyCTABar';
import HeroSection from '@/components/sections/HeroSection';
import UseCasesSection from '@/components/sections/UseCasesSection';
import VerificationBenefitsSection from '@/components/sections/VerificationBenefitsSection';
import ValuePropositionSection from '@/components/sections/ValuePropositionSection';
import InstructorBenefits from '@/components/sections/InstructorBenefits';
import Categories from '@/components/sections/Categories';
import HowItWorksSection from '@/components/sections/HowItWorksSection';
import CTASection from '@/components/sections/CTASection';

export default function Home() {
  const [isInstructor, setIsInstructor] = useState(false);

  return (
    <div className="min-h-screen">
      <Header />
      <StickyCTABar />
      <main>
        {/* ヒーローセクションは常に表示（モード切り替えを含む） */}
        <HeroSection isInstructor={isInstructor} setIsInstructor={setIsInstructor} />
        
        {/* モードに応じてセクションを完全に切り替え */}
        <AnimatePresence mode="wait">
          {!isInstructor ? (
            // 🅰️ 生徒モード
            <motion.div
              key="student-sections"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <UseCasesSection />
              <Categories />
              <VerificationBenefitsSection />
              <ValuePropositionSection />
              <CTASection />
            </motion.div>
          ) : (
            // 🅱️ 先生モード
            <motion.div
              key="instructor-sections"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <InstructorBenefits />
              <HowItWorksSection />
              <CTASection />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
