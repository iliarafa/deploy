import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, CheckCircle } from 'lucide-react';
import { pushManager } from '@/lib/push-notifications';

export default function NotificationSetup() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    } else {
      setIsSupported(false);
    }
  }, []);

  const requestPermission = async () => {
    const granted = await pushManager.requestPermission();
    if (granted) {
      setPermission('granted');
    } else {
      setPermission('denied');
    }
  };

  const testNotification = async () => {
    await pushManager.notifyTaskCreated('Test Task', 'You');
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Your browser doesn't support push notifications.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (permission === 'granted') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Notifications Enabled
          </CardTitle>
          <CardDescription>
            You'll receive notifications for new tasks and material requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={testNotification} variant="outline" size="sm">
            Test Notification
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Enable Notifications
        </CardTitle>
        <CardDescription>
          Stay updated with real-time notifications for tasks and material requests.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={requestPermission}
          disabled={permission === 'denied'}
          data-testid="button-enable-notifications"
        >
          {permission === 'denied' ? 'Permission Denied' : 'Enable Notifications'}
        </Button>
      </CardContent>
    </Card>
  );
}