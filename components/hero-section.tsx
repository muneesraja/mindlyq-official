'use client';

import { WhatsAppButton } from "./whatsapp-button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-20 pb-32">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-10 -right-10 w-72 h-72 bg-accent-2/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-highlight-2/10 rounded-full blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2 text-center lg:text-left">
            <h1 className="text-5xl md:text-6xl font-bold text-primary mb-6 leading-tight">
              Your <span className="text-accent-1">Smart</span> WhatsApp Assistant
            </h1>
            <p className="text-xl text-neutral-2 mb-8 max-w-2xl mx-auto lg:mx-0">
              Transform your WhatsApp into a powerful productivity tool with
              AI-powered reminders, content management, and smart organization.
            </p>
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
              <WhatsAppButton className="bg-highlight-1 hover:bg-highlight-2 text-white px-8 py-4 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                Start for Free
              </WhatsAppButton>
              <WhatsAppButton
                variant="outline"
                className="border-2 border-accent-1 text-accent-1 hover:bg-accent-1 hover:text-white px-8 py-4 text-lg rounded-full transition-all duration-300 transform hover:-translate-y-1"
              >
                Watch Demo
              </WhatsAppButton>
            </div>
            
            {/* Trust Indicators */}
            <div className="mt-12 flex flex-wrap justify-center lg:justify-start gap-8 items-center">
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-accent-2 border-2 border-white flex items-center justify-center text-white font-bold">
                      {i}
                    </div>
                  ))}
                </div>
                <p className="ml-3 text-neutral-2">
                  <span className="font-bold">1,000+</span> active users
                </p>
              </div>
              <div className="flex items-center">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} className="w-5 h-5 text-highlight-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="ml-2 text-neutral-2">
                  <span className="font-bold">4.9/5</span> rating
                </p>
              </div>
            </div>
          </div>
          
          <div className="lg:w-1/2 relative">
            <div className="relative z-10 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
              <div className="bg-accent-1 h-12 flex items-center px-4">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
              </div>
              <div className="p-4 bg-gray-50">
                <div className="flex items-center bg-white rounded-lg p-3 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-accent-2 flex items-center justify-center text-white font-bold mr-3">
                    M
                  </div>
                  <div className="flex-1">
                    <div className="bg-neutral-1 rounded-lg p-3 max-w-xs">
                      <p className="text-sm">Remind me to call mom tomorrow at 5pm</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-end mt-4">
                  <div className="flex-1 flex justify-end">
                    <div className="bg-accent-1/10 rounded-lg p-3 max-w-xs">
                      <p className="text-sm"> I'll remind you to call mom tomorrow at 5:00 PM</p>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-highlight-1 flex items-center justify-center text-white font-bold ml-3">
                    MQ
                  </div>
                </div>
                
                <div className="flex items-center mt-4">
                  <div className="w-12 h-12 rounded-full bg-accent-2 flex items-center justify-center text-white font-bold mr-3">
                    M
                  </div>
                  <div className="flex-1">
                    <div className="bg-neutral-1 rounded-lg p-3 max-w-xs">
                      <p className="text-sm">Save this article for later: https://example.com/ai-productivity</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-end mt-4">
                  <div className="flex-1 flex justify-end">
                    <div className="bg-accent-1/10 rounded-lg p-3 max-w-xs">
                      <p className="text-sm"> Saved article "AI Productivity Tips" to your reading list</p>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-highlight-1 flex items-center justify-center text-white font-bold ml-3">
                    MQ
                  </div>
                </div>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-accent-2/30 rounded-full blur-xl"></div>
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-highlight-2/20 rounded-full blur-xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
