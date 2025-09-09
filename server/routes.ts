import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, insertMaterialRequestSchema, insertCommunicationSchema } from "@shared/schema";
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
        wsManager.broadcast("vacancy", { type: "created", vacancy });
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
