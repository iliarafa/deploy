import { 
  users, 
  tasks, 
  materialRequests, 
  communications,
  vacancies,
  type User, 
  type InsertUser,
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
import { eq, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  getUsers(): Promise<User[]>;
  
  // Task operations with role-based filtering
  getTasks(userId?: number, userRole?: UserRole): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  getTasksByDateRange(startDate: Date, endDate: Date, userId?: number, userRole?: UserRole): Promise<Task[]>;
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
  private tasks: Map<number, Task>;
  private materialRequests: Map<number, MaterialRequest>;
  private communications: Map<number, Communication>;
  private vacancies: Map<number, Vacancy>;
  private currentUserId: number;
  private currentTaskId: number;
  private currentMaterialRequestId: number;
  private currentCommunicationId: number;
  private currentVacancyId: number;

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.materialRequests = new Map();
    this.communications = new Map();
    this.vacancies = new Map();
    this.currentUserId = 1;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasksByDateRange(startDate: Date, endDate: Date): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => {
      const taskDate = new Date(task.startDate);
      return taskDate >= startDate && taskDate <= endDate;
    });
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

  async getMaterialRequests(): Promise<MaterialRequest[]> {
    return Array.from(this.materialRequests.values());
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

  async getVacancies(): Promise<Vacancy[]> {
    return Array.from(this.vacancies.values());
  }

  async getVacancy(id: number): Promise<Vacancy | undefined> {
    return this.vacancies.get(id);
  }

  async createVacancy(insertVacancy: InsertVacancy): Promise<Vacancy> {
    const id = this.currentVacancyId++;
    const vacancy: Vacancy = { ...insertVacancy, id, createdAt: new Date() };
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
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
      return await baseQuery.where(
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
