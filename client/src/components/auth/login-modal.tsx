import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ open, onOpenChange }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please enter both username and password",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      await login(username, password);
      onOpenChange(false);
      setUsername('');
      setPassword('');
      toast({
        title: "Success",
        description: "Logged in successfully"
      });
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Invalid credentials. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (role: string) => {
    setUsername(role);
    setPassword('password');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" data-testid="modal-login">
        <DialogHeader>
          <DialogTitle>Login to BuildSync</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              data-testid="input-username"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              data-testid="input-password"
            />
          </div>

          <div className="space-y-2">
            <Label>Quick Login (Demo)</Label>
            <Select onValueChange={handleQuickLogin}>
              <SelectTrigger data-testid="select-quick-login">
                <SelectValue placeholder="Select a role to demo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin" data-testid="option-admin">Admin - Full Access</SelectItem>
                <SelectItem value="manager" data-testid="option-manager">Project Manager - Manage Projects</SelectItem>
                <SelectItem value="supervisor" data-testid="option-supervisor">Supervisor - Create Tasks</SelectItem>
                <SelectItem value="worker" data-testid="option-worker">Worker - View Assigned Tasks</SelectItem>
                <SelectItem value="inspector" data-testid="option-inspector">Inspector - Conduct Inspections</SelectItem>
                <SelectItem value="client" data-testid="option-client">Client - View Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
              data-testid="button-login"
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          </div>
        </form>

        <div className="text-sm text-gray-500 mt-4">
          <p><strong>Demo Credentials:</strong></p>
          <p>Username: admin, manager, supervisor, worker, inspector, client</p>
          <p>Password: password</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};