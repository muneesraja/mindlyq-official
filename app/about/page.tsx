import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function About() {
  return (
    <div className="min-h-screen bg-neutral-1">
      <Navbar />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-primary mb-6">
            About MindlyQ
          </h1>
          <p className="text-xl text-neutral-2 mb-8">
            Transforming WhatsApp into your intelligent productivity companion
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="container mx-auto px-4 py-16 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-primary mb-6">Our Mission</h2>
          <p className="text-lg text-neutral-2 mb-8">
            At MindlyQ, we believe that productivity tools should be accessible where
            people already spend their time. That's why we've built an innovative
            WhatsApp bot that brings the power of AI-driven organization to the
            world's most popular messaging platform.
          </p>
          <p className="text-lg text-neutral-2">
            Our mission is to help people stay organized and productive without
            having to leave their preferred communication channel. By combining
            advanced AI with the simplicity of WhatsApp, we're making personal
            productivity more accessible than ever.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-primary mb-8">What Sets Us Apart</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-primary mb-4">
                AI-Powered Intelligence
              </h3>
              <p className="text-neutral-2">
                Our advanced AI understands natural language, making it effortless
                to set reminders and organize content just by chatting.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-primary mb-4">
                Seamless Integration
              </h3>
              <p className="text-neutral-2">
                No new apps to download or interfaces to learn. MindlyQ works right
                within WhatsApp, making it instantly familiar.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-primary mb-4">
                Smart Organization
              </h3>
              <p className="text-neutral-2">
                Automatically categorize and organize your content, making it easy
                to find what you need when you need it.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-primary mb-4">
                Privacy First
              </h3>
              <p className="text-neutral-2">
                Your data security is our priority. We use enterprise-grade
                encryption and follow strict privacy guidelines.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="container mx-auto px-4 py-16 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-primary mb-8 text-center">
            Our Values
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent-1 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-primary mb-2">
                Innovation
              </h3>
              <p className="text-neutral-2">
                We constantly push boundaries to create smarter solutions.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-highlight-1 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-primary mb-2">
                User-Centric
              </h3>
              <p className="text-neutral-2">
                Every feature is designed with our users in mind.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent-2 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-primary mb-2">
                Trust & Security
              </h3>
              <p className="text-neutral-2">
                We protect your data like it's our own.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-primary mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-neutral-2 mb-8">
            Join thousands of users who are already using MindlyQ to stay organized
            and productive.
          </p>
          <Button className="bg-highlight-1 hover:bg-highlight-2 text-white px-8 py-6 text-lg">
            Try MindlyQ Free
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
