
import React, { useEffect } from 'react';

const YahaviAI = () => {
  useEffect(() => {
    // Replace with your actual Yahavi AI Widget Script
    const script = document.createElement('script');
    script.src = 'https://cdn.yahavi.ai/widget.js';
    script.async = true;
    script.setAttribute('data-id', 'YOUR_YAHAVI_ID');
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return null; // The script handles the UI injection
};

export default YahaviAI;
