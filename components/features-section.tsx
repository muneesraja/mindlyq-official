'use client';

import { WhatsAppButton } from "./whatsapp-button";

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-neutral-1/50 rounded-l-full z-0"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-primary mb-6">
            Powered by <span className="text-accent-1">Advanced AI</span>
          </h2>
          <p className="text-lg text-neutral-2">
            Our intelligent assistant understands natural language and adapts to your needs, making productivity effortless.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-b-4 border-accent-2 group">
            <div className="w-16 h-16 bg-accent-2/10 rounded-2xl mb-6 flex items-center justify-center group-hover:bg-accent-2 transition-colors duration-300">
              <svg
                className="w-8 h-8 text-accent-2 group-hover:text-white transition-colors duration-300"
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
            <h3 className="text-2xl font-bold text-primary mb-3 group-hover:text-accent-2 transition-colors duration-300">
              Smart Reminders
            </h3>
            <p className="text-neutral-2 mb-4">
              Create reminders naturally with AI that understands your needs and
              schedule. Never miss an important task again.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center">
                <svg className="w-5 h-5 text-accent-2 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Natural language processing</span>
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-accent-2 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Automatic timezone detection</span>
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-accent-2 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Recurring reminder support</span>
              </li>
            </ul>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-b-4 border-highlight-1 group">
            <div className="w-16 h-16 bg-highlight-1/10 rounded-2xl mb-6 flex items-center justify-center group-hover:bg-highlight-1 transition-colors duration-300">
              <svg
                className="w-8 h-8 text-highlight-1 group-hover:text-white transition-colors duration-300"
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
            <h3 className="text-2xl font-bold text-primary mb-3 group-hover:text-highlight-1 transition-colors duration-300">
              Content Management
            </h3>
            <p className="text-neutral-2 mb-4">
              Save and organize URLs, images, and notes directly through
              WhatsApp. Access your content anytime, anywhere.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center">
                <svg className="w-5 h-5 text-highlight-1 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">URL bookmarking</span>
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-highlight-1 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Image and file storage</span>
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-highlight-1 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Intelligent categorization</span>
              </li>
            </ul>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-b-4 border-accent-1 group">
            <div className="w-16 h-16 bg-accent-1/10 rounded-2xl mb-6 flex items-center justify-center group-hover:bg-accent-1 transition-colors duration-300">
              <svg
                className="w-8 h-8 text-accent-1 group-hover:text-white transition-colors duration-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-primary mb-3 group-hover:text-accent-1 transition-colors duration-300">
              Task Management
            </h3>
            <p className="text-neutral-2 mb-4">
              Organize your tasks and to-dos with intelligent prioritization and
              categorization. Stay on top of your responsibilities.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center">
                <svg className="w-5 h-5 text-accent-1 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Smart prioritization</span>
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-accent-1 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Task categorization</span>
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-accent-1 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Deadline tracking</span>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Feature Highlight */}
        <div className="mt-20 bg-gradient-to-r from-accent-1 to-accent-2 rounded-3xl overflow-hidden shadow-xl">
          <div className="flex flex-col lg:flex-row">
            <div className="lg:w-1/2 p-10 lg:p-16 flex flex-col justify-center">
              <h3 className="text-3xl font-bold text-white mb-6">
                Seamless WhatsApp Integration
              </h3>
              <p className="text-white/90 mb-8 text-lg">
                No new apps to download. MindlyQ works directly in your existing WhatsApp, making it incredibly easy to get started and use every day.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center text-white">
                  <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Works with your existing WhatsApp account</span>
                </li>
                <li className="flex items-center text-white">
                  <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>No additional apps or downloads required</span>
                </li>
                <li className="flex items-center text-white">
                  <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Secure and private communication</span>
                </li>
              </ul>
              <div className="mt-8">
                <WhatsAppButton className="bg-white text-accent-1 hover:bg-highlight-1 hover:text-white px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  Try It Now
                </WhatsAppButton>
              </div>
            </div>
            <div className="lg:w-1/2 p-10 flex items-center justify-center bg-white/10 backdrop-blur-sm">
              <div className="relative">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-white/20 p-4 transform rotate-3">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-accent-2 flex items-center justify-center text-white font-bold mr-3">
                      MQ
                    </div>
                    <div>
                      <h4 className="font-bold text-primary text-sm">MindlyQ Assistant</h4>
                      <p className="text-xs text-neutral-2">Online</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-accent-1/10 rounded-lg p-3 ml-12">
                      <p className="text-sm">How can I help you today?</p>
                    </div>
                    <div className="bg-neutral-1 rounded-lg p-3 mr-12">
                      <p className="text-sm">I need to organize my project tasks</p>
                    </div>
                    <div className="bg-accent-1/10 rounded-lg p-3 ml-12">
                      <p className="text-sm">I can help with that! Let's create a new project category. What's the name of your project?</p>
                    </div>
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
