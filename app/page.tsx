"use client"
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navbar";
import { Footer } from "@/components/footer";
import { FAQSection } from "@/components/faq-section";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { HeroSection } from "@/components/hero-section";
import { FeaturesSection } from "@/components/features-section";
import { HowItWorksSection } from "@/components/how-it-works-section";
import { PricingSection } from "@/components/pricing-section";
import { CTASection } from "@/components/cta-section";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-1 to-white">
      <Navbar />

      {/* Hero Section */}
      <HeroSection />

      {/* Features Section */}
      <FeaturesSection />

      {/* How MindlyQ Works */}
      <HowItWorksSection />

      {/* Pricing Section */}
      <PricingSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* CTA Section */}
      <CTASection />

      <Footer />
    </div>
  );
}
