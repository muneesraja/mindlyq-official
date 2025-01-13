'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const Navbar = () => {
  const pathname = usePathname();

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
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
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logos/light-mode.svg"
              alt="MindlyQ Logo"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          </Link>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/#features"
              onClick={(e) => scrollToSection(e, 'features')}
              className="text-gray-600 hover:text-primary transition-colors"
            >
              Features
            </Link>
            <Link 
              href="/#how-it-works"
              onClick={(e) => scrollToSection(e, 'how-it-works')}
              className="text-gray-600 hover:text-primary transition-colors"
            >
              How it Works
            </Link>
            <Link 
              href="/#pricing"
              onClick={(e) => scrollToSection(e, 'pricing')}
              className="text-gray-600 hover:text-primary transition-colors"
            >
              Pricing
            </Link>
            <Link 
              href="/#faq"
              onClick={(e) => scrollToSection(e, 'faq')}
              className="text-gray-600 hover:text-primary transition-colors"
            >
              FAQ
            </Link>
            <Link 
              href="/about"
              className="text-gray-600 hover:text-primary transition-colors"
            >
              About
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="https://wa.me/your-whatsapp-number"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-highlight-1 hover:bg-highlight-2 text-white px-6 py-2 rounded-lg transition-colors"
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
