import { 
  users, 
  userRegistrationRequests,
  userSessions,
  tasks, 
  materialRequests, 
  communications,
  vacancies,
  type User, 
  type InsertUser,
  type UpdateUser,
  type UserRegistrationRequest,
  type InsertUserRegistrationRequest,
  type ReviewRegistrationRequest,
  type UserSession,
  type InsertUserSession,
  type Task,
  type InsertTask,
  type MaterialRequest,
  type InsertMaterialRequest,
  type Communication,
  type InsertCommunication,
  type Vacancy,
  type InsertVacancy
} from "@shared/schema";
import { type UserRole, type Permission, hasPermission, getUserPermissions } from "@shared/roles";
import { db } from "./db";
import { eq, and, gte, lte, lt } from "drizzle-orm";
import { randomBytes, createHash, pbkdf2Sync } from "crypto";

// Utility functions for password hashing and session management
function hashPassword(password: string): string {
  const salt = randomBytes(32).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const verifyHash = pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
  return hash === verifyHash;
}

function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: UpdateUser): Promise<User>;
  getUsers(): Promise<User[]>;
  deactivateUser(id: number): Promise<User>;
  approveUser(id: number, approvedBy: number, role: string): Promise<User>;
  
  // User registration and approval
  createRegistrationRequest(request: InsertUserRegistrationRequest): Promise<UserRegistrationRequest>;
  getRegistrationRequests(): Promise<UserRegistrationRequest[]>;
  getRegistrationRequest(id: number): Promise<UserRegistrationRequest | undefined>;
  reviewRegistrationRequest(id: number, reviewedBy: number, review: ReviewRegistrationRequest): Promise<UserRegistrationRequest>;
  
  // Session management
  createSession(userId: number, expiresAt: Date): Promise<UserSession>;
  getSessionByToken(token: string): Promise<UserSession | undefined>;
  getValidSession(token: string): Promise<UserSession | undefined>;
  deleteSession(token: string): Promise<void>;
  cleanExpiredSessions(): Promise<void>;
  
  // Task operations with role-based filtering
  getTasks(userId?: number, userRole?: UserRole): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  getTasksByDateRange(startDate: Date, endDate: Date, userId?: number, userRole?: UserRole): Promise<Task[]>;
  getWorkerTasks(username: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;
  
  // Material request operations with role-based filtering
  getMaterialRequests(userId?: number, userRole?: UserRole): Promise<MaterialRequest[]>;
  getMaterialRequest(id: number): Promise<MaterialRequest | undefined>;
  createMaterialRequest(request: InsertMaterialRequest): Promise<MaterialRequest>;
  updateMaterialRequest(id: number, updates: Partial<InsertMaterialRequest>): Promise<MaterialRequest>;
  deleteMaterialRequest(id: number): Promise<void>;
  
  // Communication operations
  getCommunications(): Promise<Communication[]>;
  getCommunicationsByTask(taskId: number): Promise<Communication[]>;
  createCommunication(communication: InsertCommunication): Promise<Communication>;
  
  // Vacancy operations with role-based filtering
  getVacancies(userRole?: UserRole): Promise<Vacancy[]>;
  getVacancy(id: number): Promise<Vacancy | undefined>;
  createVacancy(vacancy: InsertVacancy): Promise<Vacancy>;
  updateVacancy(id: number, updates: Partial<InsertVacancy>): Promise<Vacancy>;
  deleteVacancy(id: number): Promise<void>;
  
  // Role-based authorization helpers
  checkUserPermission(userId: number, permission: Permission): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private registrationRequests: Map<number, UserRegistrationRequest>;
  private sessions: Map<string, UserSession>;
  private tasks: Map<number, Task>;
  private materialRequests: Map<number, MaterialRequest>;
  private communications: Map<number, Communication>;
  private vacancies: Map<number, Vacancy>;
  private currentUserId: number;
  private currentRequestId: number;
  private currentTaskId: number;
  private currentMaterialRequestId: number;
  private currentCommunicationId: number;
  private currentVacancyId: number;

  constructor() {
    this.users = new Map();
    this.registrationRequests = new Map();
    this.sessions = new Map();
    this.tasks = new Map();
    this.materialRequests = new Map();
    this.communications = new Map();
    this.vacancies = new Map();
    this.currentUserId = 1;
    this.currentRequestId = 1;
    this.currentTaskId = 1;
    this.currentMaterialRequestId = 1;
    this.currentCommunicationId = 1;
    this.currentVacancyId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    // Hash password before storing - CRITICAL SECURITY FIX
    const hashedPassword = hashPassword(insertUser.password);
    const user: User = { 
      ...insertUser,
      id,
      password: hashedPassword,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      role: insertUser.role || "worker",
      permissions: [],
      location: insertUser.location || null,
      profileImage: null,
      isActive: true,
      isApproved: false,
      approvedBy: null,
      approvedAt: null,
      lastLogin: null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: UpdateUser): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error(`User with id ${id} not found`);
    }
    const updatedUser = { ...existingUser, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deactivateUser(id: number): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error(`User with id ${id} not found`);
    }
    const updatedUser = { ...existingUser, isActive: false };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async approveUser(id: number, approvedBy: number, role: string): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error(`User with id ${id} not found`);
    }
    const updatedUser = { 
      ...existingUser, 
      isApproved: true,
      approvedBy: approvedBy,
      approvedAt: new Date(),
      role: role
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Registration and approval (simplified for memory storage)
  async createRegistrationRequest(request: InsertUserRegistrationRequest): Promise<UserRegistrationRequest> {
    const id = this.currentRequestId++;
    const registrationRequest: UserRegistrationRequest = { 
      ...request, 
      id,
      requestedRole: request.requestedRole || "worker",
      location: request.location || null,
      reasonForAccess: request.reasonForAccess || null,
      status: "pending",
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
      createdAt: new Date()
    };
    this.registrationRequests.set(id, registrationRequest);
    return registrationRequest;
  }

  async getRegistrationRequests(): Promise<UserRegistrationRequest[]> {
    return Array.from(this.registrationRequests.values());
  }

  async getRegistrationRequest(id: number): Promise<UserRegistrationRequest | undefined> {
    return this.registrationRequests.get(id);
  }

  async reviewRegistrationRequest(id: number, reviewedBy: number, review: ReviewRegistrationRequest): Promise<UserRegistrationRequest> {
    const existingRequest = this.registrationRequests.get(id);
    if (!existingRequest) {
      throw new Error(`Registration request with id ${id} not found`);
    }
    
    const updatedRequest = { 
      ...existingRequest, 
      status: review.status,
      reviewedBy: reviewedBy,
      reviewedAt: new Date(),
      reviewNotes: review.reviewNotes || null
    };
    this.registrationRequests.set(id, updatedRequest);

    // If approved, create user account
    if (review.status === 'approved') {
      const userData: InsertUser = {
        username: existingRequest.username,
        password: existingRequest.password,
        email: existingRequest.email,
        firstName: existingRequest.firstName,
        lastName: existingRequest.lastName,
        role: review.assignedRole || existingRequest.requestedRole,
        location: existingRequest.location || null
      };
      await this.createUser(userData);
    }

    return updatedRequest;
  }

  // Session management (simplified for memory storage)
  async createSession(userId: number, expiresAt: Date): Promise<UserSession> {
    const sessionToken = generateSessionToken();
    const session: UserSession = {
      id: Date.now(), // Simple ID for memory storage
      userId,
      sessionToken,
      expiresAt,
      createdAt: new Date()
    };
    this.sessions.set(sessionToken, session);
    return session;
  }

  async getSessionByToken(token: string): Promise<UserSession | undefined> {
    const session = this.sessions.get(token);
    if (session && session.expiresAt > new Date()) {
      return session;
    }
    return undefined;
  }

  async getValidSession(token: string): Promise<UserSession | undefined> {
    return this.getSessionByToken(token);
  }

  async deleteSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  async cleanExpiredSessions(): Promise<void> {
    const now = new Date();
    const expiredTokens: string[] = [];
    this.sessions.forEach((session, token) => {
      if (session.expiresAt <= now) {
        expiredTokens.push(token);
      }
    });
    expiredTokens.forEach(token => this.sessions.delete(token));
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.isActive);
  }

  async checkUserPermission(userId: number, permission: Permission): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    const userPermissions = getUserPermissions(user.role as UserRole, user.permissions as Permission[]);
    return hasPermission(userPermissions, permission);
  }

  async getTasks(userId?: number, userRole?: UserRole): Promise<Task[]> {
    const allTasks = Array.from(this.tasks.values());
    
    if (!userRole) {
      return allTasks;
    }

    // Filter tasks based on user role
    if (userRole === 'worker' && userId) {
      // Workers can only see tasks assigned to them
      return allTasks.filter(task => task.assignedTo === userId.toString());
    }
    
    // Admin, project_manager, supervisor, inspector, client can see all tasks
    return allTasks;
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasksByDateRange(startDate: Date, endDate: Date, userId?: number, userRole?: UserRole): Promise<Task[]> {
    let filteredTasks = Array.from(this.tasks.values()).filter(task => {
      const taskDate = new Date(task.startDate);
      return taskDate >= startDate && taskDate <= endDate;
    });

    if (!userRole) {
      return filteredTasks;
    }

    // Filter tasks based on user role
    if (userRole === 'worker' && userId) {
      // Workers can only see tasks assigned to them
      filteredTasks = filteredTasks.filter(task => task.assignedTo === userId.toString());
    }

    return filteredTasks;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.currentTaskId++;
    const task: Task = { 
      ...insertTask, 
      id, 
      createdAt: new Date(),
      description: insertTask.description || null,
      location: insertTask.location || null,
      assignedTo: insertTask.assignedTo || null,
      endDate: insertTask.endDate || null,
      status: insertTask.status || "pending",
      priority: insertTask.priority || "standard"
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task> {
    const existingTask = this.tasks.get(id);
    if (!existingTask) {
      throw new Error(`Task with id ${id} not found`);
    }
    const updatedTask = { ...existingTask, ...updates };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<void> {
    this.tasks.delete(id);
  }

  async getWorkerTasks(username: string): Promise<Task[]> {
    // First find the user by username to get their ID
    const worker = await this.getUserByUsername(username);
    if (!worker) {
      return [];
    }
    
    const allTasks = Array.from(this.tasks.values());
    // Return tasks assigned to the specific worker (assignedTo stores usernames, not IDs)
    return allTasks.filter(task => task.assignedTo === username);
  }

  async getMaterialRequests(userId?: number, userRole?: UserRole): Promise<MaterialRequest[]> {
    const allRequests = Array.from(this.materialRequests.values());
    
    if (!userRole) {
      return allRequests;
    }

    // For now, all roles can see all material requests
    // In a full implementation, you'd track who created the request
    return allRequests;
  }

  async getMaterialRequest(id: number): Promise<MaterialRequest | undefined> {
    return this.materialRequests.get(id);
  }

  async createMaterialRequest(insertRequest: InsertMaterialRequest): Promise<MaterialRequest> {
    const id = this.currentMaterialRequestId++;
    const request: MaterialRequest = { 
      ...insertRequest, 
      id, 
      createdAt: new Date(),
      notes: insertRequest.notes || null,
      status: insertRequest.status || "pending",
      priority: insertRequest.priority || "standard"
    };
    this.materialRequests.set(id, request);
    return request;
  }

  async updateMaterialRequest(id: number, updates: Partial<InsertMaterialRequest>): Promise<MaterialRequest> {
    const existing = this.materialRequests.get(id);
    if (!existing) {
      throw new Error(`Material request with id ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    this.materialRequests.set(id, updated);
    return updated;
  }

  async deleteMaterialRequest(id: number): Promise<void> {
    this.materialRequests.delete(id);
  }

  async getCommunications(): Promise<Communication[]> {
    return Array.from(this.communications.values());
  }

  async getCommunicationsByTask(taskId: number): Promise<Communication[]> {
    return Array.from(this.communications.values()).filter(
      comm => comm.taskId === taskId
    );
  }

  async createCommunication(insertCommunication: InsertCommunication): Promise<Communication> {
    const id = this.currentCommunicationId++;
    const communication: Communication = { 
      ...insertCommunication, 
      id, 
      createdAt: new Date(),
      taskId: insertCommunication.taskId || null
    };
    this.communications.set(id, communication);
    return communication;
  }

  async getVacancies(userRole?: UserRole): Promise<Vacancy[]> {
    if (!userRole) {
      return Array.from(this.vacancies.values());
    }

    // Only admin and project managers can access vacancy records
    if (userRole === 'admin' || userRole === 'project_manager') {
      return Array.from(this.vacancies.values());
    }

    // Other roles get empty array (no access)
    return [];
  }

  async getVacancy(id: number): Promise<Vacancy | undefined> {
    return this.vacancies.get(id);
  }

  async createVacancy(insertVacancy: InsertVacancy): Promise<Vacancy> {
    const id = this.currentVacancyId++;
    const vacancy: Vacancy = { 
      ...insertVacancy, 
      id, 
      status: insertVacancy.status || "vacant",
      notes: insertVacancy.notes || null,
      previousTenantDuration: insertVacancy.previousTenantDuration || null,
      images: insertVacancy.images || null,
      createdAt: new Date()
    };
    this.vacancies.set(id, vacancy);
    return vacancy;
  }

  async updateVacancy(id: number, updates: Partial<InsertVacancy>): Promise<Vacancy> {
    const existingVacancy = this.vacancies.get(id);
    if (!existingVacancy) {
      throw new Error(`Vacancy with id ${id} not found`);
    }
    const updatedVacancy = { ...existingVacancy, ...updates };
    this.vacancies.set(id, updatedVacancy);
    return updatedVacancy;
  }

  async deleteVacancy(id: number): Promise<void> {
    this.vacancies.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash password before storing
    const hashedPassword = hashPassword(insertUser.password);
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, password: hashedPassword })
      .returning();
    return user;
  }

  async updateUser(id: number, updates: UpdateUser): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isActive, true));
  }

  async deactivateUser(id: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isActive: false })
      .where(eq(users.id, id))
      .returning();
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    return user;
  }

  async approveUser(id: number, approvedBy: number, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        isApproved: true,
        approvedBy: approvedBy,
        approvedAt: new Date(),
        role: role 
      })
      .where(eq(users.id, id))
      .returning();
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    return user;
  }

  // User registration and approval
  async createRegistrationRequest(request: InsertUserRegistrationRequest): Promise<UserRegistrationRequest> {
    // Hash password before storing
    const hashedPassword = hashPassword(request.password);
    const [registrationRequest] = await db
      .insert(userRegistrationRequests)
      .values({ ...request, password: hashedPassword })
      .returning();
    return registrationRequest;
  }

  async getRegistrationRequests(): Promise<UserRegistrationRequest[]> {
    return await db.select().from(userRegistrationRequests);
  }

  async getRegistrationRequest(id: number): Promise<UserRegistrationRequest | undefined> {
    const [request] = await db.select().from(userRegistrationRequests).where(eq(userRegistrationRequests.id, id));
    return request || undefined;
  }

  async reviewRegistrationRequest(id: number, reviewedBy: number, review: ReviewRegistrationRequest): Promise<UserRegistrationRequest> {
    // First update the registration request
    const [reviewedRequest] = await db
      .update(userRegistrationRequests)
      .set({
        status: review.status,
        reviewedBy: reviewedBy,
        reviewedAt: new Date(),
        reviewNotes: review.reviewNotes || null
      })
      .where(eq(userRegistrationRequests.id, id))
      .returning();

    if (!reviewedRequest) {
      throw new Error(`Registration request with id ${id} not found`);
    }

    // If approved, create the actual user account
    if (review.status === 'approved') {
      const userData = {
        username: reviewedRequest.username,
        password: reviewedRequest.password, // Already hashed
        email: reviewedRequest.email,
        firstName: reviewedRequest.firstName,
        lastName: reviewedRequest.lastName,
        role: review.assignedRole || reviewedRequest.requestedRole,
        location: reviewedRequest.location,
        isApproved: true,
        approvedBy: reviewedBy,
        approvedAt: new Date()
      };

      await db.insert(users).values(userData);
    }

    return reviewedRequest;
  }

  // Session management
  async createSession(userId: number, expiresAt: Date): Promise<UserSession> {
    const sessionToken = generateSessionToken();
    const [session] = await db
      .insert(userSessions)
      .values({
        userId,
        sessionToken,
        expiresAt
      })
      .returning();
    return session;
  }

  async getSessionByToken(token: string): Promise<UserSession | undefined> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(and(
        eq(userSessions.sessionToken, token),
        gte(userSessions.expiresAt, new Date())
      ));
    return session || undefined;
  }

  async getValidSession(token: string): Promise<UserSession | undefined> {
    return this.getSessionByToken(token);
  }

  async deleteSession(token: string): Promise<void> {
    await db.delete(userSessions).where(eq(userSessions.sessionToken, token));
  }

  async cleanExpiredSessions(): Promise<void> {
    await db.delete(userSessions).where(lt(userSessions.expiresAt, new Date()));
  }

  async checkUserPermission(userId: number, permission: Permission): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    const userPermissions = getUserPermissions(user.role as UserRole, user.permissions as Permission[]);
    return hasPermission(userPermissions, permission);
  }

  // Task operations with role-based filtering
  async getTasks(userId?: number, userRole?: UserRole): Promise<Task[]> {
    if (!userRole) {
      return await db.select().from(tasks);
    }

    // Filter tasks based on user role
    if (userRole === 'worker' && userId) {
      // Workers can only see tasks assigned to them
      return await db.select().from(tasks).where(eq(tasks.assignedTo, userId.toString()));
    }
    
    if (userRole === 'client') {
      // Clients see limited task information
      return await db.select().from(tasks);
    }
    
    // Admin, project_manager, supervisor, inspector can see all tasks
    return await db.select().from(tasks);
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getTasksByDateRange(startDate: Date, endDate: Date, userId?: number, userRole?: UserRole): Promise<Task[]> {
    const baseQuery = db
      .select()
      .from(tasks)
      .where(and(gte(tasks.startDate, startDate), lte(tasks.startDate, endDate)));

    if (!userRole) {
      return await baseQuery;
    }

    // Filter tasks based on user role
    if (userRole === 'worker' && userId) {
      return await db
      .select()
      .from(tasks)
      .where(
        and(
          gte(tasks.startDate, startDate),
          lte(tasks.startDate, endDate),
          eq(tasks.assignedTo, userId.toString())
        )
      );
    }

    // Admin, project_manager, supervisor, inspector, client can see all tasks in range
    return await baseQuery;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values(insertTask)
      .returning();
    return task;
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }
    return task;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getWorkerTasks(username: string): Promise<Task[]> {
    // Return tasks assigned to the specific worker username
    return await db.select().from(tasks).where(eq(tasks.assignedTo, username));
  }

  async getMaterialRequests(userId?: number, userRole?: UserRole): Promise<MaterialRequest[]> {
    if (!userRole) {
      return await db.select().from(materialRequests);
    }

    // Workers can only see their own material requests
    if (userRole === 'worker' && userId) {
      // For now, we'll show all since we don't track who created the request
      // In a full implementation, you'd add a createdBy field
      return await db.select().from(materialRequests);
    }

    // Admin, project_manager, supervisor can see all material requests
    // Clients get read-only view of all requests
    return await db.select().from(materialRequests);
  }

  async getMaterialRequest(id: number): Promise<MaterialRequest | undefined> {
    const [request] = await db.select().from(materialRequests).where(eq(materialRequests.id, id));
    return request || undefined;
  }

  async createMaterialRequest(insertRequest: InsertMaterialRequest): Promise<MaterialRequest> {
    const [request] = await db
      .insert(materialRequests)
      .values(insertRequest)
      .returning();
    return request;
  }

  async updateMaterialRequest(id: number, updates: Partial<InsertMaterialRequest>): Promise<MaterialRequest> {
    const [request] = await db
      .update(materialRequests)
      .set(updates)
      .where(eq(materialRequests.id, id))
      .returning();
    if (!request) {
      throw new Error(`Material request with id ${id} not found`);
    }
    return request;
  }

  async deleteMaterialRequest(id: number): Promise<void> {
    await db.delete(materialRequests).where(eq(materialRequests.id, id));
  }

  async getCommunications(): Promise<Communication[]> {
    return await db.select().from(communications);
  }

  async getCommunicationsByTask(taskId: number): Promise<Communication[]> {
    return await db.select().from(communications).where(eq(communications.taskId, taskId));
  }

  async createCommunication(insertCommunication: InsertCommunication): Promise<Communication> {
    const [communication] = await db
      .insert(communications)
      .values(insertCommunication)
      .returning();
    return communication;
  }

  async getVacancies(userRole?: UserRole): Promise<Vacancy[]> {
    if (!userRole) {
      return await db.select().from(vacancies);
    }

    // Only admin and project managers can access vacancy records
    if (userRole === 'admin' || userRole === 'project_manager') {
      return await db.select().from(vacancies);
    }

    // Other roles get empty array (no access)
    return [];
  }

  async getVacancy(id: number): Promise<Vacancy | undefined> {
    const [vacancy] = await db.select().from(vacancies).where(eq(vacancies.id, id));
    return vacancy || undefined;
  }

  async createVacancy(insertVacancy: InsertVacancy): Promise<Vacancy> {
    const [vacancy] = await db
      .insert(vacancies)
      .values(insertVacancy)
      .returning();
    return vacancy;
  }

  async updateVacancy(id: number, updates: Partial<InsertVacancy>): Promise<Vacancy> {
    const [vacancy] = await db
      .update(vacancies)
      .set(updates)
      .where(eq(vacancies.id, id))
      .returning();
    return vacancy;
  }

  async deleteVacancy(id: number): Promise<void> {
    await db.delete(vacancies).where(eq(vacancies.id, id));
  }
}

export const storage = new DatabaseStorage();
