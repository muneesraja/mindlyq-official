import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-neutral-1">
      <Navbar />
      
      {/* Content */}
      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-primary mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg max-w-none text-neutral-2">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">Introduction</h2>
            <p>
              At MindlyQ, we take your privacy seriously. This Privacy Policy explains how we collect,
              use, disclose, and safeguard your information when you use our WhatsApp bot and related services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">Information We Collect</h2>
            <h3 className="text-xl font-semibold text-primary mb-2">1. Personal Information</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>WhatsApp phone number</li>
              <li>Profile information you provide</li>
              <li>Communication preferences</li>
            </ul>

            <h3 className="text-xl font-semibold text-primary mb-2">2. Usage Information</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Interaction with our bot</li>
              <li>Reminders and content you create</li>
              <li>Features you use</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">How We Use Your Information</h2>
            <ul className="list-disc pl-6">
              <li>To provide and maintain our service</li>
              <li>To notify you about changes to our service</li>
              <li>To provide customer support</li>
              <li>To gather analysis or valuable information to improve our service</li>
              <li>To monitor the usage of our service</li>
              <li>To detect, prevent and address technical issues</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">Data Security</h2>
            <p>
              We implement appropriate technical and organizational security measures to protect your
              personal information. However, please note that no method of transmission over the
              internet or electronic storage is 100% secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">Third-Party Services</h2>
            <p>
              We may employ third-party companies and individuals to facilitate our service, provide
              service-related services, or assist us in analyzing how our service is used. These
              third parties have access to your personal information only to perform these tasks on
              our behalf and are obligated not to disclose or use it for any other purpose.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Request transfer of your data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:{" "}
              <a href="mailto:privacy@mindlyq.com" className="text-accent-1 hover:underline">
                privacy@mindlyq.com
              </a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
