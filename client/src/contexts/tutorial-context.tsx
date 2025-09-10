import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for the element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void; // Optional action to perform
  skip?: boolean; // Whether this step can be skipped
}

interface TutorialContextType {
  isActive: boolean;
  currentStep: number;
  steps: TutorialStep[];
  startTutorial: (steps: TutorialStep[]) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTutorial: () => void;
  skipStep: () => void;
  completeTutorial: () => void;
  hasCompletedTutorial: boolean;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const TUTORIAL_STORAGE_KEY = 'deploy-tutorial-completed';

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TutorialStep[]>([]);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    setHasCompletedTutorial(completed === 'true');
  }, []);

  const startTutorial = (tutorialSteps: TutorialStep[]) => {
    setSteps(tutorialSteps);
    setCurrentStep(0);
    setIsActive(true);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTutorial();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const skipStep = () => {
    const currentStepData = steps[currentStep];
    if (currentStepData?.skip !== false) {
      nextStep();
    }
  };

  const skipTutorial = () => {
    setIsActive(false);
    setCurrentStep(0);
    setSteps([]);
  };

  const completeTutorial = () => {
    setIsActive(false);
    setCurrentStep(0);
    setSteps([]);
    setHasCompletedTutorial(true);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
  };

  return (
    <TutorialContext.Provider value={{
      isActive,
      currentStep,
      steps,
      startTutorial,
      nextStep,
      previousStep,
      skipTutorial,
      skipStep,
      completeTutorial,
      hasCompletedTutorial
    }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}