import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lock, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function PasswordChangeReminder() {
  const [dismissed, setDismissed] = useState(false);
  const { user } = useAuth();
  
  // Check dismissal state from localStorage on mount
  useEffect(() => {
    if (user?.id) {
      const dismissalKey = `password-reminder-dismissed-${user.id}`;
      const isDismissed = localStorage.getItem(dismissalKey) === 'true';
      setDismissed(isDismissed);
    }
  }, [user?.id]);
  
  const handleDismiss = () => {
    if (user?.id) {
      const dismissalKey = `password-reminder-dismissed-${user.id}`;
      localStorage.setItem(dismissalKey, 'true');
      setDismissed(true);
    }
  };
  
  // Check if user must change password (server-driven)
  const shouldShowReminder = user && user.mustChangePassword && !dismissed;
  
  if (!shouldShowReminder) {
    return null;
  }

  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50">
      <Lock className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-amber-800">
          You must change your password for security reasons. Please update it in your profile settings.
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-amber-600 hover:text-amber-800"
          data-testid="dismiss-password-reminder"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}