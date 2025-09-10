import { useEffect, useState } from 'react';

interface TutorialSpotlightProps {
  targetRect: DOMRect | null;
}

export function TutorialSpotlight({ targetRect }: TutorialSpotlightProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    setIsVisible(true);
  }, [targetRect]);

  if (!targetRect) {
    return (
      <div 
        className={`absolute inset-0 bg-black/50 transition-all duration-500 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />
    );
  }

  const spotlightStyle = {
    clipPath: `polygon(
      0% 0%, 
      0% 100%, 
      ${targetRect.left - 8}px 100%, 
      ${targetRect.left - 8}px ${targetRect.top - 8}px, 
      ${targetRect.right + 8}px ${targetRect.top - 8}px, 
      ${targetRect.right + 8}px ${targetRect.bottom + 8}px, 
      ${targetRect.left - 8}px ${targetRect.bottom + 8}px, 
      ${targetRect.left - 8}px 100%, 
      100% 100%, 
      100% 0%
    )`
  };

  return (
    <>
      {/* Dark overlay with cutout */}
      <div 
        className={`absolute inset-0 bg-black/50 transition-all duration-500 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={spotlightStyle}
      />
      
      {/* Animated highlight ring */}
      <div
        className={`absolute border-2 border-primary rounded-lg transition-all duration-500 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{
          left: targetRect.left - 8,
          top: targetRect.top - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
          boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
        }}
      >
        {/* Pulsing animation */}
        <div 
          className="absolute inset-0 border-2 border-primary rounded-lg animate-ping"
          style={{ animationDuration: '2s' }}
        />
      </div>
    </>
  );
}