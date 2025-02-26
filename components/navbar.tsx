'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const Navbar = () => {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (pathname === '/') {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      window.location.href = `/#${sectionId}`;
    }
  };

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-white/90 shadow-md backdrop-blur-md py-3" : "bg-transparent py-5"
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <Image
              src="/images/logos/light-mode.svg"
              alt="MindlyQ Logo"
              width={140}
              height={45}
              className="h-10 w-auto transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden flex items-center" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6 text-primary" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          
          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/#features"
              onClick={(e) => scrollToSection(e, 'features')}
              className="text-primary hover:text-accent-1 font-medium transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-accent-1 after:transition-all hover:after:w-full"
            >
              Features
            </Link>
            <Link 
              href="/#how-it-works"
              onClick={(e) => scrollToSection(e, 'how-it-works')}
              className="text-primary hover:text-accent-1 font-medium transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-accent-1 after:transition-all hover:after:w-full"
            >
              How it Works
            </Link>
            <Link 
              href="/#pricing"
              onClick={(e) => scrollToSection(e, 'pricing')}
              className="text-primary hover:text-accent-1 font-medium transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-accent-1 after:transition-all hover:after:w-full"
            >
              Pricing
            </Link>
            <Link 
              href="/#faq"
              onClick={(e) => scrollToSection(e, 'faq')}
              className="text-primary hover:text-accent-1 font-medium transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-accent-1 after:transition-all hover:after:w-full"
            >
              FAQ
            </Link>
          </div>

          {/* CTA Button */}
          <div className="hidden md:flex items-center">
            <Link
              href="https://wa.me/916385685487?text=Hi%2C%20What%20can%20you%20do%3F"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-highlight-1 hover:bg-highlight-2 text-white px-6 py-2.5 rounded-full font-medium transition-all duration-300 hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Try Now
            </Link>
          </div>
        </div>
        
        {/* Mobile menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0"
        }`}>
          <div className="flex flex-col space-y-4 pt-2 pb-4">
            <Link 
              href="/#features"
              onClick={(e) => scrollToSection(e, 'features')}
              className="text-primary hover:text-accent-1 font-medium py-2 transition-colors"
            >
              Features
            </Link>
            <Link 
              href="/#how-it-works"
              onClick={(e) => scrollToSection(e, 'how-it-works')}
              className="text-primary hover:text-accent-1 font-medium py-2 transition-colors"
            >
              How it Works
            </Link>
            <Link 
              href="/#pricing"
              onClick={(e) => scrollToSection(e, 'pricing')}
              className="text-primary hover:text-accent-1 font-medium py-2 transition-colors"
            >
              Pricing
            </Link>
            <Link 
              href="/#faq"
              onClick={(e) => scrollToSection(e, 'faq')}
              className="text-primary hover:text-accent-1 font-medium py-2 transition-colors"
            >
              FAQ
            </Link>
            <Link 
              href="/about"
              className="text-primary hover:text-accent-1 font-medium py-2 transition-colors"
            >
              About
            </Link>
            <Link
              href="https://wa.me/916385685487?text=Hi%2C%20What%20can%20you%20do%3F"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-highlight-1 hover:bg-highlight-2 text-white px-6 py-2.5 rounded-full font-medium transition-colors text-center mt-2"
            >
              Try Now
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
