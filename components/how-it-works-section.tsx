'use client';

import { ChatDemo } from "./chat-demo";

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-24 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-highlight-1/5 to-accent-2/5"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-accent-1/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-highlight-2/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            How MindlyQ Works
          </h2>
          <p className="text-lg text-neutral-2 max-w-2xl mx-auto">
            Get started in seconds and transform how you manage your tasks and reminders
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="flex items-start gap-6 group">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-accent-1 text-white flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform duration-300">
                  1
                </div>
                <div className="absolute h-full w-0.5 bg-accent-1/30 top-14 left-1/2 transform -translate-x-1/2"></div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 w-full transform group-hover:-translate-y-1">
                <h3 className="text-xl font-semibold text-primary mb-3">
                  Say "Hi" to Start
                </h3>
                <p className="text-neutral-2">
                  Begin your journey with a simple greeting to our WhatsApp bot. No complicated setup or downloads required.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-6 group">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-accent-2 text-white flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform duration-300">
                  2
                </div>
                <div className="absolute h-full w-0.5 bg-accent-2/30 top-14 left-1/2 transform -translate-x-1/2"></div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 w-full transform group-hover:-translate-y-1">
                <h3 className="text-xl font-semibold text-primary mb-3">
                  Set Reminders Naturally
                </h3>
                <p className="text-neutral-2">
                  Use natural language to create reminders - just like talking to a friend. Our AI understands your intent.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-6 group">
              <div>
                <div className="w-14 h-14 rounded-full bg-highlight-1 text-white flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform duration-300">
                  3
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 w-full transform group-hover:-translate-y-1">
                <h3 className="text-xl font-semibold text-primary mb-3">
                  Share & Organize
                </h3>
                <p className="text-neutral-2">
                  Send content directly to MindlyQ and let AI categorize it for you. Access your organized content anytime.
                </p>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <ChatDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
