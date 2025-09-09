import React, { createContext, useContext, useState, useEffect } from 'react';
import { type UserRole, type Permission, getUserPermissions, hasPermission } from '@shared/roles';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  isApproved: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  canAccessRoute: (route: string) => boolean;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize user from localStorage and verify session
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem('auth_user');
        const sessionToken = localStorage.getItem('auth_session');
        
        if (storedUser && sessionToken) {
          // Verify session is still valid by making an API call
          try {
            const response = await fetch('/api/auth/user', {
              method: 'GET',
              headers: {
                'session-token': sessionToken,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const userData = await response.json();
              const userWithPermissions = {
                ...userData,
                permissions: getUserPermissions(userData.role as UserRole, userData.permissions || [])
              };
              setUser(userWithPermissions);
            } else {
              // Session invalid, clear storage
              localStorage.removeItem('auth_user');
              localStorage.removeItem('auth_session');
            }
          } catch (error) {
            console.error('Session verification failed:', error);
            localStorage.removeItem('auth_user');
            localStorage.removeItem('auth_session');
          }
        }
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest('POST', '/api/auth/login', {
        username,
        password
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      
      // Add permissions to user data
      const userWithPermissions = {
        ...data.user,
        permissions: getUserPermissions(data.user.role as UserRole, data.user.permissions || [])
      };
      
      // Store auth data
      localStorage.setItem('auth_user', JSON.stringify(userWithPermissions));
      localStorage.setItem('auth_session', data.sessionToken);
      
      setUser(userWithPermissions);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const sessionToken = localStorage.getItem('auth_session');
      if (sessionToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'session-token': sessionToken,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_session');
      setUser(null);
    }
  };

  const checkPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return hasPermission(user.permissions, permission);
  };

  const canAccessRoute = (route: string): boolean => {
    if (!user) return false;

    // Route-based access control
    const routePermissions: Record<string, Permission[]> = {
      '/tasks': ['view_all_tasks', 'view_assigned_tasks'],
      '/materials': ['view_all_materials', 'view_own_materials'],
      '/inspections': ['view_inspections', 'conduct_inspection'],
      '/vacancies': ['view_vacancies', 'manage_vacancies'],
      '/reports': ['view_reports'],
      '/users': ['view_users', 'manage_users']
    };

    const requiredPermissions = routePermissions[route] || [];
    return requiredPermissions.some(permission => hasPermission(user.permissions, permission));
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    hasPermission: checkPermission,
    canAccessRoute,
    setUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};