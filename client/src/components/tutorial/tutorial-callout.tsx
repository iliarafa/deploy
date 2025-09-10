import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTutorial, type TutorialStep } from '@/contexts/tutorial-context';
import { ChevronLeft, ChevronRight, X, FastForward } from 'lucide-react';

interface TutorialCalloutProps {
  step: TutorialStep;
  stepNumber: number;
  totalSteps: number;
  targetRect: DOMRect | null;
}

export function TutorialCallout({ step, stepNumber, totalSteps, targetRect }: TutorialCalloutProps) {
  const { nextStep, previousStep, skipTutorial, skipStep } = useTutorial();
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setIsVisible(true);
    
    // Calculate callout position
    if (targetRect) {
      const calloutWidth = 300;
      const calloutHeight = 200;
      const padding = 20;
      
      let top = targetRect.bottom + padding;
      let left = targetRect.left + (targetRect.width / 2) - (calloutWidth / 2);
      
      // Adjust for screen boundaries
      if (left < padding) left = padding;
      if (left + calloutWidth > window.innerWidth - padding) {
        left = window.innerWidth - calloutWidth - padding;
      }
      
      if (top + calloutHeight > window.innerHeight - padding) {
        top = targetRect.top - calloutHeight - padding;
      }
      
      setPosition({ top, left });
    } else {
      // Center on screen when no target
      setPosition({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - 150
      });
    }
  }, [targetRect]);

  // Execute step action if provided
  useEffect(() => {
    if (step.action) {
      const timer = setTimeout(() => {
        step.action!();
      }, 500); // Delay to allow animation
      
      return () => clearTimeout(timer);
    }
  }, [step]);

  return (
    <Card 
      className={`fixed w-80 max-w-[90vw] shadow-2xl border-2 border-primary/20 pointer-events-auto
        transition-all duration-500 transform ${
          isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
      style={{
        top: position.top,
        left: position.left,
        zIndex: 60
      }}
      data-testid={`tutorial-callout-${step.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            Step {stepNumber} of {totalSteps}
          </Badge>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={skipTutorial}
            className="h-6 w-6 p-0"
            data-testid="button-close-tutorial"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardTitle className="text-lg">{step.title}</CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {step.content}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={previousStep}
              disabled={stepNumber === 1}
              data-testid="button-previous-step"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            
            {step.skip !== false && (
              <Button
                variant="ghost"
                size="sm"
                onClick={skipStep}
                data-testid="button-skip-step"
              >
                <FastForward className="h-4 w-4 mr-1" />
                Skip
              </Button>
            )}
          </div>
          
          <Button
            onClick={nextStep}
            size="sm"
            data-testid="button-next-step"
          >
            {stepNumber === totalSteps ? 'Finish' : 'Next'}
            {stepNumber !== totalSteps && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}