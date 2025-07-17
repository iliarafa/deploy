import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, insertMaterialRequestSchema, insertCommunicationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Task routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
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

  app.get("/api/tasks/date-range", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const tasks = await storage.getTasksByDateRange(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks by date range" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
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

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTask(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Material request routes
  app.get("/api/material-requests", async (req, res) => {
    try {
      const requests = await storage.getMaterialRequests();
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
      const validatedData = insertMaterialRequestSchema.parse(req.body);
      const request = await storage.createMaterialRequest(validatedData);
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

  const httpServer = createServer(app);
  return httpServer;
}
