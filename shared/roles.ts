// Role-based access control definitions
export type UserRole = 'admin' | 'project_manager' | 'supervisor' | 'worker' | 'inspector' | 'client';

export type Permission = 
  // Task permissions
  | 'create_task' 
  | 'edit_task' 
  | 'delete_task' 
  | 'view_all_tasks' 
  | 'view_assigned_tasks'
  | 'assign_tasks'
  
  // Material permissions
  | 'create_material_request' 
  | 'approve_material_request' 
  | 'view_all_materials' 
  | 'view_own_materials'
  
  // Inspection permissions
  | 'create_inspection' 
  | 'conduct_inspection' 
  | 'view_inspections'
  | 'schedule_inspection'
  
  // User management
  | 'manage_users' 
  | 'view_users'
  
  // Vacancy permissions
  | 'manage_vacancies' 
  | 'view_vacancies'
  
  // Communication permissions
  | 'send_notifications' 
  | 'view_communications'
  
  // Reports and analytics
  | 'view_reports' 
  | 'generate_reports' 
  | 'view_analytics'
  
  // System permissions
  | 'manage_system_settings';

// Default permissions for each role
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Full access to everything
    'create_task', 'edit_task', 'delete_task', 'view_all_tasks', 'assign_tasks',
    'create_material_request', 'approve_material_request', 'view_all_materials',
    'create_inspection', 'conduct_inspection', 'view_inspections', 'schedule_inspection',
    'manage_users', 'view_users',
    'manage_vacancies', 'view_vacancies',
    'send_notifications', 'view_communications',
    'view_reports', 'generate_reports', 'view_analytics',
    'manage_system_settings'
  ],
  
  project_manager: [
    // Task management
    'create_task', 'edit_task', 'delete_task', 'view_all_tasks', 'assign_tasks',
    // Material management  
    'create_material_request', 'approve_material_request', 'view_all_materials',
    // Inspection management
    'create_inspection', 'schedule_inspection', 'view_inspections',
    // User viewing
    'view_users',
    // Vacancy management
    'manage_vacancies', 'view_vacancies',
    // Communications
    'send_notifications', 'view_communications',
    // Reports
    'view_reports', 'generate_reports', 'view_analytics'
  ],
  
  supervisor: [
    // Task management
    'create_task', 'edit_task', 'view_all_tasks', 'assign_tasks',
    // Material requests
    'create_material_request', 'view_all_materials',
    // Inspections
    'create_inspection', 'schedule_inspection', 'view_inspections',
    // Communications
    'send_notifications', 'view_communications',
    // Limited reports
    'view_reports'
  ],
  
  worker: [
    // Limited task access
    'view_assigned_tasks',
    // Can request materials
    'create_material_request', 'view_own_materials',
    // Communications
    'view_communications'
  ],
  
  inspector: [
    // Inspection focused
    'conduct_inspection', 'view_inspections',
    // Can view related tasks
    'view_assigned_tasks',
    // Communications
    'view_communications',
    // Limited reports
    'view_reports'
  ],
  
  client: [
    // Read-only access
    'view_assigned_tasks', // Only project-related tasks
    'view_communications',
    'view_reports' // Basic progress reports
  ]
};

// Helper functions for role management
export function getUserPermissions(role: UserRole, customPermissions: Permission[] = []): Permission[] {
  const defaultPermissions = ROLE_PERMISSIONS[role] || [];
  return Array.from(new Set([...defaultPermissions, ...customPermissions]));
}

export function hasPermission(userPermissions: Permission[], requiredPermission: Permission): boolean {
  return userPermissions.includes(requiredPermission);
}

export function canAccessRoute(userRole: UserRole, route: string, customPermissions: Permission[] = []): boolean {
  const permissions = getUserPermissions(userRole, customPermissions);
  
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
  return requiredPermissions.some(permission => permissions.includes(permission));
}

// Role hierarchy for permission inheritance
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 6,
  project_manager: 5,
  supervisor: 4,
  inspector: 3,
  worker: 2,
  client: 1
};

export function isHigherRole(userRole: UserRole, compareRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[compareRole];
}