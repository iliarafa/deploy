import { Request, Response, NextFunction } from 'express';
import { type UserRole, type Permission, hasPermission, getUserPermissions } from '@shared/roles';
import { storage } from './storage';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: UserRole;
        permissions: Permission[];
      };
    }
  }
}

// Mock authentication middleware - replace with your actual auth system
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // For demo purposes, we'll use a hardcoded user
    // In production, extract user ID from JWT token, session, etc.
    const userId = parseInt(req.headers['user-id'] as string) || 1;
    
    const user = await storage.getUser(userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    req.user = {
      id: user.id,
      role: user.role as UserRole,
      permissions: getUserPermissions(user.role as UserRole, user.permissions as Permission[])
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Authorization middleware factory
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!hasPermission(req.user.permissions, permission)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Role-based access middleware
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied',
        allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Helper middleware to check if user can access specific resource
export const canAccessResource = (resourceType: 'task' | 'material' | 'vacancy') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { role } = req.user;

    // Define access rules for each resource type
    const accessRules: Record<string, UserRole[]> = {
      task: ['admin', 'project_manager', 'supervisor', 'worker', 'inspector', 'client'],
      material: ['admin', 'project_manager', 'supervisor', 'worker'],
      vacancy: ['admin', 'project_manager']
    };

    const allowedRoles = accessRules[resourceType];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ 
        error: `Access denied to ${resourceType} resources`,
        userRole: role
      });
    }

    next();
  };
};

// Data filtering middleware - adds user context to request
export const addUserContext = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Add user context to request for data filtering
  req.query.userId = req.user.id.toString();
  req.query.userRole = req.user.role;

  next();
};