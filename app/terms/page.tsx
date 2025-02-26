import Navbar from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function Terms() {
  return (
    <div className="min-h-screen bg-neutral-1">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-primary mb-8">Terms of Service</h1>
        
        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">1. Acceptance of Terms</h2>
            <p className="mb-4">
              By accessing and using MindlyQ's services, you agree to be bound by these Terms of Service
              and all applicable laws and regulations. If you do not agree with any of these terms, you
              are prohibited from using or accessing our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">2. Use License</h2>
            <p className="mb-4">
              Permission is granted to temporarily use MindlyQ's services for personal, non-commercial
              purposes only. This is the grant of a license, not a transfer of title.
            </p>
            <p className="mb-4">Under this license, you may not:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose</li>
              <li>Attempt to decompile or reverse engineer any software contained in MindlyQ</li>
              <li>Remove any copyright or other proprietary notations</li>
              <li>Transfer the materials to another person</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">3. User Account</h2>
            <p className="mb-4">
              To use certain features of MindlyQ, you must register for an account. You agree to:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly update any changes to your information</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">4. Service Modifications</h2>
            <p className="mb-4">
              MindlyQ reserves the right to modify or discontinue, temporarily or permanently, the
              service with or without notice. We shall not be liable to you or any third party for any
              modification, suspension, or discontinuance of the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">5. Privacy</h2>
            <p className="mb-4">
              Your use of MindlyQ is also governed by our Privacy Policy. Please review our Privacy
              Policy, which also governs the site and informs users of our data collection practices.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">6. Disclaimer</h2>
            <p className="mb-4">
              MindlyQ's services are provided "as is". We make no warranties, expressed or implied, and
              hereby disclaim and negate all other warranties including, without limitation, implied
              warranties of merchantability, fitness for a particular purpose, or non-infringement of
              intellectual property.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">7. Contact Information</h2>
            <p className="mb-4">
              If you have any questions about these Terms of Service, please contact us at:
              support@mindlyq.com
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
