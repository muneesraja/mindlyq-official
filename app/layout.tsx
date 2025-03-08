import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import TawkToChat from '@/components/tawk-to';
import Script from 'next/script';
import OpenReplayTracker from '@/components/analytics/openreplay-tracker';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MindlyQ | AI-Powered WhatsApp Assistant for Productivity & Organization',
  description: 'Transform your WhatsApp into a powerful productivity tool with MindlyQ - the intelligent AI assistant that manages reminders, organizes content, and simplifies your digital life.',
  keywords: 'WhatsApp assistant, AI productivity tool, WhatsApp reminder bot, WhatsApp AI, task management, digital organization, WhatsApp automation, AI chatbot, productivity assistant, smart reminders',
  authors: [{ name: 'MindlyQ Team' }],
  creator: 'MindlyQ',
  publisher: 'MindlyQ',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://mindlyq.com',
    siteName: 'MindlyQ',
    title: 'MindlyQ | AI-Powered WhatsApp Assistant for Productivity & Organization',
    description: 'Transform your WhatsApp into a powerful productivity tool with MindlyQ - the intelligent AI assistant that manages reminders, organizes content, and simplifies your digital life.',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'MindlyQ - Your Smart WhatsApp Assistant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MindlyQ | AI-Powered WhatsApp Assistant for Productivity',
    description: 'Transform your WhatsApp into a powerful productivity tool with MindlyQ - the intelligent AI assistant that manages reminders, organizes content, and simplifies your digital life.',
    images: ['/images/twitter-image.jpg'],
    creator: '@mindlyq',
  },
  alternates: {
    canonical: 'https://mindlyq.com',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      {
        url: '/images/favicon/16x16.svg',
        sizes: '16x16',
        type: 'image/svg+xml',
      },
      {
        url: '/images/favicon/32x32.svg',
        sizes: '32x32',
        type: 'image/svg+xml',
      },
      {
        url: '/images/favicon/48x48.svg',
        sizes: '48x48',
        type: 'image/svg+xml',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Small devices and fallback */}
        <link
          rel="icon"
          type="image/svg+xml"
          href="/images/favicon/16x16.svg"
          sizes="16x16"
        />
        {/* Standard size for most devices */}
        <link
          rel="icon"
          type="image/svg+xml"
          href="/images/favicon/32x32.svg"
          sizes="32x32"
        />
        {/* High-DPI displays */}
        <link
          rel="icon"
          type="image/svg+xml"
          href="/images/favicon/48x48.svg"
          sizes="48x48"
        />
        
        {/* Canonical Tag */}
        <link rel="canonical" href="https://mindlyq.com" />
        
        {/* Viewport Tag */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* Schema.org Structured Data */}
        <Script
          id="schema-software-application"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "MindlyQ",
              "applicationCategory": "ProductivityApplication",
              "operatingSystem": "WhatsApp",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "description": "MindlyQ is an AI-powered WhatsApp assistant that helps you manage reminders, organize content, and simplify your digital life.",
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "256"
              },
              "featureList": "AI-powered reminders, content management, smart organization, automated responses",
              "screenshot": "https://mindlyq.com/images/screenshots/app-interface.jpg",
              "softwareVersion": "1.0"
            })
          }}
        />
        
        <Script
          id="schema-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "MindlyQ",
              "url": "https://mindlyq.com",
              "logo": "https://mindlyq.com/images/logos/light-mode.svg",
              "sameAs": [
                "https://twitter.com/mindlyq",
                "https://www.facebook.com/mindlyq",
                "https://www.linkedin.com/company/mindlyq"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+91-6385685487",
                "contactType": "customer service",
                "availableLanguage": ["English"]
              }
            })
          }}
        />
        
        <Script
          id="schema-faq"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "What is MindlyQ?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "MindlyQ is an AI-powered WhatsApp assistant that helps you manage reminders, organize content, and simplify your digital life using advanced AI technology."
                  }
                },
                {
                  "@type": "Question",
                  "name": "How do I get started with MindlyQ?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Getting started with MindlyQ is easy! Simply click the 'Start for Free' button on our website, and you'll be guided through a simple setup process to connect MindlyQ to your WhatsApp account."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Is MindlyQ free to use?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes, MindlyQ offers a free plan that includes basic features. We also offer premium plans with advanced features for users who need more functionality."
                  }
                }
              ]
            })
          }}
        />
        {/* Google Analytics */}
        <Script 
          src="https://www.googletagmanager.com/gtag/js?id=G-97N1K65354" 
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-97N1K65354');
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <OpenReplayTracker />
        {children}
        <TawkToChat />
      </body>
    </html>
  );
}