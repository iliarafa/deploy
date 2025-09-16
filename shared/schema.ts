import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Navigation shortcut options
export const NavOption = z.enum(["today", "log", "colab", "tasks", "materials", "vacancies", "issues", "admin", "calendar"]);
export type NavShortcutId = z.infer<typeof NavOption>;

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

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  priority: text("priority").notNull().default("standard"),
  status: text("status").notNull().default("pending"),
  location: text("location"),
  assignedTo: text("assigned_to"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
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
  category: text("category").notNull().default("other"), // maintenance, tenant_relations, security, administrative, utilities, other
  property: text("property"),
  apartmentNumber: text("apartment_number"),
  affectedParties: text("affected_parties").array(), // tenants, staff, contractors, public
  preferredTimeline: text("preferred_timeline").default("no_timeline"), // asap, week, month, no_timeline
  contactMethod: text("contact_method").default("email"), // email, phone, app
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
  colabMessages: many(colabMessages),
  materialRequests: many(materialRequests),
  reportedIssues: many(issues),
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

export const tasksRelations = relations(tasks, ({ many }) => ({
  communications: many(communications),
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
    category: z.enum(["maintenance", "tenant_relations", "security", "administrative", "utilities", "other"]),
    property: z.string().optional(),
    apartmentNumber: z.string().optional(),
    affectedParties: z.array(z.enum(["tenants", "staff", "contractors", "public"])).optional(),
    preferredTimeline: z.enum(["asap", "week", "month", "no_timeline"]).optional(),
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
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type UpdateNavPrefs = z.infer<typeof updateNavPrefsSchema>;
