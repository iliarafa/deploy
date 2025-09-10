import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lock, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function PasswordChangeReminder() {
  const [dismissed, setDismissed] = useState(false);
  const { user } = useAuth();
  
  // Check if user is likely using a default password
  const isDefaultPassword = user && (
    user.username === 'admin' || 
    user.username === 'demo' || 
    user.username === 'test' ||
    user.username === 'manager' ||
    user.username === 'worker'
  );
  
  if (!isDefaultPassword || dismissed) {
    return null;
  }

  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50">
      <Lock className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-amber-800">
          For better security, consider changing your password in your profile settings.
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="text-amber-600 hover:text-amber-800"
          data-testid="dismiss-password-reminder"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}