import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-neutral-2 text-neutral-1 py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/#features" className="hover:text-highlight-1">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-highlight-1">
                  How it Works
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-highlight-1">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="hover:text-highlight-1">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-highlight-1">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-highlight-1">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="hover:text-highlight-1">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-highlight-1">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-highlight-1">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Connect</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="https://twitter.com/mindlyq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-highlight-1"
                >
                  Twitter
                </Link>
              </li>
              <li>
                <Link
                  href="https://linkedin.com/company/mindlyq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-highlight-1"
                >
                  LinkedIn
                </Link>
              </li>
              <li>
                <Link
                  href="https://instagram.com/mindlyq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-highlight-1"
                >
                  Instagram
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-700 text-center">
          <p>&copy; {new Date().getFullYear()} MindlyQ. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
