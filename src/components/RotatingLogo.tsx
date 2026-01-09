"use client";

import { useState, useEffect } from 'react';

const logos = [
  '/TRANSITION/8.png',
  '/TRANSITION/TL white logo-01.png',
  '/TRANSITION/10.png',
];

interface RotatingLogoProps {
  className?: string;
  height?: string;
}

export function RotatingLogo({ className = '', height = 'h-8' }: RotatingLogoProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out current logo
      setOpacity(0);
      
      // After fade out, change to next logo and fade in
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % logos.length);
        setDisplayIndex((prevIndex) => (prevIndex + 1) % logos.length);
        setOpacity(1);
      }, 500); // Half of transition duration (1000ms / 2)
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className={`relative ${height} w-auto flex items-center justify-center ${className}`} 
      style={{ minWidth: '120px', minHeight: '32px' }}
    >
      <img
        key={displayIndex} // Force re-render when index changes
        src={logos[displayIndex]}
        alt={`Logo ${displayIndex + 1}`}
        className={`${height} w-auto object-contain transition-opacity duration-1000 ease-in-out`}
        style={{ 
          opacity: opacity,
          position: 'relative',
          zIndex: 1
        }}
      />
    </div>
  );
}
