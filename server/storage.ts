import { 
  type Project, type Worker, type FundTransfer, type WorkerAttendance, 
  type Material, type MaterialPurchase, type TransportationExpense, type DailyExpenseSummary,
  type WorkerTransfer, type WorkerBalance, type AutocompleteData, type WorkerType, type WorkerMiscExpense, type User,
  type Supplier, type SupplierPayment, type ProjectFundTransfer,
  type InsertProject, type InsertWorker, type InsertFundTransfer, type InsertWorkerAttendance,
  type InsertMaterial, type InsertMaterialPurchase, type InsertTransportationExpense, type InsertDailyExpenseSummary,
  type InsertWorkerTransfer, type InsertWorkerBalance, type InsertAutocompleteData, type InsertWorkerType, type InsertWorkerMiscExpense, type InsertUser,
  type InsertSupplier, type InsertSupplierPayment, type InsertProjectFundTransfer
} from "@shared/schema";
import { FirebaseStorage } from "./firebase-storage";

export interface IStorage {
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectByName(name: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;
  
  // Workers
  getWorkers(): Promise<Worker[]>;
  getWorker(id: string): Promise<Worker | undefined>;
  getWorkerByName(name: string): Promise<Worker | undefined>;
  createWorker(worker: InsertWorker): Promise<Worker>;
  updateWorker(id: string, worker: Partial<InsertWorker>): Promise<Worker | undefined>;
  deleteWorker(id: string): Promise<void>;
  
  // Worker Types
  getWorkerTypes(): Promise<WorkerType[]>;
  createWorkerType(workerType: InsertWorkerType): Promise<WorkerType>;
  
  // Fund Transfers
  getFundTransfers(projectId: string): Promise<FundTransfer[]>;
  getFundTransferByNumber(transferNumber: string): Promise<FundTransfer | undefined>;
  createFundTransfer(transfer: InsertFundTransfer): Promise<FundTransfer>;
  
  // Project Fund Transfers
  getProjectFundTransfers(): Promise<ProjectFundTransfer[]>;
  getProjectFundTransfer(id: string): Promise<ProjectFundTransfer | undefined>;
  createProjectFundTransfer(transfer: InsertProjectFundTransfer): Promise<ProjectFundTransfer>;
  updateProjectFundTransfer(id: string, transfer: Partial<InsertProjectFundTransfer>): Promise<ProjectFundTransfer | undefined>;
  deleteProjectFundTransfer(id: string): Promise<void>;
  
  // Worker Attendance
  getWorkerAttendance(projectId: string): Promise<WorkerAttendance[]>;
  getWorkerAttendanceById(id: string): Promise<WorkerAttendance | null>;
  createWorkerAttendance(attendance: InsertWorkerAttendance): Promise<WorkerAttendance>;
  updateWorkerAttendance(id: string, attendance: Partial<InsertWorkerAttendance>): Promise<WorkerAttendance | undefined>;
  deleteWorkerAttendance(id: string): Promise<void>;
  
  // Materials
  getMaterials(): Promise<Material[]>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: string, material: Partial<InsertMaterial>): Promise<Material | undefined>;
  findMaterialByNameAndUnit(name: string, unit: string): Promise<Material | undefined>;
  
  // Material Purchases
  getMaterialPurchases(projectId: string): Promise<MaterialPurchase[]>;
  getMaterialPurchasesWithFilters(filters: any): Promise<MaterialPurchase[]>;
  getMaterialPurchasesDateRange(): Promise<{ minDate: string; maxDate: string }>;
  getMaterialPurchaseById(id: string): Promise<MaterialPurchase | null>;
  createMaterialPurchase(purchase: InsertMaterialPurchase): Promise<MaterialPurchase>;
  updateMaterialPurchase(id: string, purchase: Partial<InsertMaterialPurchase>): Promise<MaterialPurchase | undefined>;
  deleteMaterialPurchase(id: string): Promise<void>;
  
  // Transportation Expenses
  getAllTransportationExpenses(): Promise<TransportationExpense[]>;
  getTransportationExpenses(projectId: string): Promise<TransportationExpense[]>;
  createTransportationExpense(expense: InsertTransportationExpense): Promise<TransportationExpense>;
  updateTransportationExpense(id: string, expense: Partial<InsertTransportationExpense>): Promise<TransportationExpense | undefined>;
  deleteTransportationExpense(id: string): Promise<void>;
  
  // Daily Expense Summaries
  getDailyExpenseSummary(projectId: string, date: string): Promise<DailyExpenseSummary | undefined>;
  createOrUpdateDailyExpenseSummary(summary: InsertDailyExpenseSummary): Promise<DailyExpenseSummary>;
  updateDailyExpenseSummary(id: string, summary: Partial<InsertDailyExpenseSummary>): Promise<DailyExpenseSummary | undefined>;
  getPreviousDayBalance(projectId: string, currentDate: string): Promise<string>;
  deleteDailySummary(projectId: string, date: string): Promise<void>;
  getDailySummary(projectId: string, date: string): Promise<DailyExpenseSummary | null>;
  
  // Worker Balance Management
  getWorkerBalance(workerId: string, projectId: string): Promise<WorkerBalance | undefined>;
  updateWorkerBalance(workerId: string, projectId: string, balance: Partial<InsertWorkerBalance>): Promise<WorkerBalance>;
  
  // Worker Transfers
  getWorkerTransfers(workerId: string, projectId?: string): Promise<WorkerTransfer[]>;
  getWorkerTransfer(id: string): Promise<WorkerTransfer | null>;
  createWorkerTransfer(transfer: InsertWorkerTransfer): Promise<WorkerTransfer>;
  updateWorkerTransfer(id: string, transfer: Partial<InsertWorkerTransfer>): Promise<WorkerTransfer | undefined>;
  deleteWorkerTransfer(id: string): Promise<void>;
  getAllWorkerTransfers(): Promise<WorkerTransfer[]>;
  getFilteredWorkerTransfers(projectId?: string, date?: string): Promise<WorkerTransfer[]>;
  
  // Project Statistics
  getProjectStatistics(projectId: string): Promise<any>;
  
  // Reports
  getWorkerAccountStatement(workerId: string, projectId?: string): Promise<{
    attendance: any[];
    transfers: any[];
    balance: any | null;
  }>;
  
  // Multi-project worker management
  getWorkersWithMultipleProjects(): Promise<any[]>;
  getWorkerMultiProjectStatement(workerId: string): Promise<any>;
  getWorkerProjects(workerId: string): Promise<Project[]>;
  updateDailySummaryForDate(projectId: string, date: string): Promise<void>;
  getDailyExpensesRange(projectId: string, dateFrom: string, dateTo: string): Promise<any[]>;
  
  // Autocomplete data
  getAutocompleteData(category: string): Promise<AutocompleteData[]>;
  saveAutocompleteData(data: InsertAutocompleteData): Promise<AutocompleteData>;
  removeAutocompleteData(category: string, value: string): Promise<void>;
  
  // Worker miscellaneous expenses
  getWorkerMiscExpenses(projectId: string): Promise<WorkerMiscExpense[]>;
  getWorkerMiscExpense(id: string): Promise<WorkerMiscExpense | null>;
  createWorkerMiscExpense(expense: InsertWorkerMiscExpense): Promise<WorkerMiscExpense>;
  updateWorkerMiscExpense(id: string, expense: Partial<InsertWorkerMiscExpense>): Promise<WorkerMiscExpense | undefined>;
  deleteWorkerMiscExpense(id: string): Promise<void>;
  
  // Advanced Reports
  getExpensesForReport(projectId: string, dateFrom: string, dateTo: string): Promise<any[]>;
  getIncomeForReport(projectId: string, dateFrom: string, dateTo: string): Promise<any[]>;
  
  // Users
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  
  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  getSupplierByName(name: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: string): Promise<void>;
  
  // Supplier Payments
  getAllSupplierPayments(): Promise<SupplierPayment[]>;
  getSupplierPayments(supplierId: string, projectId?: string): Promise<SupplierPayment[]>;
  getSupplierPayment(id: string): Promise<SupplierPayment | undefined>;
  createSupplierPayment(payment: InsertSupplierPayment): Promise<SupplierPayment>;
  updateSupplierPayment(id: string, payment: Partial<InsertSupplierPayment>): Promise<SupplierPayment | undefined>;
  deleteSupplierPayment(id: string): Promise<void>;
  
  // Supplier Reports
  getSupplierAccountStatement(supplierId: string, projectId?: string): Promise<any>;
  getSupplierStatistics(filters?: any): Promise<any>;
  getPurchasesBySupplier(supplierId: string, purchaseType?: string): Promise<MaterialPurchase[]>;
  
  // Database Administration
  getDatabaseTables(): Promise<any[]>;
  toggleTableRLS(tableName: string, enable: boolean): Promise<any>;
  getTablePolicies(tableName: string): Promise<any[]>;
  analyzeSecurityThreats(): Promise<any>;
  
  // Full Mirroring Support
  getAllTableData(tables: string[]): Promise<Record<string, any[]>>;
  
  // Monitoring
  saveMonitoringLog(log: any): Promise<any>;
  getMonitoringLogs(limit?: number): Promise<any[]>;
}

export const storage = new FirebaseStorage();
