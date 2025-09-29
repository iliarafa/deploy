import { 
  users, 
  userRegistrationRequests,
  userSessions,
  userSettings,
  tasks, 
  materialRequests, 
  communications,
  vacancies,
  colabMessages,
  issues,
  type User, 
  type InsertUser,
  type UpdateUser,
  type UserRegistrationRequest,
  type InsertUserRegistrationRequest,
  type ReviewRegistrationRequest,
  type UserSession,
  type InsertUserSession,
  type UserSettings,
  type InsertUserSettings,
  type UpdateUserSettings,
  type Task,
  type InsertTask,
  type MaterialRequest,
  type InsertMaterialRequest,
  type Communication,
  type InsertCommunication,
  type Vacancy,
  type InsertVacancy,
  type ColabMessage,
  type InsertColabMessage,
  type Issue,
  type InsertIssue,
  type NavShortcutId
} from "@shared/schema";
import { type UserRole, type Permission, hasPermission, getUserPermissions } from "@shared/roles";
import { db } from "./db";
import { eq, and, gte, lte, lt, or, ilike, isNotNull } from "drizzle-orm";
import { randomBytes, createHash, pbkdf2Sync } from "crypto";

// Date conversion utility for handling string dates from form inputs
function convertDate(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string') {
    const date = new Date(dateInput);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

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
  updateUserPassword(id: number, hashedPassword: string): Promise<User>;
  getUsers(): Promise<User[]>;
  getUsersByRole(roles: string[]): Promise<User[]>;
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
  
  // User settings operations
  getUserSettings(userId: number): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(userId: number, updates: UpdateUserSettings): Promise<UserSettings>;
  ensureUserSettings(userId: number): Promise<UserSettings>;
  
  // Task operations with role-based filtering
  getTasks(userId?: number, userRole?: UserRole): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  getTasksByDateRange(startDate: Date, endDate: Date, userId?: number, userRole?: UserRole): Promise<Task[]>;
  getWorkerTasks(username: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;
  
  // Recurring task operations
  getRecurringTasks(): Promise<Task[]>;
  getTasksForRecurrence(): Promise<Task[]>;
  generateRecurringTaskInstances(): Promise<Task[]>;
  getTasksByParent(parentTaskId: number): Promise<Task[]>;
  
  // Material request operations with role-based filtering
  getMaterialRequests(userId?: number, userRole?: UserRole): Promise<MaterialRequest[]>;
  getMaterialRequest(id: number): Promise<MaterialRequest | undefined>;
  createMaterialRequest(request: InsertMaterialRequest, userId: number): Promise<MaterialRequest>;
  updateMaterialRequest(id: number, updates: Partial<InsertMaterialRequest>): Promise<MaterialRequest>;
  deleteMaterialRequest(id: number, userId: number, userRole: UserRole): Promise<void>;
  
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
  
  // Colab message operations
  getColabMessages(): Promise<ColabMessage[]>;
  getColabMessage(id: number): Promise<ColabMessage | undefined>;
  createColabMessage(message: InsertColabMessage): Promise<ColabMessage>;
  deleteColabMessage(id: number, userId: number, userRole: UserRole): Promise<void>;
  searchColabMessages(query: string): Promise<ColabMessage[]>;
  
  // Issue operations
  getIssues(): Promise<Issue[]>;
  getIssue(id: number): Promise<Issue | undefined>;
  createIssue(issue: InsertIssue): Promise<Issue>;
  updateIssue(id: number, updates: Partial<InsertIssue>): Promise<Issue>;
  deleteIssue(id: number): Promise<void>;
  getIssuesByUser(userId: number): Promise<Issue[]>;
  getIssuesByStatus(status: string): Promise<Issue[]>;
  
  // Navigation preferences
  getUserNavPrefs(userId: number): Promise<{ navShortcuts: NavShortcutId[] }>;
  updateUserNavPrefs(userId: number, navShortcuts: NavShortcutId[]): Promise<{ navShortcuts: NavShortcutId[] }>;
  
  // Role-based authorization helpers
  checkUserPermission(userId: number, permission: Permission): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private registrationRequests: Map<number, UserRegistrationRequest>;
  private sessions: Map<string, UserSession>;
  private userSettings: Map<number, UserSettings>;
  private tasks: Map<number, Task>;
  private materialRequests: Map<number, MaterialRequest>;
  private communications: Map<number, Communication>;
  private vacancies: Map<number, Vacancy>;
  private colabMessages: Map<number, ColabMessage>;
  private issues: Map<number, Issue>;
  private currentUserId: number;
  private currentRequestId: number;
  private currentTaskId: number;
  private currentMaterialRequestId: number;
  private currentCommunicationId: number;
  private currentVacancyId: number;
  private currentColabMessageId: number;
  private currentIssueId: number;
  private currentUserSettingsId: number;

  constructor() {
    this.users = new Map();
    this.registrationRequests = new Map();
    this.sessions = new Map();
    this.userSettings = new Map();
    this.tasks = new Map();
    this.materialRequests = new Map();
    this.communications = new Map();
    this.vacancies = new Map();
    this.colabMessages = new Map();
    this.issues = new Map();
    this.currentUserId = 1;
    this.currentRequestId = 1;
    this.currentTaskId = 1;
    this.currentMaterialRequestId = 1;
    this.currentCommunicationId = 1;
    this.currentVacancyId = 1;
    this.currentColabMessageId = 1;
    this.currentIssueId = 1;
    this.currentUserSettingsId = 1;
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
      phone: null,
      birthDate: null,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      role: insertUser.role || "worker",
      permissions: [],
      navShortcuts: [], // Initialize with empty navigation shortcuts
      location: insertUser.location || null,
      profileImage: null,
      isActive: true,
      isApproved: false,
      approvedBy: null,
      approvedAt: null,
      lastLogin: null,
      mustChangePassword: false,
      passwordLastChangedAt: new Date(),
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

  async updateUserPassword(id: number, hashedPassword: string): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error(`User with id ${id} not found`);
    }
    const updatedUser = { 
      ...existingUser, 
      password: hashedPassword,
      mustChangePassword: false,
      passwordLastChangedAt: new Date()
    };
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

  // User settings operations
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    return this.userSettings.get(userId);
  }

  async createUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const id = this.currentUserSettingsId++;
    const userSettings: UserSettings = {
      ...settings,
      id,
      navShortcuts: settings.navShortcuts || null,
      language: settings.language || "en",
      defaultLandingPage: settings.defaultLandingPage || "today",
      theme: settings.theme || "light",
      calendarView: settings.calendarView || "month",
      taskListView: settings.taskListView || "card",
      showCompletedTasks: settings.showCompletedTasks || false,
      emailNotifications: settings.emailNotifications ?? true,
      taskNotifications: settings.taskNotifications ?? true,
      issueNotifications: settings.issueNotifications ?? true,
      materialNotifications: settings.materialNotifications ?? true,
      calendarNotifications: settings.calendarNotifications ?? true,
      colabNotifications: settings.colabNotifications ?? true,
      passwordExpiryDays: settings.passwordExpiryDays || 90,
      requirePasswordChange: settings.requirePasswordChange || false,
      twoFactorEnabled: settings.twoFactorEnabled || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.userSettings.set(settings.userId, userSettings);
    return userSettings;
  }

  async updateUserSettings(userId: number, updates: UpdateUserSettings): Promise<UserSettings> {
    const existingSettings = this.userSettings.get(userId);
    if (!existingSettings) {
      // Create default settings if they don't exist
      const newSettings: InsertUserSettings = {
        userId,
        language: "en",
        defaultLandingPage: "today",
        navShortcuts: [],
        theme: "light",
        calendarView: "month",
        taskListView: "card",
        showCompletedTasks: false,
        emailNotifications: true,
        taskNotifications: true,
        issueNotifications: true,
        materialNotifications: true,
        calendarNotifications: true,
        colabNotifications: true,
        passwordExpiryDays: 90,
        requirePasswordChange: false,
        twoFactorEnabled: false,
        ...updates,
      };
      return this.createUserSettings(newSettings);
    }

    const updatedSettings = {
      ...existingSettings,
      ...updates,
      updatedAt: new Date(),
    };
    this.userSettings.set(userId, updatedSettings);
    return updatedSettings;
  }

  async ensureUserSettings(userId: number): Promise<UserSettings> {
    const existing = await this.getUserSettings(userId);
    if (existing) {
      return existing;
    }

    // Create default settings for new user
    const defaultSettings: InsertUserSettings = {
      userId,
      language: "en",
      defaultLandingPage: "today",
      navShortcuts: [],
      theme: "light",
      calendarView: "month",
      taskListView: "card",
      showCompletedTasks: false,
      emailNotifications: true,
      taskNotifications: true,
      issueNotifications: true,
      materialNotifications: true,
      calendarNotifications: true,
      colabNotifications: true,
      passwordExpiryDays: 90,
      requirePasswordChange: false,
      twoFactorEnabled: false,
    };
    return this.createUserSettings(defaultSettings);
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.isActive);
  }

  async getUsersByRole(roles: string[]): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.isActive && roles.includes(user.role));
  }

  async getUserNavPrefs(userId: number): Promise<{ navShortcuts: NavShortcutId[] }> {
    // Use user settings as the source of truth for nav shortcuts
    const settings = await this.ensureUserSettings(userId);
    const navShortcuts = Array.isArray(settings.navShortcuts) ? settings.navShortcuts as NavShortcutId[] : [];
    return { navShortcuts };
  }

  async updateUserNavPrefs(userId: number, navShortcuts: NavShortcutId[]): Promise<{ navShortcuts: NavShortcutId[] }> {
    // Update user settings instead of user table directly
    const settings = await this.updateUserSettings(userId, { navShortcuts });
    const resultShortcuts = Array.isArray(settings.navShortcuts) ? settings.navShortcuts as NavShortcutId[] : [];
    return { navShortcuts: resultShortcuts };
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
      // Workers can only see tasks assigned to them (assignedTo stores username, not userId)
      const user = await this.getUser(userId);
      if (!user) return [];
      return allTasks.filter(task => task.assignedTo === user.username);
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
      // Workers can only see tasks assigned to them (assignedTo stores username, not userId)
      const user = await this.getUser(userId);
      if (!user) return [];
      filteredTasks = filteredTasks.filter(task => task.assignedTo === user.username);
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
      priority: insertTask.priority || "standard",
      // Handle recurring task fields with proper null defaults
      recurrenceType: insertTask.recurrenceType || null,
      recurrenceInterval: insertTask.recurrenceInterval || 1,
      nextDueDate: insertTask.nextDueDate || null,
      parentTaskId: insertTask.parentTaskId || null,
      isRecurringTemplate: insertTask.isRecurringTemplate || false
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

  // Recurring task operations
  async getRecurringTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => 
      task.isRecurringTemplate && task.recurrenceType && task.recurrenceType !== 'none'
    );
  }

  async getTasksForRecurrence(): Promise<Task[]> {
    const now = new Date();
    return Array.from(this.tasks.values()).filter(task => 
      task.isRecurringTemplate && 
      task.recurrenceType && 
      task.recurrenceType !== 'none' &&
      task.nextDueDate && 
      new Date(task.nextDueDate) <= now
    );
  }

  async generateRecurringTaskInstances(): Promise<Task[]> {
    const recurringTasks = await this.getTasksForRecurrence();
    const generatedTasks: Task[] = [];
    
    for (const template of recurringTasks) {
      if (!template.nextDueDate || !template.recurrenceType) continue;
      
      // Calculate next dates based on recurrence type
      const nextDueDate = this.calculateNextDueDate(template.nextDueDate, template.recurrenceType, template.recurrenceInterval || 1);
      const taskStartDate = new Date(template.nextDueDate);
      
      // Create new task instance
      const newTask = await this.createTask({
        title: template.title,
        description: template.description,
        category: template.category,
        priority: template.priority,
        location: template.location,
        assignedTo: template.assignedTo,
        startDate: taskStartDate,
        endDate: template.endDate ? new Date(template.endDate.getTime() + (taskStartDate.getTime() - template.startDate.getTime())) : undefined,
        parentTaskId: template.id,
        isRecurringTemplate: false,
        recurrenceType: undefined
      });
      
      generatedTasks.push(newTask);
      
      // Update template's next due date
      await this.updateTask(template.id, { nextDueDate });
    }
    
    return generatedTasks;
  }

  async getTasksByParent(parentTaskId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.parentTaskId === parentTaskId);
  }

  private calculateNextDueDate(currentDate: Date, recurrenceType: string, interval: number): Date {
    const nextDate = new Date(currentDate);
    
    switch (recurrenceType) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + interval);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + (7 * interval));
        break;
      case 'bi-weekly':
        nextDate.setDate(nextDate.getDate() + (14 * interval));
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;
    }
    
    return nextDate;
  }

  async getMaterialRequests(userId?: number, userRole?: UserRole): Promise<MaterialRequest[]> {
    const allRequests = Array.from(this.materialRequests.values());
    
    if (!userRole) {
      return allRequests;
    }

    // Workers can only see their own material requests
    if (userRole === 'worker' && userId) {
      return allRequests.filter(request => request.userId === userId);
    }
    
    // Admin, project_manager, supervisor, inspector, client can see all requests
    return allRequests;
  }

  async getMaterialRequest(id: number): Promise<MaterialRequest | undefined> {
    return this.materialRequests.get(id);
  }

  async createMaterialRequest(insertRequest: InsertMaterialRequest, userId: number): Promise<MaterialRequest> {
    const id = this.currentMaterialRequestId++;
    const request: MaterialRequest = { 
      ...insertRequest,
      userId, // Auto-assign from authenticated session
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

  async deleteMaterialRequest(id: number, userId: number, userRole: UserRole): Promise<void> {
    const request = this.materialRequests.get(id);
    if (!request) {
      throw new Error(`Material request with id ${id} not found`);
    }
    
    // Admin and project managers can delete any request
    if (userRole === 'admin' || userRole === 'project_manager') {
      this.materialRequests.delete(id);
      return;
    }
    
    // Workers can only delete their own requests
    if (userRole === 'worker' && request.userId === userId) {
      this.materialRequests.delete(id);
      return;
    }
    
    // Other roles (supervisor, inspector, client) cannot delete requests
    throw new Error('Access denied. You do not have permission to delete this material request.');
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
      images: insertVacancy.images || null,
      startDate: convertDate(insertVacancy.startDate),
      endDate: convertDate(insertVacancy.endDate),
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
    const processedUpdates: Partial<Vacancy> = {};
    // Copy over all fields except dates which need conversion
    if (updates.property !== undefined) processedUpdates.property = updates.property;
    if (updates.apartmentNumber !== undefined) processedUpdates.apartmentNumber = updates.apartmentNumber;
    if (updates.status !== undefined) processedUpdates.status = updates.status;
    if (updates.notes !== undefined) processedUpdates.notes = updates.notes;
    if (updates.images !== undefined) processedUpdates.images = updates.images;
    if (updates.startDate !== undefined) {
      processedUpdates.startDate = convertDate(updates.startDate);
    }
    if (updates.endDate !== undefined) {
      processedUpdates.endDate = convertDate(updates.endDate);
    }
    const updatedVacancy = { ...existingVacancy, ...processedUpdates };
    this.vacancies.set(id, updatedVacancy);
    return updatedVacancy;
  }

  async deleteVacancy(id: number): Promise<void> {
    this.vacancies.delete(id);
  }

  // Colab message operations
  async getColabMessages(): Promise<ColabMessage[]> {
    return Array.from(this.colabMessages.values()).sort((a, b) => 
      (a.createdAt || new Date()).getTime() - (b.createdAt || new Date()).getTime()
    );
  }

  async getColabMessage(id: number): Promise<ColabMessage | undefined> {
    return this.colabMessages.get(id);
  }

  async createColabMessage(insertMessage: InsertColabMessage): Promise<ColabMessage> {
    const id = this.currentColabMessageId++;
    const message: ColabMessage = {
      ...insertMessage,
      id,
      createdAt: new Date()
    };
    this.colabMessages.set(id, message);
    return message;
  }

  async deleteColabMessage(id: number, userId: number, userRole: UserRole): Promise<void> {
    const message = this.colabMessages.get(id);
    if (!message) {
      throw new Error(`Message with id ${id} not found`);
    }
    
    // Authorization check: users can delete their own messages, admin/project_manager can delete any
    if (message.userId !== userId && userRole !== 'admin' && userRole !== 'project_manager') {
      throw new Error('Not authorized to delete this message');
    }
    
    this.colabMessages.delete(id);
  }

  async searchColabMessages(query: string): Promise<ColabMessage[]> {
    const allMessages = await this.getColabMessages();
    if (!query.trim()) {
      return allMessages;
    }
    
    const lowerQuery = query.toLowerCase();
    return allMessages.filter(message => 
      message.content.toLowerCase().includes(lowerQuery) ||
      message.username.toLowerCase().includes(lowerQuery)
    );
  }

  // Issue operations
  async getIssues(): Promise<Issue[]> {
    return Array.from(this.issues.values());
  }

  async getIssue(id: number): Promise<Issue | undefined> {
    return this.issues.get(id);
  }

  async createIssue(insertIssue: InsertIssue): Promise<Issue> {
    const id = this.currentIssueId++;
    const issue: Issue = {
      id,
      description: insertIssue.description,
      urgency: insertIssue.urgency || "normal",
      category: insertIssue.category || "idle_elevator",
      property: insertIssue.property || null,
      attachments: insertIssue.attachments || null,
      status: insertIssue.status || "pending",
      reportedBy: insertIssue.reportedBy,
      assignedTo: insertIssue.assignedTo || null,
      createdAt: new Date(),
      resolvedAt: null,
      notes: insertIssue.notes || null,
    };
    this.issues.set(id, issue);
    return issue;
  }

  async updateIssue(id: number, updates: Partial<InsertIssue>): Promise<Issue> {
    const existingIssue = this.issues.get(id);
    if (!existingIssue) {
      throw new Error(`Issue with id ${id} not found`);
    }
    const updatedIssue = { ...existingIssue, ...updates };
    this.issues.set(id, updatedIssue);
    return updatedIssue;
  }

  async deleteIssue(id: number): Promise<void> {
    this.issues.delete(id);
  }

  async getIssuesByUser(userId: number): Promise<Issue[]> {
    return Array.from(this.issues.values()).filter(issue => issue.reportedBy === userId);
  }

  async getIssuesByStatus(status: string): Promise<Issue[]> {
    return Array.from(this.issues.values()).filter(issue => issue.status === status);
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

  async updateUserPassword(id: number, hashedPassword: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        password: hashedPassword,
        mustChangePassword: false,
        passwordLastChangedAt: new Date()
      })
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

  async getUsersByRole(roles: string[]): Promise<User[]> {
    return await db.select().from(users).where(
      and(
        eq(users.isActive, true),
        or(...roles.map(role => eq(users.role, role)))
      )
    );
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

  // User settings operations
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return settings || undefined;
  }

  async createUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const [userSettingsRecord] = await db
      .insert(userSettings)
      .values(settings)
      .returning();
    return userSettingsRecord;
  }

  async updateUserSettings(userId: number, updates: UpdateUserSettings): Promise<UserSettings> {
    const [updatedSettings] = await db
      .update(userSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId))
      .returning();

    if (!updatedSettings) {
      // If no existing settings, create them with the updates
      const defaultSettings: InsertUserSettings = {
        userId,
        language: "en",
        defaultLandingPage: "today",
        navShortcuts: [],
        theme: "light",
        calendarView: "month",
        taskListView: "card",
        showCompletedTasks: false,
        emailNotifications: true,
        taskNotifications: true,
        issueNotifications: true,
        materialNotifications: true,
        calendarNotifications: true,
        colabNotifications: true,
        passwordExpiryDays: 90,
        requirePasswordChange: false,
        twoFactorEnabled: false,
        ...updates,
      };
      return this.createUserSettings(defaultSettings);
    }

    return updatedSettings;
  }

  async ensureUserSettings(userId: number): Promise<UserSettings> {
    const existing = await this.getUserSettings(userId);
    if (existing) {
      return existing;
    }

    // Create default settings for new user
    const defaultSettings: InsertUserSettings = {
      userId,
      language: "en",
      defaultLandingPage: "today",
      navShortcuts: [],
      theme: "light",
      calendarView: "month",
      taskListView: "card",
      showCompletedTasks: false,
      emailNotifications: true,
      taskNotifications: true,
      issueNotifications: true,
      materialNotifications: true,
      calendarNotifications: true,
      colabNotifications: true,
      passwordExpiryDays: 90,
      requirePasswordChange: false,
      twoFactorEnabled: false,
    };
    return this.createUserSettings(defaultSettings);
  }

  // Task operations with role-based filtering
  async getTasks(userId?: number, userRole?: UserRole): Promise<Task[]> {
    if (!userRole) {
      return await db.select().from(tasks);
    }

    // Filter tasks based on user role
    if (userRole === 'worker' && userId) {
      // Workers can only see tasks assigned to them (assignedTo stores username, not userId)
      const user = await this.getUser(userId);
      if (!user) return [];
      return await db.select().from(tasks).where(eq(tasks.assignedTo, user.username));
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
      const user = await this.getUser(userId);
      if (!user) return [];
      return await db
      .select()
      .from(tasks)
      .where(
        and(
          gte(tasks.startDate, startDate),
          lte(tasks.startDate, endDate),
          eq(tasks.assignedTo, user.username)
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

  // Recurring task operations
  async getRecurringTasks(): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.isRecurringTemplate, true),
          isNotNull(tasks.recurrenceType)
        )
      );
  }

  async getTasksForRecurrence(): Promise<Task[]> {
    const now = new Date();
    return await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.isRecurringTemplate, true),
          isNotNull(tasks.recurrenceType),
          isNotNull(tasks.nextDueDate),
          lte(tasks.nextDueDate, now)
        )
      );
  }

  async generateRecurringTaskInstances(): Promise<Task[]> {
    const recurringTasks = await this.getTasksForRecurrence();
    const generatedTasks: Task[] = [];
    
    for (const template of recurringTasks) {
      if (!template.nextDueDate || !template.recurrenceType) continue;
      
      // Calculate next dates based on recurrence type
      const nextDueDate = this.calculateNextDueDate(template.nextDueDate, template.recurrenceType, template.recurrenceInterval || 1);
      const taskStartDate = new Date(template.nextDueDate);
      
      // Create new task instance
      const newTask = await this.createTask({
        title: template.title,
        description: template.description,
        category: template.category,
        priority: template.priority,
        location: template.location,
        assignedTo: template.assignedTo,
        startDate: taskStartDate,
        endDate: template.endDate ? new Date(template.endDate.getTime() + (taskStartDate.getTime() - template.startDate.getTime())) : undefined,
        parentTaskId: template.id,
        isRecurringTemplate: false,
        recurrenceType: undefined
      });
      
      generatedTasks.push(newTask);
      
      // Update template's next due date
      await this.updateTask(template.id, { nextDueDate });
    }
    
    return generatedTasks;
  }

  async getTasksByParent(parentTaskId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.parentTaskId, parentTaskId));
  }

  private calculateNextDueDate(currentDate: Date, recurrenceType: string, interval: number): Date {
    const nextDate = new Date(currentDate);
    
    switch (recurrenceType) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + interval);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + (7 * interval));
        break;
      case 'bi-weekly':
        nextDate.setDate(nextDate.getDate() + (14 * interval));
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;
    }
    
    return nextDate;
  }

  async getMaterialRequests(userId?: number, userRole?: UserRole): Promise<MaterialRequest[]> {
    if (!userRole) {
      return await db.select().from(materialRequests);
    }

    // Workers can only see their own material requests
    if (userRole === 'worker' && userId) {
      return await db.select().from(materialRequests).where(eq(materialRequests.userId, userId));
    }

    // Admin, project_manager, supervisor, inspector, client can see all material requests
    return await db.select().from(materialRequests);
  }

  async getMaterialRequest(id: number): Promise<MaterialRequest | undefined> {
    const [request] = await db.select().from(materialRequests).where(eq(materialRequests.id, id));
    return request || undefined;
  }

  async createMaterialRequest(insertRequest: InsertMaterialRequest, userId: number): Promise<MaterialRequest> {
    const [request] = await db
      .insert(materialRequests)
      .values({ ...insertRequest, userId })
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

  async deleteMaterialRequest(id: number, userId: number, userRole: UserRole): Promise<void> {
    // First, get the request to check ownership
    const [request] = await db.select().from(materialRequests).where(eq(materialRequests.id, id));
    if (!request) {
      throw new Error(`Material request with id ${id} not found`);
    }
    
    // Admin and project managers can delete any request
    if (userRole === 'admin' || userRole === 'project_manager') {
      await db.delete(materialRequests).where(eq(materialRequests.id, id));
      return;
    }
    
    // Workers can only delete their own requests
    if (userRole === 'worker' && request.userId === userId) {
      await db.delete(materialRequests).where(eq(materialRequests.id, id));
      return;
    }
    
    // Other roles (supervisor, inspector, client) cannot delete requests
    throw new Error('Access denied. You do not have permission to delete this material request.');
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
    const processedVacancy = {
      ...insertVacancy,
      startDate: convertDate(insertVacancy.startDate),
      endDate: convertDate(insertVacancy.endDate),
    };
    const [vacancy] = await db
      .insert(vacancies)
      .values(processedVacancy)
      .returning();
    return vacancy;
  }

  async updateVacancy(id: number, updates: Partial<InsertVacancy>): Promise<Vacancy> {
    const processedUpdates: any = { ...updates };
    if (updates.startDate !== undefined) {
      processedUpdates.startDate = convertDate(updates.startDate);
    }
    if (updates.endDate !== undefined) {
      processedUpdates.endDate = convertDate(updates.endDate);
    }
    const [vacancy] = await db
      .update(vacancies)
      .set(processedUpdates)
      .where(eq(vacancies.id, id))
      .returning();
    return vacancy;
  }

  async deleteVacancy(id: number): Promise<void> {
    await db.delete(vacancies).where(eq(vacancies.id, id));
  }

  // Colab message operations
  async getColabMessages(): Promise<ColabMessage[]> {
    return await db.select().from(colabMessages).orderBy(colabMessages.createdAt);
  }

  async getColabMessage(id: number): Promise<ColabMessage | undefined> {
    const [message] = await db.select().from(colabMessages).where(eq(colabMessages.id, id));
    return message || undefined;
  }

  async createColabMessage(insertMessage: InsertColabMessage): Promise<ColabMessage> {
    const [message] = await db
      .insert(colabMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async deleteColabMessage(id: number, userId: number, userRole: UserRole): Promise<void> {
    // First check if message exists and get ownership info
    const [message] = await db.select().from(colabMessages).where(eq(colabMessages.id, id));
    if (!message) {
      throw new Error(`Message with id ${id} not found`);
    }
    
    // Authorization check: users can delete their own messages, admin/project_manager can delete any
    if (message.userId !== userId && userRole !== 'admin' && userRole !== 'project_manager') {
      throw new Error('Not authorized to delete this message');
    }
    
    await db.delete(colabMessages).where(eq(colabMessages.id, id));
  }

  async searchColabMessages(query: string): Promise<ColabMessage[]> {
    if (!query.trim()) {
      return await this.getColabMessages();
    }
    
    // Using ilike for case-insensitive search
    const lowerQuery = `%${query.toLowerCase()}%`;
    return await db
      .select()
      .from(colabMessages)
      .where(
        or(
          ilike(colabMessages.content, lowerQuery),
          ilike(colabMessages.username, lowerQuery)
        )
      )
      .orderBy(colabMessages.createdAt);
  }

  // Issue operations
  async getIssues(): Promise<Issue[]> {
    return await db.select().from(issues).orderBy(issues.createdAt);
  }

  async getIssue(id: number): Promise<Issue | undefined> {
    const [issue] = await db.select().from(issues).where(eq(issues.id, id));
    return issue || undefined;
  }

  async createIssue(insertIssue: InsertIssue): Promise<Issue> {
    const [issue] = await db
      .insert(issues)
      .values(insertIssue)
      .returning();
    return issue;
  }

  async updateIssue(id: number, updates: Partial<InsertIssue>): Promise<Issue> {
    const [issue] = await db
      .update(issues)
      .set(updates)
      .where(eq(issues.id, id))
      .returning();
    return issue;
  }

  async deleteIssue(id: number): Promise<void> {
    await db.delete(issues).where(eq(issues.id, id));
  }

  async getIssuesByUser(userId: number): Promise<Issue[]> {
    return await db.select().from(issues).where(eq(issues.reportedBy, userId)).orderBy(issues.createdAt);
  }

  async getIssuesByStatus(status: string): Promise<Issue[]> {
    return await db.select().from(issues).where(eq(issues.status, status)).orderBy(issues.createdAt);
  }

  async getUserNavPrefs(userId: number): Promise<{ navShortcuts: NavShortcutId[] }> {
    // Use user settings as the source of truth for nav shortcuts
    const settings = await this.ensureUserSettings(userId);
    const navShortcuts = Array.isArray(settings.navShortcuts) ? settings.navShortcuts as NavShortcutId[] : [];
    return { navShortcuts };
  }

  async updateUserNavPrefs(userId: number, navShortcuts: NavShortcutId[]): Promise<{ navShortcuts: NavShortcutId[] }> {
    // Update user settings instead of user table directly
    const settings = await this.updateUserSettings(userId, { navShortcuts });
    const resultShortcuts = Array.isArray(settings.navShortcuts) ? settings.navShortcuts as NavShortcutId[] : [];
    return { navShortcuts: resultShortcuts };
  }

  async checkUserPermission(userId: number, permission: Permission): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    const userPermissions = getUserPermissions(user.role as UserRole, user.permissions as Permission[]);
    return hasPermission(userPermissions, permission);
  }
}

export const storage = new DatabaseStorage();
