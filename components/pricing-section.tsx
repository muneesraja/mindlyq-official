'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/whatsapp-button";

export function PricingSection() {
  return (
    <section id="pricing" className="relative py-24 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-accent-2/5 to-highlight-1/5"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent-1/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-24 w-80 h-80 bg-highlight-2/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Simple, Usage-Based Pricing
          </h2>
          <p className="text-lg text-neutral-2 max-w-2xl mx-auto">
            Choose the plan that works best for you. Start free and scale as you grow.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden transform hover:scale-[1.02] transition-all duration-300 group">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-primary">Starter</h3>
                <div className="w-12 h-12 rounded-full bg-accent-1/10 flex items-center justify-center text-accent-1 group-hover:bg-accent-1 group-hover:text-white transition-all duration-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-bold text-accent-1 mb-2">Free</p>
              <p className="text-neutral-2 mb-8">Perfect for getting started</p>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-neutral-2">
                  <div className="w-6 h-6 rounded-full bg-accent-1/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-accent-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Up to 50 reminders/month</span>
                </li>
                <li className="flex items-center gap-3 text-neutral-2">
                  <div className="w-6 h-6 rounded-full bg-accent-1/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-accent-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Basic content management</span>
                </li>
                <li className="flex items-center gap-3 text-neutral-2">
                  <div className="w-6 h-6 rounded-full bg-accent-1/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-accent-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Personal dashboard</span>
                </li>
              </ul>
            </div>
            
            <div className="px-8 pb-8">
              <WhatsAppButton className="w-full bg-accent-1 hover:bg-accent-2 text-white py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
                Get Started
              </WhatsAppButton>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform hover:scale-[1.02] transition-all duration-300 group relative border-2 border-accent-1 z-10">
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 bg-accent-1 text-white px-6 py-1 rounded-full text-sm font-semibold shadow-lg">
              Most Popular
            </div>
            
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-primary">Pro</h3>
                <div className="w-12 h-12 rounded-full bg-highlight-1/10 flex items-center justify-center text-highlight-1 group-hover:bg-highlight-1 group-hover:text-white transition-all duration-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-bold text-highlight-1 mb-2">$9.99<span className="text-lg font-normal text-neutral-2">/mo</span></p>
              <p className="text-neutral-2 mb-8">For power users</p>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-neutral-2">
                  <div className="w-6 h-6 rounded-full bg-highlight-1/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-highlight-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Unlimited reminders</span>
                </li>
                <li className="flex items-center gap-3 text-neutral-2">
                  <div className="w-6 h-6 rounded-full bg-highlight-1/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-highlight-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Advanced AI categorization</span>
                </li>
                <li className="flex items-center gap-3 text-neutral-2">
                  <div className="w-6 h-6 rounded-full bg-highlight-1/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-highlight-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Google Drive integration</span>
                </li>
              </ul>
            </div>
            
            <div className="px-8 pb-8">
              <WhatsAppButton className="w-full bg-highlight-1 hover:bg-highlight-2 text-white py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
                Start Free Trial
              </WhatsAppButton>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden transform hover:scale-[1.02] transition-all duration-300 group">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-primary">Enterprise</h3>
                <div className="w-12 h-12 rounded-full bg-accent-2/10 flex items-center justify-center text-accent-2 group-hover:bg-accent-2 group-hover:text-white transition-all duration-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-bold text-accent-2 mb-2">Custom</p>
              <p className="text-neutral-2 mb-8">For teams and businesses</p>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-neutral-2">
                  <div className="w-6 h-6 rounded-full bg-accent-2/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-accent-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-center gap-3 text-neutral-2">
                  <div className="w-6 h-6 rounded-full bg-accent-2/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-accent-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Custom integrations</span>
                </li>
                <li className="flex items-center gap-3 text-neutral-2">
                  <div className="w-6 h-6 rounded-full bg-accent-2/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-accent-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Priority support</span>
                </li>
              </ul>
            </div>
            
            <div className="px-8 pb-8">
              <Button
                variant="outline"
                className="w-full border-accent-2 text-accent-2 hover:bg-accent-2 hover:text-white py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
              >
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
        
        <div className="mt-16 text-center">
          <p className="text-neutral-2 mb-6">
            Need a custom solution? <Link href="#" className="text-accent-1 hover:text-accent-2 font-medium">Contact our sales team</Link>
          </p>
          <div className="flex flex-wrap justify-center gap-4 items-center">
            <div className="flex items-center gap-2 text-neutral-2">
              <svg className="w-5 h-5 text-highlight-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>30-day money-back guarantee</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-2">
              <svg className="w-5 h-5 text-highlight-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-2">
              <svg className="w-5 h-5 text-highlight-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
