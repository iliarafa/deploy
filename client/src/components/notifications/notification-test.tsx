import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bell, Mail, Wifi, MessageCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { pushManager } from '@/lib/push-notifications';
import { wsClient } from '@/lib/websocket';
import { apiRequest } from '@/lib/queryClient';

export default function NotificationTest() {
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState('');
  const [testResults, setTestResults] = useState<{
    push: boolean | null;
    email: boolean | null;
    websocket: boolean | null;
    toast: boolean | null;
  }>({
    push: null,
    email: null,
    websocket: null,
    toast: null
  });
  const [testing, setTesting] = useState(false);

  const testPushNotification = async () => {
    try {
      const hasPermission = await pushManager.requestPermission();
      if (!hasPermission) {
        setTestResults(prev => ({ ...prev, push: false }));
        toast({
          title: "Push Notifications Failed",
          description: "Permission denied or not supported",
          variant: "destructive"
        });
        return;
      }

      await pushManager.notifyTaskCreated("Test Task", "Test User");
      setTestResults(prev => ({ ...prev, push: true }));
    } catch (error) {
      console.error('Push notification test failed:', error);
      setTestResults(prev => ({ ...prev, push: false }));
    }
  };

  const testEmailNotification = async () => {
    if (!testEmail) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to test",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await apiRequest('POST', '/api/test-email', {
        email: testEmail
      });
      
      setTestResults(prev => ({ ...prev, email: true }));
      toast({
        title: "Email Test Sent",
        description: `Test email sent to ${testEmail}`,
      });
    } catch (error) {
      console.error('Email test failed:', error);
      setTestResults(prev => ({ ...prev, email: false }));
      toast({
        title: "Email Test Failed",
        description: "Failed to send test email",
        variant: "destructive"
      });
    }
  };

  const testWebSocket = async () => {
    try {
      // Test WebSocket connection by sending a ping
      if (!wsClient) {
        setTestResults(prev => ({ ...prev, websocket: false }));
        return;
      }

      // Listen for pong response
      const timeoutId = setTimeout(() => {
        setTestResults(prev => ({ ...prev, websocket: false }));
      }, 5000);

      wsClient.on('pong', () => {
        clearTimeout(timeoutId);
        setTestResults(prev => ({ ...prev, websocket: true }));
        wsClient.off('pong', () => {});
      });

      // Send ping
      wsClient.connect();
      
    } catch (error) {
      console.error('WebSocket test failed:', error);
      setTestResults(prev => ({ ...prev, websocket: false }));
    }
  };

  const testToastNotification = () => {
    toast({
      title: "Test Toast Notification",
      description: "If you can see this, toast notifications are working!",
    });
    setTestResults(prev => ({ ...prev, toast: true }));
  };

  const runAllTests = async () => {
    setTesting(true);
    setTestResults({ push: null, email: null, websocket: null, toast: null });

    // Run tests sequentially with small delays
    await testPushNotification();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testEmailNotification();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testWebSocket();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    testToastNotification();
    
    setTesting(false);
  };

  const getStatusIcon = (status: boolean | null) => {
    if (status === null) return <AlertCircle className="h-4 w-4 text-gray-400" />;
    if (status === true) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusText = (status: boolean | null) => {
    if (status === null) return 'Not tested';
    if (status === true) return 'Working';
    return 'Failed';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification System Test
        </CardTitle>
        <CardDescription>
          Test all notification systems to ensure they're working properly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Test Input */}
        <div className="space-y-2">
          <Label htmlFor="test-email">Email for Testing</Label>
          <Input
            id="test-email"
            type="email"
            placeholder="your.email@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            data-testid="input-test-email"
          />
        </div>

        {/* Test Results */}
        <div className="space-y-3">
          <h4 className="font-medium">Test Results</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="text-sm">Push Notifications</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(testResults.push)}
                <span className="text-sm">{getStatusText(testResults.push)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="text-sm">Email Notifications</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(testResults.email)}
                <span className="text-sm">{getStatusText(testResults.email)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                <span className="text-sm">Real-time Updates</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(testResults.websocket)}
                <span className="text-sm">{getStatusText(testResults.websocket)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">Toast Messages</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(testResults.toast)}
                <span className="text-sm">{getStatusText(testResults.toast)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={runAllTests} 
            disabled={testing || !testEmail}
            data-testid="button-run-all-tests"
          >
            {testing ? 'Testing...' : 'Run All Tests'}
          </Button>
          <Button 
            variant="outline" 
            onClick={testPushNotification}
            data-testid="button-test-push"
          >
            Test Push
          </Button>
          <Button 
            variant="outline" 
            onClick={testEmailNotification}
            disabled={!testEmail}
            data-testid="button-test-email"
          >
            Test Email
          </Button>
          <Button 
            variant="outline" 
            onClick={testWebSocket}
            data-testid="button-test-websocket"
          >
            Test WebSocket
          </Button>
          <Button 
            variant="outline" 
            onClick={testToastNotification}
            data-testid="button-test-toast"
          >
            Test Toast
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}