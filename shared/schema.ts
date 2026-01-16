import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, date, boolean, jsonb, uuid, inet, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Helper to add sync flags to any table
const syncFields = {
  isLocal: boolean("is_local").default(false),
  synced: boolean("synced").default(true),
  pendingSync: boolean("pending_sync").default(false),
};

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull().default("admin"),
  isActive: boolean("is_active").default(true).notNull(),
  emailVerifiedAt: timestamp("email_verified_at"),
  totpSecret: text("totp_secret"),
  mfaEnabled: boolean("mfa_enabled").default(false).notNull(),
  fcmToken: text("fcm_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
  ...syncFields,
});

// Authentication User Sessions table
export const authUserSessions = pgTable("auth_user_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sessionToken: varchar("session_token"),
  deviceFingerprint: varchar("device_fingerprint"),
  userAgent: text("user_agent"),
  ipAddress: inet("ip_address"),
  locationData: jsonb("location_data"),
  isTrustedDevice: boolean("is_trusted_device").default(false).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  lastActivity: timestamp("last_activity").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deviceId: varchar("device_id"),
  deviceName: varchar("device_name"),
  browserName: varchar("browser_name"),
  browserVersion: varchar("browser_version"),
  osName: varchar("os_name"),
  osVersion: varchar("os_version"),
  country: varchar("country"),
  city: varchar("city"),
  timezone: varchar("timezone"),
  loginMethod: varchar("login_method"),
  securityFlags: jsonb("security_flags"),
  deviceType: varchar("device_type"),
  refreshTokenHash: text("refresh_token_hash"),
  accessTokenHash: text("access_token_hash"),
  isRevoked: boolean("is_revoked").default(false).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokedReason: varchar("revoked_reason"),
});

// Email Verification Tokens table
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  email: text("email").notNull(),
  token: varchar("token").notNull().unique(),
  tokenHash: varchar("token_hash").notNull(),
  verificationLink: text("verification_link").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  attemptsCount: integer("attempts_count").default(0).notNull(),
});

// Password Reset Tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: varchar("token").notNull().unique(),
  tokenHash: varchar("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
});

// Project Types table
export const projectTypes = pgTable("project_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Worker Types table
export const workerTypes = pgTable("worker_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  usageCount: integer("usage_count").default(1).notNull(),
  lastUsed: timestamp("last_used").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location"),
  clientName: text("client_name"),
  budget: decimal("budget", { precision: 15, scale: 2 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: text("status").notNull().default("active"),
  engineerId: varchar("engineer_id"),
  managerName: text("manager_name"),
  contactPhone: text("contact_phone"),
  notes: text("notes"),
  imageUrl: text("image_url"),
  projectTypeId: integer("project_type_id").references(() => projectTypes.id, { onDelete: "set null" }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Workers table
export const workers = pgTable("workers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  dailyWage: decimal("daily_wage", { precision: 15, scale: 2 }).notNull(),
  phone: text("phone"),
  hireDate: text("hire_date"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Wells table
export const wells = pgTable("wells", {
  id: serial("id").primaryKey(),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  wellNumber: integer("well_number").notNull(),
  ownerName: text("owner_name").notNull(),
  region: varchar("region", { length: 100 }).notNull(),
  numberOfBases: integer("number_of_bases").notNull(),
  baseCount: integer("base_count"),
  numberOfPanels: integer("number_of_panels").notNull(),
  panelCount: integer("panel_count"),
  wellDepth: integer("well_depth").notNull(),
  waterLevel: integer("water_level"),
  numberOfPipes: integer("number_of_pipes").notNull(),
  pipeCount: integer("pipe_count"),
  fanType: varchar("fan_type", { length: 100 }),
  pumpPower: integer("pump_power"),
  status: text("status").notNull().default("pending"),
  completionPercentage: decimal("completion_percentage", { precision: 5, scale: 2 }).default('0').notNull(),
  startDate: date("start_date"),
  completionDate: date("completion_date"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tools & Inventory
export const tools = pgTable("tools", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  category: text("category").notNull(),
  status: text("status").notNull().default("available"),
  projectId: varchar("project_id").references(() => projects.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const toolMovements = pgTable("tool_movements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  toolId: uuid("tool_id").references(() => tools.id),
  projectId: varchar("project_id").references(() => projects.id),
  type: text("type").notNull(),
  date: timestamp("date").defaultNow(),
  notes: text("notes"),
});

export const toolCategories = pgTable("tool_categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
});

export const toolStock = pgTable("tool_stock", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  toolId: uuid("tool_id").references(() => tools.id),
  quantity: integer("quantity").notNull(),
});

export const toolReservations = pgTable("tool_reservations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  toolId: uuid("tool_id").references(() => tools.id),
  userId: varchar("user_id").references(() => users.id),
});

export const toolPurchaseItems = pgTable("tool_purchase_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
});

export const toolCostTracking = pgTable("tool_cost_tracking", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  toolId: uuid("tool_id").references(() => tools.id),
  cost: decimal("cost", { precision: 15, scale: 2 }),
});

export const toolMaintenanceLogs = pgTable("tool_maintenance_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  toolId: uuid("tool_id").references(() => tools.id),
  description: text("description"),
});

export const toolUsageAnalytics = pgTable("tool_usage_analytics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  toolId: uuid("tool_id").references(() => tools.id),
});

export const toolNotifications = pgTable("tool_notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  message: text("message").notNull(),
});

// Maintenance
export const maintenanceSchedules = pgTable("maintenance_schedules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
});

export const maintenanceTasks = pgTable("maintenance_tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  description: text("description").notNull(),
});

// Materials & Suppliers
export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  unit: text("unit").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const materialCategories = pgTable("material_categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
});

export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  address: text("address"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Material Purchases table
export const materialPurchases = pgTable("material_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  materialName: text("material_name").notNull(),
  materialCategory: text("material_category"),
  materialUnit: text("material_unit"),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unit: text("unit").notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }),
  remainingAmount: decimal("remaining_amount", { precision: 15, scale: 2 }),
  purchaseDate: text("purchase_date").notNull(),
  purchaseType: text("purchase_type"),
  supplierName: text("supplier_name"),
  receiptNumber: text("receipt_number"),
  invoiceNumber: text("invoice_number"),
  invoiceDate: text("invoice_date"),
  invoicePhoto: text("invoice_photo"),
  notes: text("notes"),
  description: text("description"), // العمود المطلوب
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Fund Transfers table
export const fundTransfers = pgTable("fund_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  transferDate: timestamp("transfer_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Transportation Expenses table
export const transportationExpenses = pgTable("transportation_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  workerId: varchar("worker_id").references(() => workers.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  category: text("category"),
  date: text("date").notNull(),
  notes: text("notes"),
  wellId: integer("well_id").references(() => wells.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workerAttendance = pgTable("worker_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  workerId: varchar("worker_id").notNull().references(() => workers.id, { onDelete: "cascade" }),
  attendanceDate: text("attendance_date").notNull(),
  date: text("date"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  workDescription: text("work_description"),
  description: text("description"), // العمود المفقود
  workDays: decimal("work_days", { precision: 5, scale: 2 }),
  dailyWage: decimal("daily_wage", { precision: 15, scale: 2 }).notNull(),
  actualWage: decimal("actual_wage", { precision: 15, scale: 2 }),
  totalPay: decimal("total_pay", { precision: 15, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }),
  remainingAmount: decimal("remaining_amount", { precision: 15, scale: 2 }),
  paymentType: text("payment_type"),
  isPresent: boolean("is_present").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workerTransfers = pgTable("worker_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerId: varchar("worker_id").notNull().references(() => workers.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  recipientName: text("recipient_name"),
  transferDate: text("transfer_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workerBalances = pgTable("worker_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerId: varchar("worker_id").notNull().references(() => workers.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  currentBalance: decimal("current_balance", { precision: 15, scale: 2 }).default('0').notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dailyExpenseSummaries = pgTable("daily_expense_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  totalIncome: decimal("total_income", { precision: 15, scale: 2 }).notNull(),
  totalExpenses: decimal("total_expenses", { precision: 15, scale: 2 }).notNull(),
  remainingBalance: decimal("remaining_balance", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workerMiscExpenses = pgTable("worker_misc_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  date: text("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Accounts & Finance Primitives
export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  balance: decimal("balance", { precision: 15, scale: 2 }).default('0').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accountBalances = pgTable("account_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").references(() => accounts.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  date: timestamp("date").defaultNow(),
  description: text("description"),
});

export const transactionLines = pgTable("transaction_lines", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  accountId: varchar("account_id").references(() => accounts.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
});

export const journals = pgTable("journals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").defaultNow(),
  description: text("description"),
});

export const financePayments = pgTable("finance_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").references(() => accounts.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const financeEvents = pgTable("finance_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Approvals & Audit
export const approvals = pgTable("approvals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  requestedBy: varchar("requested_by").references(() => users.id),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const actions = pgTable("actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notifications & Messaging
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), 
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationReadStates = pgTable("notification_read_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  notificationId: varchar("notification_id").notNull(),
  notificationType: text("notification_type").notNull(),
  readAt: timestamp("read_at").defaultNow().notNull(),
});

export const systemNotifications = pgTable("system_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  isRead: boolean("is_read").default(false).notNull(),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const systemEvents = pgTable("system_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const channels = pgTable("channels", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
});

// AI & Analytics
export const aiChatSessions = pgTable("ai_chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiChatMessages = pgTable("ai_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiUsageStats = pgTable("ai_usage_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  tokensUsed: integer("tokens_used").default(0),
});

// Misc / System
export const autocompleteData = pgTable("autocomplete_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  value: text("value").notNull(),
  usageCount: integer("usage_count").default(1).notNull(),
  lastUsed: timestamp("last_used").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectFundTransfers = pgTable("project_fund_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromProjectId: varchar("from_project_id").references(() => projects.id),
  toProjectId: varchar("to_project_id").references(() => projects.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  transferReason: text("transfer_reason"),
  transferDate: timestamp("transfer_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userProjectPermissions = pgTable("user_project_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  projectId: varchar("project_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const permissionAuditLogs = pgTable("permission_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wellTasks = pgTable("well_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
});

export const wellTaskAccounts = pgTable("well_task_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
});

export const wellExpenses = pgTable("well_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
});

export const wellAuditLogs = pgTable("well_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const buildDeployments = pgTable("build_deployments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  buildNumber: integer("build_number").notNull(),
  status: text("status").notNull(),
  currentStep: text("current_step"),
  progress: integer("progress").default(0),
  version: text("version"),
  appType: text("app_type"),
  logs: jsonb("logs").$type<{timestamp: string, message: string, type: string}[]>(),
  steps: jsonb("steps"),
  triggeredBy: varchar("triggered_by").references(() => users.id),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
});

export const printSettings = pgTable("print_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportType: text("report_type").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reportTemplates = pgTable("report_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
});

export const securityPolicies = pgTable("security_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const securityPolicySuggestions = pgTable("security_policy_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  suggestion: text("suggestion").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const securityPolicyViolations = pgTable("security_policy_violations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  details: text("details").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const securityPolicyImplementations = pgTable("security_policy_implementations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  policyId: varchar("policy_id").references(() => securityPolicies.id),
  details: text("details"),
});

export const toolStockItems = pgTable("tool_stock_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
});

export const supplierPayments = pgTable("supplier_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const enhancedInsertProjectSchema = insertProjectSchema;
export const insertWorkerSchema = createInsertSchema(workers).omit({ id: true, createdAt: true });
export const enhancedInsertWorkerSchema = insertWorkerSchema;
export const insertWorkerAttendanceSchema = createInsertSchema(workerAttendance).omit({ id: true, createdAt: true });
export const insertMaterialSchema = createInsertSchema(materials).omit({ id: true, createdAt: true });
export const insertMaterialCategorySchema = createInsertSchema(materialCategories).omit({ id: true });
export const insertMaterialPurchaseSchema = createInsertSchema(materialPurchases).omit({ id: true, createdAt: true });
export const insertFundTransferSchema = createInsertSchema(fundTransfers).omit({ id: true, createdAt: true });
export const insertTransportationExpenseSchema = createInsertSchema(transportationExpenses).omit({ id: true, createdAt: true });
export const insertWorkerTransferSchema = createInsertSchema(workerTransfers).omit({ id: true, createdAt: true });
export const insertWorkerBalanceSchema = createInsertSchema(workerBalances).omit({ id: true, lastUpdated: true, createdAt: true });
export const insertDailyExpenseSummarySchema = createInsertSchema(dailyExpenseSummaries).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkerMiscExpenseSchema = createInsertSchema(workerMiscExpenses).omit({ id: true, createdAt: true });
export const insertToolSchema = createInsertSchema(tools).omit({ id: true, createdAt: true });
export const insertToolMovementSchema = createInsertSchema(toolMovements).omit({ id: true });
export const insertToolNotificationSchema = createInsertSchema(toolNotifications).omit({ id: true });
export const insertMaintenanceScheduleSchema = createInsertSchema(maintenanceSchedules).omit({ id: true });
export const insertMaintenanceTaskSchema = createInsertSchema(maintenanceTasks).omit({ id: true });
export const insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({ id: true });
export const insertProjectTypeSchema = createInsertSchema(projectTypes).omit({ id: true, createdAt: true });
export const insertWellSchema = createInsertSchema(wells).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true, createdAt: true });
export const insertAccountBalanceSchema = createInsertSchema(accountBalances).omit({ id: true });
export const insertFinancePaymentSchema = createInsertSchema(financePayments).omit({ id: true, createdAt: true });
export const insertFinanceEventSchema = createInsertSchema(financeEvents).omit({ id: true, createdAt: true });
export const insertActionSchema = createInsertSchema(actions).omit({ id: true, createdAt: true });
export const insertSystemNotificationSchema = createInsertSchema(systemNotifications).omit({ id: true, createdAt: true });
export const insertAiChatSessionSchema = createInsertSchema(aiChatSessions).omit({ id: true, createdAt: true });
export const insertAiChatMessageSchema = createInsertSchema(aiChatMessages).omit({ id: true, createdAt: true });
export const insertAiUsageStatSchema = createInsertSchema(aiUsageStats).omit({ id: true });
export const insertProjectFundTransferSchema = createInsertSchema(projectFundTransfers).omit({ id: true, createdAt: true });
export const insertUserProjectPermissionSchema = createInsertSchema(userProjectPermissions).omit({ id: true, createdAt: true });
export const insertPermissionAuditLogSchema = createInsertSchema(permissionAuditLogs).omit({ id: true, createdAt: true });
export const insertWellTaskSchema = createInsertSchema(wellTasks).omit({ id: true });
export const insertWellTaskAccountSchema = createInsertSchema(wellTaskAccounts).omit({ id: true });
export const insertWellExpenseSchema = createInsertSchema(wellExpenses).omit({ id: true });
export const insertWellAuditLogSchema = createInsertSchema(wellAuditLogs).omit({ id: true, createdAt: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true });
export const insertSupplierPaymentSchema = createInsertSchema(supplierPayments).omit({ id: true, createdAt: true });
export const insertWorkerTypeSchema = createInsertSchema(workerTypes).omit({ id: true, createdAt: true });
export const insertAutocompleteDataSchema = createInsertSchema(autocompleteData).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Worker = typeof workers.$inferSelect;
export type WorkerAttendance = typeof workerAttendance.$inferSelect;
export type FundTransfer = typeof fundTransfers.$inferSelect;
export type MaterialPurchase = typeof materialPurchases.$inferSelect;
export type TransportationExpense = typeof transportationExpenses.$inferSelect;
export type WorkerTransfer = typeof workerTransfers.$inferSelect;
export type WorkerBalance = typeof workerBalances.$inferSelect;
export type DailyExpenseSummary = typeof dailyExpenseSummaries.$inferSelect;
export type WorkerMiscExpense = typeof workerMiscExpenses.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertWorker = z.infer<typeof insertWorkerSchema>;
export type InsertWorkerAttendance = z.infer<typeof insertWorkerAttendanceSchema>;
export type InsertMaterialPurchase = z.infer<typeof insertMaterialPurchaseSchema>;
export type InsertTransportationExpense = z.infer<typeof insertTransportationExpenseSchema>;
export type InsertWorkerTransfer = z.infer<typeof insertWorkerTransferSchema>;
export type InsertWorkerBalance = z.infer<typeof insertWorkerBalanceSchema>;
export type InsertDailyExpenseSummary = z.infer<typeof insertDailyExpenseSummarySchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertFundTransfer = z.infer<typeof insertFundTransferSchema>;
export type InsertWorkerMiscExpense = z.infer<typeof insertWorkerMiscExpenseSchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type SupplierPayment = typeof supplierPayments.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type InsertSupplierPayment = z.infer<typeof insertSupplierPaymentSchema>;
export type WorkerType = typeof workerTypes.$inferSelect;
export type AutocompleteData = typeof autocompleteData.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type TransactionLine = typeof transactionLines.$inferSelect;
export type Journal = typeof journals.$inferSelect;
export type Approval = typeof approvals.$inferSelect;
export type Action = typeof actions.$inferSelect;
export type SystemNotification = typeof systemNotifications.$inferSelect;
export type SystemEvent = typeof systemEvents.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Channel = typeof channels.$inferSelect;
export type ToolMovement = typeof toolMovements.$inferSelect;
