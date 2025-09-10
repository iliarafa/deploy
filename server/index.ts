import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { wsManager } from "./websocket";
import { storage } from "./storage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Bootstrap function to create default admin if none exists
async function bootstrapDatabase() {
  try {
    // Check if any admin users exist
    const users = await storage.getUsers();
    const adminExists = users.some(user => user.role === 'admin');
    
    if (!adminExists) {
      log("No admin users found, creating default admin...");
      
      // Create default admin user
      const defaultAdmin = {
        username: "admin",
        password: "admin123", // Simple password for production bootstrap
        email: "admin@deploy.local",
        firstName: "System",
        lastName: "Administrator", 
        role: "admin" as const
      };
      
      const adminUser = await storage.createUser(defaultAdmin);
      await storage.approveUser(adminUser.id, adminUser.id, "admin");
      
      log(`Default admin created: username='admin'`);
    }
  } catch (error) {
    console.error("Bootstrap database failed:", error);
  }
}

(async () => {
  const server = await registerRoutes(app);
  
  // Bootstrap database with default admin if needed
  await bootstrapDatabase();
  
  // Initialize WebSocket manager
  wsManager.init(server);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
