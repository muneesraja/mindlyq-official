import { BrainCircuit } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <BrainCircuit className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to MindlyQ
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Your AI-powered WhatsApp assistant for smart reminders and content organization
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Smart Reminders</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Create reminders naturally using AI-powered language processing
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Content Management</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Save and organize URLs, images, and notes with automatic categorization
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Collaboration</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Share reminders with friends and work together efficiently
              </p>
            </div>
          </div>

          <div className="mt-16">
            <h2 className="text-2xl font-semibold mb-8">Get Started</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
              Send a message to our WhatsApp number:
            </p>
            <div className="bg-primary text-primary-foreground font-mono p-4 rounded-lg inline-block">
              +1 (555) 0123-4567
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}