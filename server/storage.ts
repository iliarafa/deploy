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
      createdAt: new Date()
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
      createdAt: new Date()
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
      createdAt: new Date()
    };
    this.communications.set(id, communication);
    return communication;
  }
}

export const storage = new MemStorage();
