import { useEffect, useState, useRef } from 'react';
import { useTutorial } from '@/contexts/tutorial-context';
import { TutorialSpotlight } from './tutorial-spotlight';
import { TutorialCallout } from './tutorial-callout';

export function TutorialOverlay() {
  const { isActive, currentStep, steps } = useTutorial();
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isActive || !steps[currentStep]) return;

    const step = steps[currentStep];
    if (!step.target) {
      setTargetElement(null);
      setTargetRect(null);
      return;
    }

    // Find the target element
    const element = document.querySelector(step.target) as HTMLElement;
    if (element) {
      setTargetElement(element);
      
      // Get element position
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);

      // Scroll element into view smoothly
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }
  }, [isActive, currentStep, steps]);

  if (!isActive || !steps[currentStep]) {
    return null;
  }

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Dark overlay with spotlight cutout */}
      <TutorialSpotlight targetRect={targetRect} />
      
      {/* Tutorial callout */}
      <TutorialCallout
        step={step}
        stepNumber={currentStep + 1}
        totalSteps={steps.length}
        targetRect={targetRect}
      />
    </div>
  );
}