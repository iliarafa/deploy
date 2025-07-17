import { 
  users, 
  tasks, 
  materialRequests, 
  communications,
  type User, 
  type InsertUser,
  type Task,
  type InsertTask,
  type MaterialRequest,
  type InsertMaterialRequest,
  type Communication,
  type InsertCommunication
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Task operations
  getTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  getTasksByDateRange(startDate: Date, endDate: Date): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;
  
  // Material request operations
  getMaterialRequests(): Promise<MaterialRequest[]>;
  getMaterialRequest(id: number): Promise<MaterialRequest | undefined>;
  createMaterialRequest(request: InsertMaterialRequest): Promise<MaterialRequest>;
  updateMaterialRequest(id: number, updates: Partial<InsertMaterialRequest>): Promise<MaterialRequest>;
  deleteMaterialRequest(id: number): Promise<void>;
  
  // Communication operations
  getCommunications(): Promise<Communication[]>;
  getCommunicationsByTask(taskId: number): Promise<Communication[]>;
  createCommunication(communication: InsertCommunication): Promise<Communication>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tasks: Map<number, Task>;
  private materialRequests: Map<number, MaterialRequest>;
  private communications: Map<number, Communication>;
  private currentUserId: number;
  private currentTaskId: number;
  private currentMaterialRequestId: number;
  private currentCommunicationId: number;

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.materialRequests = new Map();
    this.communications = new Map();
    this.currentUserId = 1;
    this.currentTaskId = 1;
    this.currentMaterialRequestId = 1;
    this.currentCommunicationId = 1;
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
}

export class DatabaseStorage implements IStorage {
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

  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getTasksByDateRange(startDate: Date, endDate: Date): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(and(gte(tasks.startDate, startDate), lte(tasks.startDate, endDate)));
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

  async getMaterialRequests(): Promise<MaterialRequest[]> {
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
}

export const storage = new DatabaseStorage();
