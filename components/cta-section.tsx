'use client';

import { WhatsAppButton } from "./whatsapp-button";

export function CTASection() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-accent-2/10 to-highlight-2/10"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent-1/10 rounded-full blur-3xl"></div>
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-highlight-1/10 rounded-full blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden transform hover:scale-[1.02] transition-all duration-500">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
                Ready to Transform Your Productivity?
              </h2>
              <p className="text-lg text-neutral-2 mb-8">
                Join thousands of users who are already organizing their lives with
                MindlyQ. Start for free today!
              </p>
              <div className="space-y-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-accent-2/20 flex items-center justify-center mr-4">
                    <svg className="w-5 h-5 text-accent-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="font-medium">No credit card required</p>
                </div>
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-highlight-1/20 flex items-center justify-center mr-4">
                    <svg className="w-5 h-5 text-highlight-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="font-medium">Setup in under 30 seconds</p>
                </div>
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-accent-1/20 flex items-center justify-center mr-4">
                    <svg className="w-5 h-5 text-accent-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="font-medium">Cancel anytime</p>
                </div>
              </div>
              <div className="mt-8">
                <WhatsAppButton className="bg-highlight-1 hover:bg-highlight-2 text-white px-8 py-4 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 w-full md:w-auto">
                  Try MindlyQ Free
                </WhatsAppButton>
              </div>
            </div>
            <div className="md:w-1/2 bg-gradient-to-br from-accent-1 to-accent-2 p-8 md:p-12 flex items-center justify-center">
              <div className="relative">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg transform -rotate-2">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-highlight-1 flex items-center justify-center text-white font-bold mr-4">
                      MQ
                    </div>
                    <div>
                      <h3 className="font-bold text-primary">MindlyQ Assistant</h3>
                      <p className="text-sm text-neutral-2">Your personal productivity partner</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-accent-1 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm">Manage reminders effortlessly</p>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-accent-1 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm">Organize content and tasks</p>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-accent-1 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm">Boost your productivity</p>
                    </div>
                  </div>
                  <div className="mt-6 bg-accent-1/10 rounded-lg p-4">
                    <p className="text-sm italic text-neutral-2">
                      "MindlyQ has completely transformed how I manage my daily tasks and reminders. It's like having a personal assistant in my pocket!"
                    </p>
                    <p className="text-xs font-bold mt-2">— Sarah K., Product Manager</p>
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-highlight-2/30 rounded-full blur-xl -z-10"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
