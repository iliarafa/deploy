import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertTaskSchema, 
  insertMaterialRequestSchema, 
  insertCommunicationSchema,
  insertUserRegistrationRequestSchema,
  reviewRegistrationRequestSchema,
  updateUserSchema,
  insertUserSchema 
} from "@shared/schema";
import { z } from "zod";
import { wsManager } from "./websocket";
import { sendTaskNotification, sendMaterialRequestNotification } from "./email";
import { 
  authenticate, 
  requirePermission, 
  requireRole, 
  canAccessResource, 
  addUserContext 
} from "./auth-middleware";
import { type UserRole } from "@shared/roles";

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
      
      // TODO: Verify password - for now allowing demo accounts
      const isDemoAccount = ['admin', 'manager', 'worker'].includes(username);
      if (isDemoAccount) {
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
      } else {
        return res.status(401).json({ message: "Invalid username or password" });
      }
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
  app.get("/api/admin/registration-requests", authenticate, requireRole('admin'), async (req, res) => {
    try {
      const requests = await storage.getRegistrationRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching registration requests:", error);
      res.status(500).json({ message: "Failed to fetch registration requests" });
    }
  });

  app.put("/api/admin/registration-requests/:id/review", authenticate, requireRole('admin'), async (req, res) => {
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

  app.get("/api/admin/users", authenticate, requireRole('admin'), async (req, res) => {
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

  app.put("/api/admin/users/:id", authenticate, requireRole('admin'), async (req, res) => {
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

  app.delete("/api/admin/users/:id", authenticate, requireRole('admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deactivateUser(id);
      res.json({ message: "User deactivated successfully" });
    } catch (error) {
      console.error("Deactivate user error:", error);
      res.status(500).json({ message: "Failed to deactivate user" });
    }
  });

  app.post("/api/admin/users", authenticate, requireRole('admin'), async (req, res) => {
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
      if (req.body.isApproved) {
        await storage.approveUser(newUser.id, userId, validatedData.role || 'worker');
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

  app.get("/api/users/profile", authenticate, async (req, res) => {
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

  app.put("/api/users/profile", authenticate, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      // Users can only update their own basic profile info (not role/permissions)
      const allowedUpdates = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        location: req.body.location
      };
      
      const updatedUser = await storage.updateUser(userId, allowedUpdates);
      const { password, ...safeUser } = updatedUser;
      
      res.json(safeUser);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Users endpoint for task assignment (accessible by users with task permissions)
  app.get("/api/users", authenticate, async (req, res) => {
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
  app.get("/api/tasks", authenticate, canAccessResource('task'), addUserContext, async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const userRole = req.query.userRole as UserRole;
      const tasks = await storage.getTasks(userId, userRole);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
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

  app.get("/api/tasks/date-range", authenticate, canAccessResource('task'), addUserContext, async (req, res) => {
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

  app.post("/api/tasks", authenticate, requirePermission('create_task'), async (req, res) => {
    try {
      // Convert date fields from strings to Date objects if needed
      const taskData = {
        ...req.body,
        startDate: new Date(req.body.startDate),
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
      };
      
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

  app.put("/api/tasks/:id", authenticate, requirePermission('edit_task'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(id, validatedData);
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

  app.delete("/api/tasks/:id", authenticate, requirePermission('delete_task'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTask(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Material request routes with authorization
  app.get("/api/material-requests", authenticate, canAccessResource('material'), addUserContext, async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const userRole = req.query.userRole as UserRole;
      const requests = await storage.getMaterialRequests(userId, userRole);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch material requests" });
    }
  });

  app.get("/api/material-requests/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.getMaterialRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Material request not found" });
      }
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch material request" });
    }
  });

  app.post("/api/material-requests", async (req, res) => {
    try {
      // Convert deliveryDate from string to Date object if needed
      const requestData = {
        ...req.body,
        deliveryDate: new Date(req.body.deliveryDate)
      };
      
      const validatedData = insertMaterialRequestSchema.parse(requestData);
      const request = await storage.createMaterialRequest(validatedData);
      
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

  app.put("/api/material-requests/:id", async (req, res) => {
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

  app.delete("/api/material-requests/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMaterialRequest(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete material request" });
    }
  });

  // Communication routes
  app.get("/api/communications", async (req, res) => {
    try {
      const communications = await storage.getCommunications();
      res.json(communications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch communications" });
    }
  });

  app.get("/api/communications/task/:taskId", async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const communications = await storage.getCommunicationsByTask(taskId);
      res.json(communications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch communications" });
    }
  });

  app.post("/api/communications", async (req, res) => {
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

  // Vacancy routes
  app.get("/api/vacancies", async (req, res) => {
    try {
      const vacancies = await storage.getVacancies();
      res.json(vacancies);
    } catch (error) {
      console.error("Error fetching vacancies:", error);
      res.status(500).json({ message: "Failed to fetch vacancies" });
    }
  });

  app.get("/api/vacancies/:id", async (req, res) => {
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

  app.post("/api/vacancies", async (req, res) => {
    try {
      const validatedData = { 
        property: req.body.property,
        apartmentNumber: req.body.apartmentNumber,
        previousTenantDuration: req.body.previousTenantDuration || null,
        images: req.body.images || [],
        notes: req.body.notes || null,
        status: req.body.status || "vacant"
      };
      const vacancy = await storage.createVacancy(validatedData);
      
      // Send real-time notification
      try {
        wsManager.broadcast({ type: "vacancy_created", vacancy });
      } catch (notifError) {
        console.log("Notification failed:", notifError);
      }
      
      res.status(201).json(vacancy);
    } catch (error) {
      console.error("Error creating vacancy:", error);
      res.status(500).json({ message: "Failed to create vacancy" });
    }
  });

  // Object storage routes
  app.post("/api/objects/upload", async (req, res) => {
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

  app.put("/api/vacancy-images", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
