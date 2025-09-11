import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  previousTenantDuration: text("previous_tenant_duration"),
  images: text("images").array(),
  notes: text("notes"),
  status: text("status").notNull().default("vacant"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  approvedByUser: one(users, {
    fields: [users.approvedBy],
    references: [users.id],
  }),
  sessions: many(userSessions),
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

export const insertVacancySchema = createInsertSchema(vacancies).omit({
  id: true,
  createdAt: true,
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
export type ChangePassword = z.infer<typeof changePasswordSchema>;
