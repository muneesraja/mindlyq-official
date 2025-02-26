'use client';

import { WhatsAppButton } from "./whatsapp-button";

export function HeroSection() {
  const scrollToHowItWorks = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const howItWorksSection = document.getElementById('how-it-works');
    if (howItWorksSection) {
      howItWorksSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative overflow-hidden pt-20 pb-32">
      {/* Background Elements - Visible on all screens */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-10 -right-10 w-72 h-72 bg-accent-2/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-highlight-2/10 rounded-full blur-3xl"></div>
      </div>
      
      {/* Mobile-only Abstract Background - Positioned behind content */}
      <div className="lg:hidden absolute inset-0 z-0">
        {/* Abstract Shapes - Mobile Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent-1/10 via-highlight-1/10 to-accent-2/10"></div>
        
        {/* Floating Elements - Mobile Background */}
        <div className="absolute top-[10%] left-[15%] w-16 h-16 bg-accent-1/30 rounded-lg rotate-12 animate-float"></div>
        <div className="absolute top-[20%] right-[20%] w-20 h-20 bg-highlight-1/20 rounded-full animate-float-delay"></div>
        <div className="absolute bottom-[25%] left-[25%] w-24 h-24 bg-accent-2/20 rounded-xl rotate-45 animate-float-slow"></div>
        
        {/* WhatsApp-like Icons - Mobile Background */}
        <div className="absolute top-[40%] right-[30%] w-12 h-12 bg-white/70 rounded-full shadow-md flex items-center justify-center animate-pulse-slow">
          <svg className="w-6 h-6 text-accent-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        
        {/* Additional Mobile Icons */}
        <div className="absolute bottom-[40%] right-[25%] w-12 h-12 bg-white/70 rounded-full shadow-md flex items-center justify-center animate-pulse">
          <svg className="w-6 h-6 text-highlight-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        {/* Semi-transparent overlay to improve text readability on mobile */}
        <div className="absolute inset-0 bg-white/70"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Hero Content - Left Side */}
          <div className="lg:w-1/2 text-center lg:text-left relative z-10 lg:z-auto">
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
                onClick={scrollToHowItWorks}
                redirectToWhatsApp={false}
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
          
          {/* Creative Abstract Background Design - Right Side (Desktop Only) */}
          <div className="lg:w-1/2 relative hidden lg:block">
            {/* Abstract Shapes */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent-1/20 via-highlight-1/20 to-accent-2/20"></div>
            
            {/* Floating Elements */}
            <div className="absolute top-[10%] left-[15%] w-16 h-16 bg-accent-1/40 rounded-lg rotate-12 animate-float"></div>
            <div className="absolute top-[20%] right-[20%] w-20 h-20 bg-highlight-1/30 rounded-full animate-float-delay"></div>
            <div className="absolute bottom-[15%] left-[25%] w-24 h-24 bg-accent-2/30 rounded-xl rotate-45 animate-float-slow"></div>
            
            <div className="absolute bottom-[30%] left-[20%] w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center animate-pulse">
              <svg className="w-8 h-8 text-highlight-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <div className="absolute top-[60%] right-[15%] w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center animate-pulse-fast">
              <svg className="w-8 h-8 text-accent-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            
            {/* Connection Lines */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <line x1="25%" y1="40%" x2="45%" y2="65%" stroke="rgba(100, 100, 255, 0.2)" strokeWidth="2" strokeDasharray="5,5" />
              <line x1="75%" y1="35%" x2="55%" y2="65%" stroke="rgba(100, 100, 255, 0.2)" strokeWidth="2" strokeDasharray="5,5" />
              <line x1="30%" y1="70%" x2="70%" y2="25%" stroke="rgba(100, 100, 255, 0.1)" strokeWidth="2" strokeDasharray="5,5" />
            </svg>
            
            {/* WhatsApp Logo - Visible on both mobile and desktop */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white rounded-full shadow-xl flex items-center justify-center z-20">
              <svg className="w-12 h-12 text-accent-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-accent-2/30 rounded-full blur-xl"></div>
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-highlight-2/20 rounded-full blur-xl"></div>
          </div>
        </div>
      </div>
      
      {/* Add animation keyframes */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }
        @keyframes float-delay {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-20px) rotate(-5deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-10px) rotate(10deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        @keyframes pulse-fast {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delay {
          animation: float-delay 7s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        .animate-pulse {
          animation: pulse 4s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 5s ease-in-out infinite;
        }
        .animate-pulse-fast {
          animation: pulse-fast 3s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
