'use client';

import { useEffect } from 'react';

export default function TawkToChat() {
  useEffect(() => {
    // @ts-ignore
    var Tawk_API = Tawk_API || {};
    // @ts-ignore
    var Tawk_LoadStart = new Date();

    const s1 = document.createElement("script");
    const s0 = document.getElementsByTagName("script")[0];
    
    s1.async = true;
    s1.src = 'https://embed.tawk.to/675988bc49e2fd8dfef65127/1ieqrs8fj';
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    
    s0.parentNode?.insertBefore(s1, s0);

    return () => {
      // Cleanup if needed
      s1.remove();
    };
  }, []);

  return null;
}
