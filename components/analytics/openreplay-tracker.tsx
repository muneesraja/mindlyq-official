'use client';

import { useEffect } from 'react';
import Tracker from '@openreplay/tracker';

export default function OpenReplayTracker() {
  useEffect(() => {
    // Only initialize the tracker on the client side and in production
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      const tracker = new Tracker({
        projectKey: "2hcFahB5yWiMBdJ1ut9J",
        // Optional: Add additional configuration options here
        // ingestPoint: 'custom.ingest.url', // Custom ingest URL if needed
        // respectDoNotTrack: true, // Respect Do Not Track browser setting
        // capturePerformance: true, // Capture performance metrics
      });
      
      tracker.start();
      
      console.log('OpenReplay tracker initialized');
    }
    
    return () => {
      // Clean up if necessary
    };
  }, []);

  // This component doesn't render anything
  return null;
}
