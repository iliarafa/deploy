import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pbkdf2Sync } from "crypto";

// Password verification and hashing utilities
function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const verifyHash = pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
  return hash === verifyHash;
}

function hashPassword(password: string): string {
  const { randomBytes } = require('crypto');
  const salt = randomBytes(32).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

// Date normalization utility for API boundary - ensures storage gets proper Date|null
function normalizeVacancyDates(data: any) {
  const result = { ...data };
  if (result.startDate !== undefined) {
    result.startDate = result.startDate ? new Date(result.startDate) : null;
  }
  if (result.endDate !== undefined) {
    result.endDate = result.endDate ? new Date(result.endDate) : null;
  }
  return result;
}

import { 
  insertTaskSchema, 
  insertMaterialRequestSchema, 
  insertCommunicationSchema,
  insertUserRegistrationRequestSchema,
  reviewRegistrationRequestSchema,
  updateUserSchema,
  insertUserSchema,
  changePasswordSchema,
  insertColabMessageSchema,
  insertVacancySchema,
  insertIssueSchema,
  updateNavPrefsSchema,
  updateUserSettingsSchema
} from "@shared/schema";
import { z } from "zod";
import { wsManager } from "./websocket";
import { sendTaskNotification, sendMaterialRequestNotification, sendEmail, sendTaskStatusChangeNotification } from "./email";
import { 
  authenticate, 
  requirePermission, 
  requireRole, 
  canAccessResource, 
  addUserContext,
  enforcePasswordChange
} from "./auth-middleware";
import { type UserRole } from "@shared/roles";
import { type NavShortcutId } from "@shared/schema";

// Role-based navigation shortcuts configuration
function getShortcutsForRole(role: UserRole): NavShortcutId[] {
  const roleShortcuts: Record<UserRole, NavShortcutId[]> = {
    worker: ["log", "issues", "colab", "calendar"],
    project_manager: ["tasks", "materials", "issues", "colab"],
    admin: ["tasks", "materials", "issues", "admin"],
    supervisor: ["tasks", "materials", "issues", "calendar"],
    inspector: ["tasks", "materials", "issues", "calendar"],
    client: ["tasks", "calendar", "issues", "colab"]
  };
  
  return roleShortcuts[role] || [];
}

export async function registerRoutes(app: Express): Promise<Server> {
  

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Get user by username
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Check if user is approved and active
      if (!user.isApproved) {
        return res.status(401).json({ message: "Account pending approval. Please contact an administrator." });
      }
      
      if (!user.isActive) {
        return res.status(401).json({ message: "Account has been deactivated. Please contact an administrator." });
      }
      
      // Verify password using proper verification
      const isValidPassword = verifyPassword(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Create session
      const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const session = await storage.createSession(user.id, sessionExpiry);
      
      // Update last login
      await storage.updateUser(user.id, { lastLogin: new Date() });
      
      // Remove password from response
      const { password: _, ...safeUser } = user;
      
      res.json({
        user: safeUser,
        sessionToken: session.sessionToken
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", authenticate, async (req, res) => {
    try {
      const sessionToken = req.headers['session-token'] as string;
      if (sessionToken) {
        await storage.deleteSession(sessionToken);
      }
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get("/api/auth/user", authenticate, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user information" });
    }
  });

  // Password change route (accessible even when mustChangePassword=true)
  app.put("/api/auth/change-password", authenticate, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const validatedData = changePasswordSchema.parse(req.body);
      
      // Get current user to verify password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValidPassword = verifyPassword(validatedData.currentPassword, user.password);

      if (!isValidPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password and update user
      const hashedNewPassword = hashPassword(validatedData.newPassword);
      const updatedUser = await storage.updateUserPassword(userId, hashedNewPassword);

      const { password, ...safeUser } = updatedUser;
      res.json({ 
        message: "Password changed successfully",
        user: safeUser
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Change password error:", error);
        res.status(500).json({ message: "Failed to change password" });
      }
    }
  });
  
  // User registration routes
  app.post("/api/register", async (req, res) => {
    try {
      const validatedData = insertUserRegistrationRequestSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      const registrationRequest = await storage.createRegistrationRequest(validatedData);
      
      // Send notification to admins about new registration
      try {
        wsManager.broadcast({ 
          type: "registration_request", 
          request: registrationRequest 
        });
      } catch (notifError) {
        console.log("Registration notification failed:", notifError);
      }
      
      res.status(201).json({ 
        message: "Registration request submitted successfully. Please wait for admin approval.",
        requestId: registrationRequest.id
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Failed to submit registration request" });
      }
    }
  });

  // Admin routes for user management
  app.get("/api/admin/registration-requests", authenticate, enforcePasswordChange, requireRole('admin'), async (req, res) => {
    try {
      const requests = await storage.getRegistrationRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching registration requests:", error);
      res.status(500).json({ message: "Failed to fetch registration requests" });
    }
  });

  app.put("/api/admin/registration-requests/:id/review", authenticate, enforcePasswordChange, requireRole('admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      const validatedData = reviewRegistrationRequestSchema.parse(req.body);
      const reviewedRequest = await storage.reviewRegistrationRequest(id, userId, validatedData);
      
      // Send real-time notification
      try {
        wsManager.broadcast({ 
          type: "registration_reviewed", 
          request: reviewedRequest 
        });
      } catch (notifError) {
        console.log("Review notification failed:", notifError);
      }
      
      res.json(reviewedRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Review error:", error);
        res.status(500).json({ message: "Failed to review registration request" });
      }
    }
  });

  app.get("/api/admin/users", authenticate, enforcePasswordChange, requireRole('admin'), async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove passwords from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/admin/users/:id", authenticate, enforcePasswordChange, requireRole('admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = updateUserSchema.parse(req.body);
      
      const updatedUser = await storage.updateUser(id, validatedData);
      const { password, ...safeUser } = updatedUser;
      
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Update user error:", error);
        res.status(500).json({ message: "Failed to update user" });
      }
    }
  });

  app.delete("/api/admin/users/:id", authenticate, enforcePasswordChange, requireRole('admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deactivateUser(id);
      res.json({ message: "User deactivated successfully" });
    } catch (error) {
      console.error("Deactivate user error:", error);
      res.status(500).json({ message: "Failed to deactivate user" });
    }
  });

  app.post("/api/admin/users", authenticate, enforcePasswordChange, requireRole('admin'), async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      // Validate the incoming user data
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Create the user with admin-specified settings
      const newUser = await storage.createUser(validatedData);
      
      // If specified, approve the user immediately and set the creator as approver
      if (req.body.isApproved === true) {
        const updatedUser = await storage.approveUser(newUser.id, userId, validatedData.role || 'worker');
        // Remove password from response
        const { password, ...safeUser } = updatedUser;
        
        // Send real-time notification
        try {
          wsManager.broadcast({ 
            type: "user_created", 
            user: safeUser 
          });
        } catch (notifError) {
          console.log("User creation notification failed:", notifError);
        }
        
        return res.status(201).json(safeUser);
      }
      
      // Send real-time notification
      try {
        wsManager.broadcast({ 
          type: "user_created", 
          user: newUser 
        });
      } catch (notifError) {
        console.log("User creation notification failed:", notifError);
      }
      
      // Remove password from response
      const { password, ...safeUser } = newUser;
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Create user error:", error);
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  app.get("/api/users/profile", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Profile error:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  app.put("/api/users/profile", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      // Users can only update their own basic profile info (not role/permissions/security flags)
      const allowedUpdates = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
        birthDate: req.body.birthDate ? new Date(req.body.birthDate) : null,
        location: req.body.location
      };
      
      // Remove any security-related fields that users shouldn't be able to change
      delete req.body.mustChangePassword;
      delete req.body.role;
      delete req.body.permissions;
      delete req.body.isActive;
      delete req.body.isApproved;
      delete req.body.password;
      delete req.body.passwordLastChangedAt;
      
      const updatedUser = await storage.updateUser(userId, allowedUpdates);
      const { password, ...safeUser } = updatedUser;
      
      res.json(safeUser);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Navigation preferences endpoints
  app.get("/api/me/nav-preferences", authenticate, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      // Storage already returns { navShortcuts: NavShortcutId[] }
      const result = await storage.getUserNavPrefs(userId);
      res.json(result);
    } catch (error) {
      console.error("Get navigation preferences error:", error);
      res.status(500).json({ message: "Failed to get navigation preferences" });
    }
  });

  app.patch("/api/me/nav-preferences", authenticate, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      // Validate request body
      const validation = updateNavPrefsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid navigation preferences",
          errors: validation.error.errors 
        });
      }

      const { navShortcuts } = validation.data;
      if (!navShortcuts) {
        return res.status(400).json({ message: "Navigation shortcuts are required" });
      }

      // Get user to check role for filtering
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Role-based filtering and 4-item limit - server-side validation
      const allowedShortcuts = getShortcutsForRole(user.role as UserRole);
      const filteredShortcuts = navShortcuts
        .filter(shortcut => allowedShortcuts.includes(shortcut))
        .slice(0, 4); // Enforce 4-item limit
      
      // Remove duplicates
      const uniqueShortcuts = Array.from(new Set(filteredShortcuts));

      // Update navigation preferences - storage returns { navShortcuts: NavShortcutId[] }
      const result = await storage.updateUserNavPrefs(userId, uniqueShortcuts);
      res.json(result);
    } catch (error) {
      console.error("Update navigation preferences error:", error);
      res.status(500).json({ message: "Failed to update navigation preferences" });
    }
  });

  // User settings routes
  app.get("/api/me/settings", authenticate, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      const settings = await storage.ensureUserSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error("Get user settings error:", error);
      res.status(500).json({ message: "Failed to get user settings" });
    }
  });

  app.patch("/api/me/settings", authenticate, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      // Validate request body
      const validation = updateUserSettingsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid user settings",
          errors: validation.error.errors 
        });
      }

      let processedData = { ...validation.data };

      // Apply role-based filtering for navigation shortcuts if being updated
      if (processedData.navShortcuts) {
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Role-based filtering and 4-item limit - server-side validation
        const allowedShortcuts = getShortcutsForRole(user.role as UserRole);
        const filteredShortcuts = processedData.navShortcuts
          .filter(shortcut => allowedShortcuts.includes(shortcut))
          .slice(0, 4); // Enforce 4-item limit
        
        // Remove duplicates
        processedData.navShortcuts = Array.from(new Set(filteredShortcuts));
      }

      const updatedSettings = await storage.updateUserSettings(userId, processedData);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Update user settings error:", error);
      res.status(500).json({ message: "Failed to update user settings" });
    }
  });

  // Users endpoint for task assignment (accessible by users with task permissions)
  app.get("/api/users", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove passwords and return only essential user info for task assignment
      const assignableUsers = users.map(({ password, ...user }) => ({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }));
      res.json(assignableUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Task routes with authorization
  app.get("/api/tasks", authenticate, enforcePasswordChange, canAccessResource('task'), addUserContext, async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const userRole = req.query.userRole as UserRole;
      const tasks = await storage.getTasks(userId, userRole);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  // Worker tasks endpoint - get tasks assigned to a specific worker
  app.get("/api/worker-tasks/:username", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const { username } = req.params;
      const currentUserId = req.user?.id;
      
      if (!currentUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Get current user info to check permissions
      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Workers can only access their own tasks
      if (currentUser.role === 'worker' && currentUser.username !== username) {
        return res.status(403).json({ message: "Access denied. You can only view your own tasks." });
      }
      
      // Admins and managers can view any worker's tasks
      if (!['admin', 'project_manager'].includes(currentUser.role) && currentUser.username !== username) {
        return res.status(403).json({ message: "Access denied." });
      }
      
      const tasks = await storage.getWorkerTasks(username);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching worker tasks:", error);
      res.status(500).json({ message: "Failed to fetch worker tasks" });
    }
  });

  app.get("/api/tasks/date-range", authenticate, enforcePasswordChange, canAccessResource('task'), addUserContext, async (req, res) => {
    try {
      const { startDate, endDate, userId, userRole } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const tasks = await storage.getTasksByDateRange(
        new Date(startDate as string),
        new Date(endDate as string),
        userId ? parseInt(userId as string) : undefined,
        userRole as UserRole
      );
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks by date range" });
    }
  });

  app.post("/api/tasks", authenticate, enforcePasswordChange, requirePermission('create_task'), async (req, res) => {
    try {
      // Convert date fields from strings to Date objects if needed
      const taskData = {
        ...req.body,
        startDate: new Date(req.body.startDate),
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
      };
      
      // Auto-assign tasks to the worker who creates them if no assignee is specified
      if (!taskData.assignedTo && req.user?.role === 'worker') {
        const creator = await storage.getUser(req.user.id);
        if (creator) {
          taskData.assignedTo = creator.username;
        }
      }
      
      const validatedData = insertTaskSchema.parse(taskData);
      const task = await storage.createTask(validatedData);
      
      // Send real-time notification
      wsManager.notifyTaskCreated(task);
      
      // Send email notification if assignedTo is provided
      if (task.assignedTo) {
        // For now, we'll use the assignedTo name to construct email
        // In production, you'd want to store team member emails in a database
        const teamEmails: { [key: string]: string } = {
          'German': 'german@company.com',
          'Marcelo': 'marcelo@company.com', 
          'Luis C': 'luisc@company.com',
          'Jose': 'jose@company.com',
          'Miguel': 'miguel@company.com',
          'Luis G': 'luisg@company.com'
        };
        
        const assignedEmail = teamEmails[task.assignedTo];
        if (assignedEmail) {
          await sendTaskNotification(assignedEmail, task.title, 'System');
        }
      }
      
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", authenticate, enforcePasswordChange, requirePermission('edit_task'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTaskSchema.partial().parse(req.body);
      
      // Get original task to check for status changes
      const originalTask = await storage.getTask(id);
      if (!originalTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const task = await storage.updateTask(id, validatedData);
      
      // Check if status changed to "in-progress" by a worker
      if (
        validatedData.status && 
        validatedData.status === "in-progress" && 
        originalTask.status !== "in-progress" &&
        req.user?.role === "worker"
      ) {
        try {
          // Get the current user's details for notification
          const currentUser = await storage.getUser(req.user.id);
          const workerName = currentUser?.username || currentUser?.firstName || 'Unknown Worker';
          
          // Get admin and project manager users for notifications
          const notificationUsers = await storage.getUsersByRole(['admin', 'project_manager']);
          const notificationEmails = notificationUsers
            .filter(user => user.email) // Only users with email addresses
            .map(user => user.email!); // Non-null assertion since we filtered
          
          if (notificationEmails.length > 0) {
            // Send email notifications
            await sendTaskStatusChangeNotification(
              notificationEmails,
              task.title,
              task.id,
              "in-progress",
              workerName
            );
            
            // Send WebSocket notification for real-time updates
            wsManager.broadcast({
              type: 'task_status_change',
              data: {
                taskId: task.id,
                taskTitle: task.title,
                newStatus: "in-progress",
                workerName: workerName,
                oldStatus: originalTask.status
              }
            });
          }
        } catch (notificationError) {
          // Log notification error but don't fail the task update
          console.error('Failed to send task status notification:', notificationError);
        }
      }
      
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", authenticate, enforcePasswordChange, requirePermission('delete_task'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTask(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Recurring task routes
  app.get("/api/tasks/recurring", authenticate, enforcePasswordChange, requirePermission('view_all_tasks'), async (req, res) => {
    try {
      const recurringTasks = await storage.getRecurringTasks();
      res.json(recurringTasks);
    } catch (error) {
      console.error("Get recurring tasks error:", error);
      res.status(500).json({ message: "Failed to fetch recurring tasks" });
    }
  });

  app.get("/api/tasks/recurring/:id/instances", authenticate, enforcePasswordChange, requirePermission('view_all_tasks'), async (req, res) => {
    try {
      const parentTaskId = parseInt(req.params.id);
      const instances = await storage.getTasksByParent(parentTaskId);
      res.json(instances);
    } catch (error) {
      console.error("Get recurring task instances error:", error);
      res.status(500).json({ message: "Failed to fetch recurring task instances" });
    }
  });

  app.post("/api/tasks/recurring/generate", authenticate, enforcePasswordChange, requirePermission('create_task'), async (req, res) => {
    try {
      const generatedTasks = await storage.generateRecurringTaskInstances();
      
      // Send notifications for each generated task
      for (const task of generatedTasks) {
        try {
          if (task.assignedTo) {
            await sendTaskNotification(task.title, task.assignedTo, "New recurring task created");
          }
          
          // Send real-time notification
          wsManager.broadcast({
            type: 'task_created',
            data: {
              taskId: task.id,
              taskTitle: task.title,
              assignedTo: task.assignedTo,
              isRecurring: true
            }
          });
        } catch (notificationError) {
          console.error('Failed to send recurring task notification:', notificationError);
        }
      }
      
      res.json({ 
        message: `Generated ${generatedTasks.length} recurring task instances`,
        tasks: generatedTasks 
      });
    } catch (error) {
      console.error("Generate recurring tasks error:", error);
      res.status(500).json({ message: "Failed to generate recurring tasks" });
    }
  });

  // Material request routes with authorization
  app.get("/api/material-requests", authenticate, enforcePasswordChange, canAccessResource('material'), addUserContext, async (req, res) => {
    try {
      // Use authenticated user's context for security, not query parameters
      const userId = req.user?.id;
      const userRole = req.user?.role as UserRole;
      
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      const requests = await storage.getMaterialRequests(userId, userRole);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch material requests" });
    }
  });

  app.get("/api/material-requests/:id", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.id;
      const userRole = req.user?.role as UserRole;
      
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      const request = await storage.getMaterialRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Material request not found" });
      }
      
      // Admin and project managers can access any request
      if (userRole === 'admin' || userRole === 'project_manager') {
        return res.json(request);
      }
      
      // Workers can only access their own requests
      if (userRole === 'worker' && request.userId === userId) {
        return res.json(request);
      }
      
      // Other roles or unauthorized access
      return res.status(403).json({ message: "Access denied. You can only view your own material requests." });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch material request" });
    }
  });

  app.post("/api/material-requests", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      // Convert deliveryDate from string to Date object if needed
      const requestData = {
        ...req.body,
        deliveryDate: new Date(req.body.deliveryDate)
      };
      
      // Remove userId from request body to prevent client-side manipulation (security)
      delete requestData.userId;
      
      const validatedData = insertMaterialRequestSchema.parse(requestData);
      const request = await storage.createMaterialRequest(validatedData, userId);
      
      // Send real-time notification
      wsManager.notifyMaterialRequestCreated(request);
      
      // Send email notification to all team members
      const teamEmails = [
        'german@company.com',
        'marcelo@company.com', 
        'luisc@company.com',
        'jose@company.com',
        'miguel@company.com',
        'luisg@company.com'
      ];
      await sendMaterialRequestNotification(teamEmails, request.materialType, 'System');
      
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid material request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create material request" });
    }
  });

  app.put("/api/material-requests/:id", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertMaterialRequestSchema.partial().parse(req.body);
      const request = await storage.updateMaterialRequest(id, validatedData);
      res.json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid material request data", errors: error.errors });
      }
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Material request not found" });
      }
      res.status(500).json({ message: "Failed to update material request" });
    }
  });

  app.delete("/api/material-requests/:id", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.id;
      const user = req.user;
      
      if (!userId || !user) {
        return res.status(401).json({ message: "User authentication required" });
      }
      
      await storage.deleteMaterialRequest(id, userId, user.role as UserRole);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("Access denied")) {
        return res.status(403).json({ message: error.message });
      }
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Material request not found" });
      }
      res.status(500).json({ message: "Failed to delete material request" });
    }
  });

  // Communication routes
  app.get("/api/communications", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const communications = await storage.getCommunications();
      res.json(communications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch communications" });
    }
  });

  app.get("/api/communications/task/:taskId", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const communications = await storage.getCommunicationsByTask(taskId);
      res.json(communications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch communications" });
    }
  });

  app.post("/api/communications", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const validatedData = insertCommunicationSchema.parse(req.body);
      const communication = await storage.createCommunication(validatedData);
      res.status(201).json(communication);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid communication data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create communication" });
    }
  });

  // Colab message routes
  app.get("/api/colab-messages", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const messages = await storage.getColabMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching colab messages:", error);
      res.status(500).json({ message: "Failed to fetch colab messages" });
    }
  });

  app.get("/api/colab-messages/search", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const query = req.query.q as string || "";
      const messages = await storage.searchColabMessages(query);
      res.json(messages);
    } catch (error) {
      console.error("Error searching colab messages:", error);
      res.status(500).json({ message: "Failed to search colab messages" });
    }
  });

  app.get("/api/colab-messages/:id", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const message = await storage.getColabMessage(id);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      res.json(message);
    } catch (error) {
      console.error("Error fetching colab message:", error);
      res.status(500).json({ message: "Failed to fetch colab message" });
    }
  });

  app.post("/api/colab-messages", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get user info to derive username server-side (security requirement)
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Parse and validate only the content field from client
      const { content } = insertColabMessageSchema.omit({ 
        userId: true, 
        username: true 
      }).parse(req.body);
      
      // Server-side derived data for security
      const messageData = {
        userId: user.id,
        username: user.username,
        content: content
      };

      const message = await storage.createColabMessage(messageData);
      
      // Broadcast to WebSocket clients for real-time updates
      wsManager.notifyColabMessage(message);
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating colab message:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create colab message" });
    }
  });

  app.delete("/api/colab-messages/:id", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      if (!userId || !userRole) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const messageId = parseInt(req.params.id);
      if (isNaN(messageId)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }

      await storage.deleteColabMessage(messageId, userId, userRole);
      
      // Broadcast deletion to WebSocket clients for real-time updates
      wsManager.notifyColabMessageDeleted(messageId);
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting colab message:", error);
      if (error.message === 'Not authorized to delete this message') {
        return res.status(403).json({ message: "Not authorized to delete this message" });
      }
      if (error.message?.includes('not found')) {
        return res.status(404).json({ message: "Message not found" });
      }
      res.status(500).json({ message: "Failed to delete colab message" });
    }
  });

  // Vacancy routes
  app.get("/api/vacancies", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const vacancies = await storage.getVacancies();
      res.json(vacancies);
    } catch (error) {
      console.error("Error fetching vacancies:", error);
      res.status(500).json({ message: "Failed to fetch vacancies" });
    }
  });

  app.get("/api/vacancies/:id", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const vacancy = await storage.getVacancy(id);
      if (!vacancy) {
        return res.status(404).json({ message: "Vacancy not found" });
      }
      res.json(vacancy);
    } catch (error) {
      console.error("Error fetching vacancy:", error);
      res.status(500).json({ message: "Failed to fetch vacancy" });
    }
  });

  app.post("/api/vacancies", authenticate, enforcePasswordChange, requirePermission('manage_vacancies'), async (req, res) => {
    try {
      const validatedData = insertVacancySchema.parse(req.body);
      const normalizedData = normalizeVacancyDates(validatedData);
      const vacancy = await storage.createVacancy(normalizedData);
      
      // Send real-time notification
      try {
        wsManager.broadcast({ type: "vacancy_created", vacancy });
      } catch (notifError) {
        console.log("Notification failed:", notifError);
      }
      
      res.status(201).json(vacancy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid vacancy data", errors: error.errors });
      }
      console.error("Error creating vacancy:", error);
      res.status(500).json({ message: "Failed to create vacancy" });
    }
  });

  app.put("/api/vacancies/:id", authenticate, enforcePasswordChange, requirePermission('manage_vacancies'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertVacancySchema.partial().parse(req.body);
      const normalizedData = normalizeVacancyDates(validatedData);
      const vacancy = await storage.updateVacancy(id, normalizedData);
      res.json(vacancy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid vacancy data", errors: error.errors });
      }
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Vacancy not found" });
      }
      res.status(500).json({ message: "Failed to update vacancy" });
    }
  });

  // Object storage routes
  app.post("/api/objects/upload", authenticate, enforcePasswordChange, requirePermission('manage_vacancies'), async (req, res) => {
    try {
      const { ObjectStorageService } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.put("/api/vacancy-images", authenticate, enforcePasswordChange, requirePermission('manage_vacancies'), async (req, res) => {
    try {
      if (!req.body.imageURL) {
        return res.status(400).json({ error: "imageURL is required" });
      }

      const { ObjectStorageService } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.imageURL
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting vacancy image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Test email endpoint for debugging/verification
  app.post("/api/test-email", async (req, res) => {
    try {
      const { to } = req.body;
      
      if (!to) {
        return res.status(400).json({ message: "Email address is required" });
      }

      const success = await sendEmail({
        to: to,
        from: process.env.FROM_EMAIL || 'ilias@csrllc.net',
        subject: "Test Email from Deploy Property Management",
        html: `
          <h2>Test Email</h2>
          <p>This is a test email from your Deploy Property Management system.</p>
          <p>If you received this email, your email notifications are working correctly!</p>
          <p>Time sent: ${new Date().toLocaleString()}</p>
        `,
        text: `Test Email - This is a test email from your Deploy Property Management system. If you received this email, your email notifications are working correctly! Time sent: ${new Date().toLocaleString()}`
      });

      if (success) {
        res.json({ message: "Test email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send test email" });
      }
    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({ message: "Failed to send test email" });
    }
  });

  // Issue routes
  app.get("/api/issues", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const issues = await storage.getIssues();
      res.json(issues);
    } catch (error) {
      console.error("Error fetching issues:", error);
      res.status(500).json({ message: "Failed to fetch issues" });
    }
  });

  app.get("/api/issues/:id", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const issue = await storage.getIssue(id);
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      res.json(issue);
    } catch (error) {
      console.error("Error fetching issue:", error);
      res.status(500).json({ message: "Failed to fetch issue" });
    }
  });

  app.post("/api/issues", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const validatedData = insertIssueSchema.parse(req.body);
      // Automatically set the reportedBy field to the current user
      const issueData = { ...validatedData, reportedBy: userId };
      const issue = await storage.createIssue(issueData);
      
      // Send real-time notification
      try {
        wsManager.notifyIssueCreated(issue);
      } catch (notifError) {
        console.log("Notification failed:", notifError);
      }
      
      res.status(201).json(issue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid issue data", errors: error.errors });
      }
      console.error("Error creating issue:", error);
      res.status(500).json({ message: "Failed to create issue" });
    }
  });

  app.put("/api/issues/:id", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      // Check if issue exists first
      const existingIssue = await storage.getIssue(id);
      if (!existingIssue) {
        return res.status(404).json({ message: "Issue not found" });
      }

      // Authorization: users can edit their own issues, admins/project managers can edit any
      if (existingIssue.reportedBy !== userId && userRole !== 'admin' && userRole !== 'project_manager') {
        return res.status(403).json({ message: "Not authorized to edit this issue" });
      }

      const validatedData = insertIssueSchema.partial().parse(req.body);
      const issue = await storage.updateIssue(id, validatedData);
      
      // Send real-time notification
      try {
        wsManager.notifyIssueUpdated(issue);
      } catch (notifError) {
        console.log("Notification failed:", notifError);
      }
      
      res.json(issue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid issue data", errors: error.errors });
      }
      console.error("Error updating issue:", error);
      res.status(500).json({ message: "Failed to update issue" });
    }
  });

  app.delete("/api/issues/:id", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      // Check if issue exists first
      const existingIssue = await storage.getIssue(id);
      if (!existingIssue) {
        return res.status(404).json({ message: "Issue not found" });
      }

      // Authorization: users can delete their own issues, admins/project managers can delete any
      if (existingIssue.reportedBy !== userId && userRole !== 'admin' && userRole !== 'project_manager') {
        return res.status(403).json({ message: "Not authorized to delete this issue" });
      }

      await storage.deleteIssue(id);
      
      // Send real-time notification
      try {
        wsManager.notifyIssueDeleted(id);
      } catch (notifError) {
        console.log("Notification failed:", notifError);
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting issue:", error);
      res.status(500).json({ message: "Failed to delete issue" });
    }
  });

  // Admin route: Get all issues (admin and project managers only)
  app.get("/api/admin/issues", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const userRole = req.user?.role;
      
      // Check if user has admin or project manager role
      if (!userRole || !["admin", "project_manager"].includes(userRole)) {
        return res.status(403).json({ message: "Access denied. Admin or project manager role required." });
      }
      
      const issues = await storage.getIssues();
      res.json(issues);
    } catch (error) {
      console.error("Error fetching all issues:", error);
      res.status(500).json({ message: "Failed to fetch issues" });
    }
  });

  app.patch("/api/issues/:id", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userRole = req.user?.role;
      
      // Only admins and project managers can update issue status
      if (!userRole || !["admin", "project_manager"].includes(userRole)) {
        return res.status(403).json({ message: "Access denied. Admin or project manager role required." });
      }

      const { status, notes, assignedTo } = req.body;
      const issue = await storage.updateIssue(id, { status, notes, assignedTo });
      
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }

      // Send WebSocket notification
      wsManager.notifyIssueUpdated(issue);
      
      res.json(issue);
    } catch (error) {
      console.error("Error updating issue:", error);
      res.status(500).json({ message: "Failed to update issue" });
    }
  });

  app.get("/api/issues/user/:userId", authenticate, enforcePasswordChange, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const currentUserId = req.user?.id;
      const userRole = req.user?.role;
      
      // Authorization: users can only see their own issues, admins/project managers can see any
      if (userId !== currentUserId && userRole !== 'admin' && userRole !== 'project_manager') {
        return res.status(403).json({ message: "Not authorized to view these issues" });
      }

      const issues = await storage.getIssuesByUser(userId);
      res.json(issues);
    } catch (error) {
      console.error("Error fetching user issues:", error);
      res.status(500).json({ message: "Failed to fetch user issues" });
    }
  });

  // Catch-all for unknown API routes - return 404 JSON instead of HTML
  app.all('/api/*', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
  });

  const httpServer = createServer(app);
  return httpServer;
}
