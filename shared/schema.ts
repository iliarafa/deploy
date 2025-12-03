import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Navigation shortcut options
export const NavOption = z.enum(["today", "log", "colab", "tasks", "materials", "vacancies", "issues", "admin", "calendar", "settings"]);
export type NavShortcutId = z.infer<typeof NavOption>;

// Language options
export const Language = z.enum(["en", "es"]);
export type LanguageCode = z.infer<typeof Language>;

// Default landing page options
export const LandingPage = z.enum(["today", "tasks", "calendar", "colab", "materials", "issues"]);
export type LandingPageId = z.infer<typeof LandingPage>;

// Recurrence type options
export const RecurrenceType = z.enum(["none", "daily", "weekly", "bi-weekly", "monthly", "yearly"]);
export type RecurrenceTypeId = z.infer<typeof RecurrenceType>;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  birthDate: timestamp("birth_date"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull().default("worker"),
  permissions: text("permissions").array().default([]),
  navShortcuts: text("nav_shortcuts").array().default([]), // User's preferred navigation shortcuts
  location: text("location"), // Which construction site/location they work at
  profileImage: text("profile_image"),
  isActive: boolean("is_active").notNull().default(true),
  isApproved: boolean("is_approved").notNull().default(false),
  approvedBy: integer("approved_by"), // Admin user who approved
  approvedAt: timestamp("approved_at"),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  passwordLastChangedAt: timestamp("password_last_changed_at"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userRegistrationRequests = pgTable("user_registration_requests", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  email: text("email").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  password: text("password").notNull(),
  requestedRole: text("requested_role").notNull().default("worker"),
  location: text("location"),
  reasonForAccess: text("reason_for_access"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  reviewedBy: integer("reviewed_by"), // Admin who reviewed
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sessionToken: text("session_token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  // General Settings
  language: text("language").notNull().default("en"), // en, es
  defaultLandingPage: text("default_landing_page").default("today"),
  navShortcuts: text("nav_shortcuts").array().default([]),
  // Display Settings
  theme: text("theme").notNull().default("light"), // light, dark
  calendarView: text("calendar_view").notNull().default("month"), // month, week, day
  taskListView: text("task_list_view").notNull().default("card"), // card, list
  showCompletedTasks: boolean("show_completed_tasks").notNull().default(false),
  // Notification Settings
  emailNotifications: boolean("email_notifications").notNull().default(true),
  taskNotifications: boolean("task_notifications").notNull().default(true),
  issueNotifications: boolean("issue_notifications").notNull().default(true),
  materialNotifications: boolean("material_notifications").notNull().default(true),
  calendarNotifications: boolean("calendar_notifications").notNull().default(true),
  colabNotifications: boolean("colab_notifications").notNull().default(true),
  // Security Settings
  passwordExpiryDays: integer("password_expiry_days").default(90),
  requirePasswordChange: boolean("require_password_change").notNull().default(false),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  priority: text("priority").notNull().default("standard"),
  status: text("status").notNull().default("pending"),
  location: text("location"),
  apartmentNumber: text("apartment_number"),
  assignedTo: text("assigned_to"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  // Recurring task fields
  recurrenceType: text("recurrence_type"), // none, daily, weekly, bi-weekly, monthly, yearly
  recurrenceInterval: integer("recurrence_interval").default(1), // every N units
  nextDueDate: timestamp("next_due_date"), // when next instance should be created
  parentTaskId: integer("parent_task_id"), // reference to original recurring task
  isRecurringTemplate: boolean("is_recurring_template").default(false), // marks the original template
  createdAt: timestamp("created_at").defaultNow(),
});

export const materialRequests = pgTable("material_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  materialType: text("material_type").notNull(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unit: text("unit").notNull(),
  deliveryDate: timestamp("delivery_date").notNull(),
  deliveryLocation: text("delivery_location").notNull(),
  priority: text("priority").notNull().default("standard"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const communications = pgTable("communications", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id"),
  type: text("type").notNull(), // note, comment, update
  content: text("content").notNull(),
  author: text("author").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vacancies = pgTable("vacancies", {
  id: serial("id").primaryKey(),
  property: text("property").notNull(),
  apartmentNumber: text("apartment_number").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  images: text("images").array(),
  notes: text("notes"),
  status: text("status").notNull().default("vacant"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const colabMessages = pgTable("colab_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  username: text("username").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const issues = pgTable("issues", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  urgency: text("urgency").notNull().default("normal"), // emergency, high, normal
  category: text("category").notNull().default("idle_elevator"), // idle_elevator, no_heat_hot_water, no_electricity
  property: text("property"),
  attachments: text("attachments").array(), // file paths for uploaded images/documents
  status: text("status").notNull().default("pending"), // pending, in_progress, resolved, cancelled
  reportedBy: integer("reported_by").notNull(),
  assignedTo: text("assigned_to"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  notes: text("notes"), // internal notes for resolution
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  approvedByUser: one(users, {
    fields: [users.approvedBy],
    references: [users.id],
  }),
  sessions: many(userSessions),
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  colabMessages: many(colabMessages),
  materialRequests: many(materialRequests),
  reportedIssues: many(issues),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

export const userRegistrationRequestsRelations = relations(userRegistrationRequests, ({ one }) => ({
  reviewedByUser: one(users, {
    fields: [userRegistrationRequests.reviewedBy],
    references: [users.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ many, one }) => ({
  communications: many(communications),
  parentTask: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
  }),
  childTasks: many(tasks),
}));

export const communicationsRelations = relations(communications, ({ one }) => ({
  task: one(tasks, {
    fields: [communications.taskId],
    references: [tasks.id],
  }),
}));

export const colabMessagesRelations = relations(colabMessages, ({ one }) => ({
  user: one(users, {
    fields: [colabMessages.userId],
    references: [users.id],
  }),
}));

export const materialRequestsRelations = relations(materialRequests, ({ one }) => ({
  user: one(users, {
    fields: [materialRequests.userId],
    references: [users.id],
  }),
}));

export const issuesRelations = relations(issues, ({ one }) => ({
  reportedByUser: one(users, {
    fields: [issues.reportedBy],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  location: true,
});

export const insertUserRegistrationRequestSchema = createInsertSchema(userRegistrationRequests).omit({
  id: true,
  createdAt: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewNotes: true,
  status: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Proper validation schema with enum constraints
export const updateUserSettingsSchema = z.object({
  language: Language.optional(),
  defaultLandingPage: LandingPage.optional(), 
  navShortcuts: z.array(NavOption).max(4).optional(),
  theme: z.enum(["light", "dark"]).optional(),
  calendarView: z.enum(["month", "week", "day"]).optional(),
  taskListView: z.enum(["card", "list"]).optional(),
  showCompletedTasks: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  taskNotifications: z.boolean().optional(),
  issueNotifications: z.boolean().optional(),
  materialNotifications: z.boolean().optional(),
  calendarNotifications: z.boolean().optional(),
  colabNotifications: z.boolean().optional(),
  passwordExpiryDays: z.number().int().min(1).max(365).optional(),
  requirePasswordChange: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
}).strict();

export const updateUserSchema = createInsertSchema(users).pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  birthDate: true,
  role: true,
  location: true,
  isActive: true,
  isApproved: true,
  mustChangePassword: true,
  navShortcuts: true,
}).extend({
  lastLogin: z.date().optional(),
  passwordLastChangedAt: z.date().optional(),
}).partial();

export const updateProfileSchema = createInsertSchema(users).pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  birthDate: true,
}).extend({
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  birthDate: z.date().optional().nullable(),
}).partial();

// Navigation preferences schema  
export const updateNavPrefsSchema = z.object({
  navShortcuts: z.array(NavOption).max(4).optional()
});

export const reviewRegistrationRequestSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewNotes: z.string().optional(),
  assignedRole: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters long"),
  confirmPassword: z.string().min(1, "Password confirmation is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
}).extend({
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().optional().or(z.date().optional()),
  recurrenceType: RecurrenceType.optional(),
  recurrenceInterval: z.number().int().min(1).max(365).optional(),
});

export const insertMaterialRequestSchema = createInsertSchema(materialRequests).omit({
  id: true,
  createdAt: true,
});

export const insertCommunicationSchema = createInsertSchema(communications).omit({
  id: true,
  createdAt: true,
});

export const insertVacancySchema = createInsertSchema(vacancies)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    property: z.string().min(1, "Property is required"),
    apartmentNumber: z.string().min(1, "Apartment number is required"),
    startDate: z.string().datetime().optional().or(z.date().optional()),
    endDate: z.string().datetime().optional().or(z.date().optional()),
  });

export const insertColabMessageSchema = createInsertSchema(colabMessages).omit({
  id: true,
  createdAt: true,
});

export const insertIssueSchema = createInsertSchema(issues)
  .omit({
    id: true,
    createdAt: true,
    resolvedAt: true,
  })
  .extend({
    description: z.string().min(10, "Please provide a detailed description (at least 10 characters)"),
    urgency: z.enum(["emergency", "high", "normal"]),
    category: z.enum(["idle_elevator", "no_heat_hot_water", "no_electricity"]),
    property: z.string().optional(),
    contactMethod: z.enum(["email", "phone", "app"]).optional(),
  });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type UserRegistrationRequest = typeof userRegistrationRequests.$inferSelect;
export type InsertUserRegistrationRequest = z.infer<typeof insertUserRegistrationRequestSchema>;
export type ReviewRegistrationRequest = z.infer<typeof reviewRegistrationRequestSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type MaterialRequest = typeof materialRequests.$inferSelect;
export type InsertMaterialRequest = z.infer<typeof insertMaterialRequestSchema>;
export type Communication = typeof communications.$inferSelect;
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type Vacancy = typeof vacancies.$inferSelect;
export type InsertVacancy = z.infer<typeof insertVacancySchema>;
export type ColabMessage = typeof colabMessages.$inferSelect;
export type InsertColabMessage = z.infer<typeof insertColabMessageSchema>;
export type Issue = typeof issues.$inferSelect;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UpdateUserSettings = z.infer<typeof updateUserSettingsSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type UpdateNavPrefs = z.infer<typeof updateNavPrefsSchema>;
