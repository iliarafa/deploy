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
      
      // Only log response bodies for errors and in development, and redact sensitive fields
      if (capturedJsonResponse && (res.statusCode >= 400 || process.env.NODE_ENV === "development")) {
        const safeResponse = redactSensitiveData(capturedJsonResponse);
        logLine += ` :: ${JSON.stringify(safeResponse)}`;
      }

      if (logLine.length > 150) {
        logLine = logLine.slice(0, 149) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Redact sensitive data from response bodies before logging
function redactSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveKeys = [
    'password', 'token', 'sessionToken', 'secret', 'key', 'authorization',
    'email', 'phone', 'ssn', 'creditCard', 'apiKey', 'privateKey'
  ];
  
  const redacted = { ...data };
  
  for (const key of Object.keys(redacted)) {
    if (sensitiveKeys.some(sensitiveKey => 
      key.toLowerCase().includes(sensitiveKey.toLowerCase())
    )) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitiveData(redacted[key]);
    }
  }
  
  return redacted;
}

// Bootstrap function to create default admin if none exists
async function bootstrapDatabase() {
  try {
    // Check if any admin users exist
    const users = await storage.getUsers();
    const adminExists = users.some(user => user.role === 'admin');
    
    if (!adminExists) {
      log("No admin users found, creating default admin...");
      
      // Generate a secure random password or use environment variable
      const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || generateSecurePassword();
      
      // Create default admin user with must change password flag
      const defaultAdmin = {
        username: "admin",
        password: adminPassword,
        email: "admin@deploy.local",
        firstName: "System",
        lastName: "Administrator", 
        role: "admin" as const
      };
      
      const adminUser = await storage.createUser(defaultAdmin);
      await storage.approveUser(adminUser.id, adminUser.id, "admin");
      
      // Set mustChangePassword flag for bootstrap admin
      await storage.updateUser(adminUser.id, { 
        mustChangePassword: true,
        passwordLastChangedAt: new Date()
      });
      
      if (!process.env.BOOTSTRAP_ADMIN_PASSWORD) {
        if (process.env.NODE_ENV === "development") {
          log(`Default admin created: username='admin', temporary password='${adminPassword}'`);
          log("SECURITY NOTICE: Save this password and change it immediately after first login!");
        } else {
          log(`Default admin created: username='admin' (temporary password generated - check environment or contact system administrator)`);
        }
      } else {
        log(`Default admin created: username='admin' (using environment password)`);
      }
    }
  } catch (error) {
    console.error("Bootstrap database failed:", error);
  }
}

// Generate a cryptographically secure temporary password
function generateSecurePassword(): string {
  const crypto = require('crypto');
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < 16; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
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
