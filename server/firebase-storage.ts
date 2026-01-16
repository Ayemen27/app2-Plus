import { 
  type Project, type Worker, type FundTransfer, type WorkerAttendance, 
  type Material, type MaterialPurchase, type TransportationExpense, type DailyExpenseSummary,
  type WorkerTransfer, type WorkerBalance, type AutocompleteData, type WorkerType, type WorkerMiscExpense, type User,
  type Supplier, type SupplierPayment, type PrintSettings, type ProjectFundTransfer,
  type ReportTemplate, type Notification, type NotificationReadState,
  type InsertProject, type InsertWorker, type InsertFundTransfer, type InsertWorkerAttendance,
  type MaterialPurchase as InsertMaterialPurchase, type InsertTransportationExpense, type InsertDailyExpenseSummary,
  type InsertWorkerTransfer, type InsertWorkerBalance, type InsertAutocompleteData, type InsertWorkerMiscExpense, type InsertUser,
  type InsertSupplier, type InsertSupplierPayment, type InsertPrintSettings, type InsertProjectFundTransfer,
  type InsertReportTemplate, type Equipment, type InsertEquipment, type EquipmentMovement, type InsertEquipmentMovement,
  type InsertMaterial, type InsertWorkerType
} from "@shared/schema";
import { IStorage } from "./storage";
import { db as fsDb } from "./config/firebase-config";

export class FirebaseStorage implements IStorage {
  private async getCollection<T>(collectionName: string): Promise<T[]> {
    const snapshot = await fsDb.collection(collectionName).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
  }

  private async getDoc<T>(collectionName: string, id: string): Promise<T | undefined> {
    const doc = await fsDb.collection(collectionName).doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as unknown as T) : undefined;
  }

  // Projects
  async getProjects(): Promise<Project[]> { return this.getCollection<Project>("projects"); }
  async getProject(id: string): Promise<Project | undefined> { return this.getDoc<Project>("projects", id); }
  async getProjectByName(name: string): Promise<Project | undefined> {
    const snapshot = await fsDb.collection("projects").where("name", "==", name.trim()).limit(1).get();
    return snapshot.empty ? undefined : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Project);
  }
  async createProject(project: InsertProject): Promise<Project> {
    const docRef = await fsDb.collection("projects").add({ ...project, name: project.name.trim(), createdAt: new Date() });
    return { id: docRef.id, ...(await docRef.get()).data() } as Project;
  }
  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    await fsDb.collection("projects").doc(id).update({ ...project, updatedAt: new Date() });
    return this.getDoc<Project>("projects", id);
  }
  async deleteProject(id: string): Promise<void> { await fsDb.collection("projects").doc(id).delete(); }

  // Workers
  async getWorkers(): Promise<Worker[]> { return this.getCollection<Worker>("workers"); }
  async getWorker(id: string): Promise<Worker | undefined> { return this.getDoc<Worker>("workers", id); }
  async getWorkerByName(name: string): Promise<Worker | undefined> {
    const snapshot = await fsDb.collection("workers").where("name", "==", name.trim()).limit(1).get();
    return snapshot.empty ? undefined : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Worker);
  }
  async createWorker(worker: InsertWorker): Promise<Worker> {
    const docRef = await fsDb.collection("workers").add({ ...worker, name: worker.name.trim(), createdAt: new Date() });
    return { id: docRef.id, ...(await docRef.get()).data() } as Worker;
  }
  async updateWorker(id: string, worker: Partial<InsertWorker>): Promise<Worker | undefined> {
    await fsDb.collection("workers").doc(id).update({ ...worker, updatedAt: new Date() });
    return this.getDoc<Worker>("workers", id);
  }
  async deleteWorker(id: string): Promise<void> { await fsDb.collection("workers").doc(id).delete(); }

  // Reports & Financials (Basic logic for migration completeness)
  async getWorkerAccountStatement(workerId: string, projectId?: string): Promise<any> {
    const attendance = await fsDb.collection("workerAttendance").where("workerId", "==", workerId).get();
    const transfers = await fsDb.collection("workerTransfers").where("workerId", "==", workerId).get();
    return {
      attendance: attendance.docs.map(d => d.data()),
      transfers: transfers.docs.map(d => d.data()),
      balance: null
    };
  }

  async getProjectStatistics(projectId: string): Promise<any> {
    const project = await this.getProject(projectId);
    return { project, stats: { totalWorkers: 0, totalExpenses: 0 } };
  }

  // Users
  async getUsers(): Promise<User[]> { return this.getCollection<User>("users"); }
  async getUser(id: string): Promise<User | undefined> { return this.getDoc<User>("users", id); }
  async getUserByEmail(email: string): Promise<User | undefined> {
    const snapshot = await fsDb.collection("users").where("email", "==", email.toLowerCase().trim()).limit(1).get();
    return snapshot.empty ? undefined : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User);
  }
  async createUser(user: InsertUser): Promise<User> {
    const docRef = await fsDb.collection("users").add({ ...user, email: user.email.toLowerCase().trim(), createdAt: new Date() });
    return { id: docRef.id, ...(await docRef.get()).data() } as User;
  }
  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    await fsDb.collection("users").doc(id).update({ ...user, updatedAt: new Date() });
    return this.getDoc<User>("users", id);
  }
  async deleteUser(id: string): Promise<void> { await fsDb.collection("users").doc(id).delete(); }

  // Generic implementation for missing methods to satisfy IStorage
  async getWorkerAttendanceById(id: string): Promise<WorkerAttendance | null> { return this.getDoc<WorkerAttendance>("workerAttendance", id) || null; }
  async updateWorkerAttendance(id: string, attendance: Partial<InsertWorkerAttendance>): Promise<WorkerAttendance | undefined> {
    await fsDb.collection("workerAttendance").doc(id).update(attendance);
    return this.getDoc<WorkerAttendance>("workerAttendance", id);
  }
  async deleteWorkerAttendance(id: string): Promise<void> { await fsDb.collection("workerAttendance").doc(id).delete(); }

  async updateMaterial(id: string, material: Partial<InsertMaterial>): Promise<Material | undefined> {
    await fsDb.collection("materials").doc(id).update(material);
    return this.getDoc<Material>("materials", id);
  }

  async getMaterialPurchasesWithFilters(filters: any): Promise<MaterialPurchase[]> { return []; }
  async getMaterialPurchasesDateRange(): Promise<{ minDate: string; maxDate: string }> { return { minDate: "", maxDate: "" }; }
  async getMaterialPurchaseById(id: string): Promise<MaterialPurchase | null> { return this.getDoc<MaterialPurchase>("materialPurchases", id) || null; }
  async updateMaterialPurchase(id: string, purchase: Partial<InsertMaterialPurchase>): Promise<MaterialPurchase | undefined> {
    await fsDb.collection("materialPurchases").doc(id).update(purchase);
    return this.getDoc<MaterialPurchase>("materialPurchases", id);
  }
  async deleteMaterialPurchase(id: string): Promise<void> { await fsDb.collection("materialPurchases").doc(id).delete(); }

  async updateWorkerMiscExpense(id: string, expense: Partial<InsertWorkerMiscExpense>): Promise<WorkerMiscExpense | undefined> {
    await fsDb.collection("workerMiscExpenses").doc(id).update(expense);
    return this.getDoc<WorkerMiscExpense>("workerMiscExpenses", id);
  }
  async deleteWorkerMiscExpense(id: string): Promise<void> { await fsDb.collection("workerMiscExpenses").doc(id).delete(); }
  async getWorkerMiscExpenses(projectId: string): Promise<WorkerMiscExpense[]> {
    const snapshot = await fsDb.collection("workerMiscExpenses").where("projectId", "==", projectId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as WorkerMiscExpense));
  }
  async getWorkerMiscExpense(id: string): Promise<WorkerMiscExpense | null> { return this.getDoc<WorkerMiscExpense>("workerMiscExpenses", id) || null; }
  async createWorkerMiscExpense(expense: InsertWorkerMiscExpense): Promise<WorkerMiscExpense> {
    const docRef = await fsDb.collection("workerMiscExpenses").add({ ...expense, createdAt: new Date() });
    return { id: docRef.id, ...(await docRef.get()).data() } as unknown as WorkerMiscExpense;
  }

  async getExpensesForReport(projectId: string, dateFrom: string, dateTo: string): Promise<any[]> { return []; }
  async getIncomeForReport(projectId: string, dateFrom: string, dateTo: string): Promise<any[]> { return []; }

  // Placeholder implementations for IStorage compatibility
  async getWorkerTypes(): Promise<WorkerType[]> { return this.getCollection<WorkerType>("workerTypes"); }
  async createWorkerType(w: InsertWorkerType): Promise<WorkerType> { return {} as any; }
  async getFundTransfers(p: string): Promise<FundTransfer[]> { return []; }
  async getFundTransferByNumber(n: string): Promise<FundTransfer | undefined> { return undefined; }
  async createFundTransfer(t: InsertFundTransfer): Promise<FundTransfer> { return {} as any; }
  async updateFundTransfer(id: string, t: any): Promise<any> { return {}; }
  async deleteFundTransfer(id: string): Promise<void> {}
  async getProjectFundTransfers(): Promise<ProjectFundTransfer[]> { return this.getCollection<ProjectFundTransfer>("project_fund_transfers"); }
  async getProjectFundTransfer(id: string): Promise<ProjectFundTransfer | undefined> { return this.getDoc<ProjectFundTransfer>("project_fund_transfers", id); }
  async createProjectFundTransfer(transfer: InsertProjectFundTransfer): Promise<ProjectFundTransfer> {
    const docRef = await fsDb.collection("project_fund_transfers").add({ ...transfer, createdAt: new Date() });
    return { id: docRef.id, ...(await docRef.get()).data() } as unknown as ProjectFundTransfer;
  }
  async updateProjectFundTransfer(id: string, transfer: Partial<InsertProjectFundTransfer>): Promise<ProjectFundTransfer | undefined> {
    await fsDb.collection("project_fund_transfers").doc(id).update(transfer);
    return this.getDoc<ProjectFundTransfer>("project_fund_transfers", id);
  }
  async deleteProjectFundTransfer(id: string): Promise<void> { await fsDb.collection("project_fund_transfers").doc(id).delete(); }

  async getAllWorkerTransfers(): Promise<WorkerTransfer[]> { return this.getCollection<WorkerTransfer>("worker_transfers"); }
  async getFilteredWorkerTransfers(projectId?: string, date?: string): Promise<WorkerTransfer[]> {
    let query: any = fsDb.collection("worker_transfers");
    if (projectId) query = query.where("projectId", "==", projectId);
    if (date) query = query.where("transferDate", "==", date);
    const snapshot = await query.get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as unknown as WorkerTransfer));
  }
  async getWorkerProjects(workerId: string): Promise<Project[]> {
    const attendance = await fsDb.collection("worker_attendance").where("workerId", "==", workerId).get();
    const projectIds = Array.from(new Set(attendance.docs.map(d => d.data().projectId)));
    const projects: Project[] = [];
    for (const id of projectIds) {
      const p = await this.getProject(id as string);
      if (p) projects.push(p);
    }
    return projects;
  }
  async getWorkerAttendance(projectId: string): Promise<WorkerAttendance[]> {
    const snapshot = await fsDb.collection("worker_attendance").where("projectId", "==", projectId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as WorkerAttendance));
  }
  async createWorkerAttendance(attendance: InsertWorkerAttendance): Promise<WorkerAttendance> {
    const docRef = await fsDb.collection("worker_attendance").add({ ...attendance, createdAt: new Date() });
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as unknown as WorkerAttendance;
  }

  // Materials
  async getMaterials(): Promise<Material[]> { return this.getCollection<Material>("materials"); }
  async findMaterialByNameAndUnit(name: string, unit: string): Promise<Material | undefined> {
    const snapshot = await fsDb.collection("materials")
      .where("name", "==", name.trim())
      .where("unit", "==", unit)
      .limit(1).get();
    return snapshot.empty ? undefined : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as unknown as Material);
  }
  async createMaterial(material: InsertMaterial): Promise<Material> {
    const docRef = await fsDb.collection("materials").add({ ...material, createdAt: new Date() });
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as unknown as Material;
  }

  // Material Purchases
  async getMaterialPurchases(projectId: string): Promise<MaterialPurchase[]> {
    const snapshot = await fsDb.collection("materialPurchases").where("projectId", "==", projectId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as MaterialPurchase));
  }
  async createMaterialPurchase(purchase: InsertMaterialPurchase): Promise<MaterialPurchase> {
    const docRef = await fsDb.collection("materialPurchases").add({ ...purchase, createdAt: new Date() });
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as unknown as MaterialPurchase;
  }
  async getAllTransportationExpenses(): Promise<any[]> { return []; }
  async getTransportationExpenses(p: string): Promise<any[]> { return []; }
  async createTransportationExpense(e: any): Promise<any> { return {}; }
  async updateTransportationExpense(id: string, e: any): Promise<any> { return {}; }
  async deleteTransportationExpense(id: string): Promise<void> {}
  async getDailyExpenseSummary(p: string, d: string): Promise<any> { return undefined; }
  async createOrUpdateDailyExpenseSummary(s: any): Promise<any> { return {}; }
  async updateDailyExpenseSummary(id: string, s: any): Promise<any> { return {}; }
  async getPreviousDayBalance(p: string, d: string): Promise<string> { return "0"; }
  async deleteDailySummary(p: string, d: string): Promise<void> {}
  async getDailySummary(p: string, d: string): Promise<any> { return null; }
  async getWorkerBalance(w: string, p: string): Promise<any> { return undefined; }
  async updateWorkerBalance(w: string, p: string, b: any): Promise<any> { return {}; }
  async getWorkerTransfers(w: string): Promise<WorkerTransfer[]> { return []; }
  async getWorkerTransfer(id: string): Promise<any> { return null; }
  async createWorkerTransfer(t: any): Promise<any> { return {}; }
  async updateWorkerTransfer(id: string, t: any): Promise<any> { return {}; }
  async deleteWorkerTransfer(id: string): Promise<void> {}
  async getAllWorkerTransfers(): Promise<any[]> { return []; }
  async getFilteredWorkerTransfers(): Promise<any[]> { return []; }
  async getWorkersWithMultipleProjects(): Promise<any[]> { return []; }
  async getWorkerMultiProjectStatement(w: string): Promise<any> { return {} as any; }
  async getWorkerProjects(w: string): Promise<Project[]> { return []; }
  async updateDailySummaryForDate(p: string, d: string): Promise<void> {}
  async getDailyExpensesRange(p: string, f: string, t: string): Promise<any[]> { return []; }
  async getAutocompleteData(category: string): Promise<AutocompleteData[]> {
    const snapshot = await fsDb.collection("autocomplete").where("category", "==", category).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as AutocompleteData));
  }
  async saveAutocompleteData(data: InsertAutocompleteData): Promise<AutocompleteData> {
    const docRef = await fsDb.collection("autocomplete").add({ ...data, lastUsed: new Date(), createdAt: new Date() });
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as unknown as AutocompleteData;
  }
  async removeAutocompleteData(category: string, value: string): Promise<void> {
    const snapshot = await fsDb.collection("autocomplete")
      .where("category", "==", category)
      .where("value", "==", value)
      .get();
    const batch = fsDb.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> { return this.getCollection<Supplier>("suppliers"); }
  async getSupplier(id: string): Promise<Supplier | undefined> { return this.getDoc<Supplier>("suppliers", id); }
  async getSupplierByName(name: string): Promise<Supplier | undefined> {
    const snapshot = await fsDb.collection("suppliers").where("name", "==", name.trim()).limit(1).get();
    return snapshot.empty ? undefined : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as unknown as Supplier);
  }
  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const docRef = await fsDb.collection("suppliers").add({ ...supplier, createdAt: new Date() });
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as unknown as Supplier;
  }
  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    await fsDb.collection("suppliers").doc(id).update({ ...supplier, updatedAt: new Date() });
    return this.getDoc<Supplier>("suppliers", id);
  }
  async deleteSupplier(id: string): Promise<void> { await fsDb.collection("suppliers").doc(id).delete(); }

  // Worker Types
  async getWorkerTypes(): Promise<WorkerType[]> { return this.getCollection<WorkerType>("workerTypes"); }
  async createWorkerType(workerType: InsertWorkerType): Promise<WorkerType> {
    const docRef = await fsDb.collection("workerTypes").add({ ...workerType, createdAt: new Date() });
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as unknown as WorkerType;
  }

  // Fund Transfers
  async getFundTransfers(projectId: string): Promise<FundTransfer[]> {
    const snapshot = await fsDb.collection("fundTransfers").where("projectId", "==", projectId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as FundTransfer));
  }
  async getFundTransferByNumber(transferNumber: string): Promise<FundTransfer | undefined> {
    const snapshot = await fsDb.collection("fundTransfers").where("transferNumber", "==", transferNumber).limit(1).get();
    return snapshot.empty ? undefined : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as unknown as FundTransfer);
  }
  async createFundTransfer(transfer: InsertFundTransfer): Promise<FundTransfer> {
    const docRef = await fsDb.collection("fundTransfers").add({ ...transfer, createdAt: new Date() });
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as unknown as FundTransfer;
  }
  async getAllSupplierPayments(): Promise<any[]> { return []; }
  async getSupplierPayments(s: string): Promise<any[]> { return []; }
  async getSupplierPayment(id: string): Promise<any> { return undefined; }
  async createSupplierPayment(p: any): Promise<any> { return {}; }
  async updateSupplierPayment(id: string, p: any): Promise<any> { return {}; }
  async deleteSupplierPayment(id: string): Promise<void> {}
  async getSupplierAccountStatement(s: string): Promise<any> { return {} as any; }
  async getSupplierStatistics(): Promise<any> { return {}; }
  async getPurchasesBySupplier(): Promise<any[]> { return []; }
  async getPrintSettings(): Promise<PrintSettings[]> { return []; }
  async getPrintSettingsById(id: string): Promise<any> { return undefined; }
  async createPrintSettings(s: any): Promise<any> { return {}; }
  async updatePrintSettings(id: string, s: any): Promise<any> { return {}; }
  async deletePrintSettings(id: string): Promise<void> {}
  async getDefaultPrintSettings(r: string): Promise<any> { return undefined; }
  async getReportTemplates(): Promise<ReportTemplate[]> { return []; }
  async getReportTemplate(id: string): Promise<any> { return undefined; }
  async getActiveReportTemplate(): Promise<any> { return undefined; }
  async createReportTemplate(t: any): Promise<any> { return {}; }
  async updateReportTemplate(id: string, t: any): Promise<any> { return {}; }
  async deleteReportTemplate(id: string): Promise<void> {}
  async getEquipment(): Promise<Equipment[]> { return []; }
  async getEquipmentById(id: string): Promise<any> { return undefined; }
  async getEquipmentByCode(c: string): Promise<any> { return undefined; }
  async getEquipmentByProject(p: string): Promise<any[]> { return []; }
  async createEquipment(e: any): Promise<any> { return {}; }
  async updateEquipment(id: string, e: any): Promise<any> { return {}; }
  async deleteEquipment(id: string): Promise<void> {}
  async getEquipmentMovements(e: string): Promise<EquipmentMovement[]> { return []; }
  async createEquipmentMovement(m: any): Promise<any> { return {}; }
  async updateEquipmentMovement(id: string, m: any): Promise<any> { return {}; }
  async isNotificationRead(u: string, n: string, t: string): Promise<boolean> { return false; }
  async getNotificationReadState(u: string, n: string, t: string): Promise<any> { return undefined; }
  async markNotificationAsRead(u: string, n: string, t: string): Promise<void> {}
  async markAllNotificationsAsRead(u: string): Promise<void> {}
  async getReadNotifications(u: string): Promise<NotificationReadState[]> { return []; }
  async getDatabaseTables(): Promise<any[]> { return []; }
  async toggleTableRLS(t: string, e: boolean): Promise<any> { return {}; }
  async getTablePolicies(t: string): Promise<any[]> { return []; }
  async analyzeSecurityThreats(): Promise<any> { return {}; }
  async generateNextEquipmentCode(): Promise<string> { return ""; }

  // Full Mirroring Support
  async getAllTableData(tables: string[]): Promise<Record<string, any[]>> {
    const results: Record<string, any[]> = {};
    for (const table of tables) {
      try {
        results[table] = await this.getCollection<any>(table);
      } catch (e: any) {
        console.warn(`⚠️ [FirebaseSync] Failed to fetch table ${table}:`, e.message);
        results[table] = [];
      }
    }
    return results;
  }

  // Monitoring
  async saveMonitoringLog(log: InsertMonitoringLog): Promise<MonitoringLog> {
    const docRef = await fsDb.collection("monitoring_logs").add({
      ...log,
      timestamp: new Date()
    });
    const doc = await docRef.get();
    return { id: doc.id as any, ...doc.data() } as MonitoringLog;
  }

  async getMonitoringLogs(limitCount: number = 50): Promise<MonitoringLog[]> {
    const snapshot = await fsDb.collection("monitoring_logs")
      .orderBy("timestamp", "desc")
      .limit(limitCount)
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id as any,
      ...doc.data(),
      timestamp: (doc.data().timestamp as any)?.toDate() || new Date()
    })) as MonitoringLog[];
  }
}

export const storage = new FirebaseStorage();
