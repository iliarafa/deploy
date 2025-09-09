import React, { createContext, useContext, useState, useEffect } from 'react';
import { type UserRole, type Permission, getUserPermissions, hasPermission } from '@shared/roles';

interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
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

  // Initialize user from localStorage or API
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // For demo purposes, we'll create a default admin user
        // In production, this would check for stored tokens/session
        const storedUser = localStorage.getItem('auth_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser({
            ...userData,
            permissions: getUserPermissions(userData.role, userData.permissions || [])
          });
        } else {
          // Create a default admin user for testing
          const defaultUser: User = {
            id: 1,
            username: 'admin',
            email: 'admin@buildsync.com',
            role: 'admin',
            permissions: getUserPermissions('admin'),
            isActive: true
          };
          setUser(defaultUser);
          localStorage.setItem('auth_user', JSON.stringify(defaultUser));
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
      
      // Mock login - in production, this would make an API call
      const mockUsers: Record<string, User> = {
        admin: {
          id: 1,
          username: 'admin',
          email: 'admin@buildsync.com',
          role: 'admin',
          permissions: getUserPermissions('admin'),
          isActive: true
        },
        manager: {
          id: 2,
          username: 'manager',
          email: 'manager@buildsync.com',
          role: 'project_manager',
          permissions: getUserPermissions('project_manager'),
          isActive: true
        },
        supervisor: {
          id: 3,
          username: 'supervisor',
          email: 'supervisor@buildsync.com',
          role: 'supervisor',
          permissions: getUserPermissions('supervisor'),
          isActive: true
        },
        worker: {
          id: 4,
          username: 'worker',
          email: 'worker@buildsync.com',
          role: 'worker',
          permissions: getUserPermissions('worker'),
          isActive: true
        },
        inspector: {
          id: 5,
          username: 'inspector',
          email: 'inspector@buildsync.com',
          role: 'inspector',
          permissions: getUserPermissions('inspector'),
          isActive: true
        },
        client: {
          id: 6,
          username: 'client',
          email: 'client@buildsync.com',
          role: 'client',
          permissions: getUserPermissions('client'),
          isActive: true
        }
      };

      const userData = mockUsers[username.toLowerCase()];
      if (!userData || password !== 'password') {
        throw new Error('Invalid credentials');
      }

      setUser(userData);
      localStorage.setItem('auth_user', JSON.stringify(userData));
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
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