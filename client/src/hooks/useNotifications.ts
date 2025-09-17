import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsClient } from '@/lib/websocket';
import { pushManager } from '@/lib/push-notifications';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

export function useNotifications() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    // Don't initialize if not authenticated or still loading
    if (!isAuthenticated || isLoading) return;
    if (initialized.current) return;
    initialized.current = true;

    // Initialize push notifications
    pushManager.init().then((success) => {
      if (success) {
        console.log('Push notifications initialized');
      }
    });

    // Connect WebSocket
    wsClient.connect();

    // Handle real-time task updates
    wsClient.on('task_created', (task) => {
      // Invalidate tasks query to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      
      // Show toast notification
      toast({
        title: 'New Task Created',
        description: `${task.title} assigned to ${task.assignedTo}`,
      });

      // Show push notification
      if (task.assignedTo) {
        pushManager.notifyTaskCreated(task.title, task.assignedTo);
      }
    });

    // Handle real-time material request updates
    wsClient.on('material_request_created', (request) => {
      // Invalidate material requests query to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/material-requests'] });
      
      // Show toast notification
      toast({
        title: 'New Material Request',
        description: `${request.materialType} requested`,
      });

      // Show push notification
      pushManager.notifyMaterialRequest(request.materialType);
    });

    // Cleanup on unmount
    return () => {
      wsClient.disconnect();
    };
  }, [queryClient, toast, isAuthenticated, isLoading]);

  return {
    requestNotificationPermission: () => pushManager.requestPermission(),
  };
}