import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { FAQSection } from "@/components/faq-section";

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-1">
      <Navbar />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-primary mb-6">
            Your Smart WhatsApp Assistant
          </h1>
          <p className="text-xl text-neutral-2 mb-8 max-w-2xl mx-auto">
            Transform your WhatsApp into a powerful productivity tool with
            AI-powered reminders, content management, and smart organization.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button className="bg-highlight-1 hover:bg-highlight-2 text-white px-8 py-6 text-lg">
              Start for Free
            </Button>
            <Button
              variant="outline"
              className="border-accent-1 text-accent-1 hover:bg-accent-1 hover:text-white px-8 py-6 text-lg"
            >
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20 bg-white">
        <h2 className="text-3xl md:text-4xl font-bold text-primary text-center mb-12">
          Powered by Advanced AI
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="p-6 rounded-lg border border-neutral-1 hover:border-accent-1 transition-colors">
            <div className="w-12 h-12 bg-accent-2 rounded-lg mb-4 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-primary mb-2">
              Smart Reminders
            </h3>
            <p className="text-neutral-2">
              Create reminders naturally with AI that understands your needs and
              schedule.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-lg border border-neutral-1 hover:border-accent-1 transition-colors">
            <div className="w-12 h-12 bg-highlight-1 rounded-lg mb-4 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-primary mb-2">
              Content Management
            </h3>
            <p className="text-neutral-2">
              Save and organize URLs, images, and notes directly through
              WhatsApp.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-lg border border-neutral-1 hover:border-accent-1 transition-colors">
            <div className="w-12 h-12 bg-accent-1 rounded-lg mb-4 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-primary mb-2">
              Collaborative
            </h3>
            <p className="text-neutral-2">
              Set reminders for friends and work together seamlessly.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="container mx-auto px-4 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-primary text-center mb-12">
          How MindlyQ Works
        </h2>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-accent-1 text-white flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold text-primary mb-2">
                  Say "Hi" to Start
                </h3>
                <p className="text-neutral-2">
                  Begin your journey with a simple greeting to our WhatsApp bot.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-accent-2 text-white flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold text-primary mb-2">
                  Set Reminders Naturally
                </h3>
                <p className="text-neutral-2">
                  Use natural language to create reminders - just like talking
                  to a friend.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-highlight-1 text-white flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold text-primary mb-2">
                  Share & Organize
                </h3>
                <p className="text-neutral-2">
                  Send content directly to MindlyQ and let AI categorize it for
                  you.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <div className="aspect-square relative bg-neutral-1 rounded-xl overflow-hidden">
              {/* Add a demo screenshot or animation here */}
              <div className="absolute inset-0 flex items-center justify-center text-neutral-2">
                Demo Animation
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-primary text-center mb-4">
          Simple, Usage-Based Pricing
        </h2>
        <p className="text-center text-neutral-2 mb-12 max-w-2xl mx-auto">
          Choose the plan that works best for you. Start free and scale as you
          grow.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className="border border-neutral-1 rounded-lg p-6 bg-white">
            <h3 className="text-xl font-bold text-primary mb-2">Starter</h3>
            <p className="text-3xl font-bold text-accent-1 mb-4">Free</p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-neutral-2">
                <svg
                  className="w-5 h-5 text-accent-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Up to 50 reminders/month
              </li>
              <li className="flex items-center gap-2 text-neutral-2">
                <svg
                  className="w-5 h-5 text-accent-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Basic content management
              </li>
              <li className="flex items-center gap-2 text-neutral-2">
                <svg
                  className="w-5 h-5 text-accent-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Personal dashboard
              </li>
            </ul>
            <Button className="w-full bg-accent-1 hover:bg-accent-2 text-white">
              Get Started
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="border-2 border-accent-1 rounded-lg p-6 bg-white relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-accent-1 text-white px-4 py-1 rounded-full text-sm">
              Most Popular
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">Pro</h3>
            <p className="text-3xl font-bold text-accent-1 mb-4">$9.99/mo</p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-neutral-2">
                <svg
                  className="w-5 h-5 text-accent-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Unlimited reminders
              </li>
              <li className="flex items-center gap-2 text-neutral-2">
                <svg
                  className="w-5 h-5 text-accent-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Advanced AI categorization
              </li>
              <li className="flex items-center gap-2 text-neutral-2">
                <svg
                  className="w-5 h-5 text-accent-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Google Drive integration
              </li>
            </ul>
            <Button className="w-full bg-highlight-1 hover:bg-highlight-2 text-white">
              Start Free Trial
            </Button>
          </div>

          {/* Enterprise Plan */}
          <div className="border border-neutral-1 rounded-lg p-6 bg-white">
            <h3 className="text-xl font-bold text-primary mb-2">Enterprise</h3>
            <p className="text-3xl font-bold text-accent-1 mb-4">Custom</p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-neutral-2">
                <svg
                  className="w-5 h-5 text-accent-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Everything in Pro
              </li>
              <li className="flex items-center gap-2 text-neutral-2">
                <svg
                  className="w-5 h-5 text-accent-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Custom integrations
              </li>
              <li className="flex items-center gap-2 text-neutral-2">
                <svg
                  className="w-5 h-5 text-accent-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Priority support
              </li>
            </ul>
            <Button
              variant="outline"
              className="w-full border-accent-1 text-accent-1 hover:bg-accent-1 hover:text-white"
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-primary rounded-2xl p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-neutral-1 mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already organizing their lives with
            MindlyQ.
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
