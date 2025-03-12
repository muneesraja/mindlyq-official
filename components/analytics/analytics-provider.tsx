'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import Tracker from '@openreplay/tracker';

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only initialize OpenReplay on the client side and in production
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      try {
        const tracker = new Tracker({
          projectKey: "2hcFahB5yWiMBdJ1ut9J",
          // Optional: Add additional configuration options here
          respectDoNotTrack: true, // Respect Do Not Track browser setting
        });
        
        tracker.start();
        console.log('OpenReplay tracker initialized');
      } catch (error) {
        console.error('Error initializing OpenReplay tracker:', error);
      }
    }
  }, []);

  return (
    <>
      {/* Google Analytics - Using Next.js Script component for proper loading */}
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
      
      {children}
    </>
  );
}
