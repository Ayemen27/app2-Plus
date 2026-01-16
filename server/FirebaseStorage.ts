import { db, auth } from "./config/firebase-config";
import { 
  type Project, type Worker, type InsertProject, type InsertWorker,
  type User, type InsertUser, type WorkerAttendance, type InsertWorkerAttendance,
  type FundTransfer, type InsertFundTransfer, type Material, type InsertMaterial,
  type MaterialPurchase, type InsertMaterialPurchase, type TransportationExpense, type InsertTransportationExpense,
  type DailyExpenseSummary, type InsertDailyExpenseSummary, type WorkerTransfer, type InsertWorkerTransfer,
  type WorkerBalance, type InsertWorkerBalance, type AutocompleteData, type InsertAutocompleteData,
  type WorkerType, type InsertWorkerType, type WorkerMiscExpense, type InsertWorkerMiscExpense,
  type Supplier, type InsertSupplier, type SupplierPayment, type InsertSupplierPayment,
  type PrintSettings, type InsertPrintSettings, type ProjectFundTransfer, type InsertProjectFundTransfer,
  type ReportTemplate, type InsertReportTemplate, type Equipment, type InsertEquipment,
  type EquipmentMovement, type InsertEquipmentMovement, type Notification, type InsertNotification,
  type NotificationReadState, type InsertNotificationReadState
} from "@shared/schema";
import { type IStorage } from "./storage";

export class FirebaseStorage implements IStorage {
  // Projects
  async getProjects(): Promise<Project[]> {
    const snapshot = await db.collection("projects").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const doc = await db.collection("projects").doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as Project) : undefined;
  }

  async getProjectByName(name: string): Promise<Project | undefined> {
    const snapshot = await db.collection("projects").where("name", "==", name.trim()).limit(1).get();
    if (snapshot.empty) return undefined;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const docRef = await db.collection("projects").add({
      ...project,
      name: project.name.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as Project;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    await db.collection("projects").doc(id).update({
      ...project,
      updatedAt: new Date()
    });
    return this.getProject(id);
  }

  async deleteProject(id: string): Promise<void> {
    await db.collection("projects").doc(id).delete();
  }

  // Workers
  async getWorkers(): Promise<Worker[]> {
    const snapshot = await db.collection("workers").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Worker));
  }

  async getWorker(id: string): Promise<Worker | undefined> {
    const doc = await db.collection("workers").doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as Worker) : undefined;
  }

  async getWorkerByName(name: string): Promise<Worker | undefined> {
    const snapshot = await db.collection("workers").where("name", "==", name.trim()).limit(1).get();
    if (snapshot.empty) return undefined;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Worker;
  }

  async createWorker(worker: InsertWorker): Promise<Worker> {
    const docRef = await db.collection("workers").add({
      ...worker,
      name: worker.name.trim(),
      createdAt: new Date()
    });
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as Worker;
  }

  async updateWorker(id: string, worker: Partial<InsertWorker>): Promise<Worker | undefined> {
    await db.collection("workers").doc(id).update(worker);
    return this.getWorker(id);
  }

  // Users
  async getUsers(): Promise<User[]> {
    const snapshot = await db.collection("users").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  }

  async getUser(id: string): Promise<User | undefined> {
    const doc = await db.collection("users").doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as User) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const searchEmail = email.toLowerCase().trim();
      const snapshot = await db.collection("users").where("email", "==", searchEmail).limit(1).get();
      if (snapshot.empty) {
        console.log(`[FirebaseStorage] User not found in Firestore: ${searchEmail}`);
        return undefined;
      }
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
    } catch (error: any) {
      console.error(`[FirebaseStorage] Error in getUserByEmail for ${email}:`, error);
      if (error.code === 5 || error.message?.includes('NOT_FOUND')) {
        return undefined;
      }
      throw error;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const docRef = await db.collection("users").add({
        ...user,
        createdAt: new Date()
      });
      const doc = await docRef.get();
      return { id: doc.id, ...doc.data() } as User;
    } catch (error: any) {
      console.error(`[FirebaseStorage] Error in createUser for ${user.email}:`, error);
      if (error.code === 5 || error.message?.includes('NOT_FOUND')) {
        throw new Error("خطأ في الاتصال بقاعدة بيانات Firestore. يرجى التأكد من إنشاء قاعدة البيانات في Firebase Console.");
      }
      throw error;
    }
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    await db.collection("users").doc(id).update(user);
    return this.getUser(id);
  }

  async deleteUser(id: string): Promise<void> {
    await db.collection("users").doc(id).delete();
  }

  async getWorkerTypes(): Promise<WorkerType[]> {
    const snapshot = await db.collection("workerTypes").orderBy("usageCount", "desc").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkerType));
  }

  async createWorkerType(workerType: InsertWorkerType): Promise<WorkerType> {
    const docRef = await db.collection("workerTypes").add({
      ...workerType,
      usageCount: 0,
      createdAt: new Date()
    });
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as WorkerType;
  }

  async getFundTransfers(projectId: string, date?: string): Promise<FundTransfer[]> {
    let query = db.collection("fundTransfers").where("projectId", "==", projectId);
    if (date) {
      query = query.where("transferDate", "==", date);
    }
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FundTransfer));
  }

  async getFundTransferByNumber(transferNumber: string): Promise<FundTransfer | undefined> {
    const snapshot = await db.collection("fundTransfers").where("transferNumber", "==", transferNumber).limit(1).get();
    if (snapshot.empty) return undefined;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as FundTransfer;
  }

  async createFundTransfer(transfer: InsertFundTransfer): Promise<FundTransfer> {
    const docRef = await db.collection("fundTransfers").add({
      ...transfer,
      createdAt: new Date()
    });
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as FundTransfer;
  }

  async updateFundTransfer(id: string, transfer: Partial<InsertFundTransfer>): Promise<FundTransfer | undefined> {
    await db.collection("fundTransfers").doc(id).update(transfer);
    return this.getFundTransferByNumber(id); // Using ID here as fallback
  }

  async deleteFundTransfer(id: string): Promise<void> {
    await db.collection("fundTransfers").doc(id).delete();
  }

  async getProjectFundTransfers(fromProjectId?: string, toProjectId?: string, date?: string): Promise<ProjectFundTransfer[]> {
    let query: any = db.collection("projectFundTransfers");
    if (fromProjectId) query = query.where("fromProjectId", "==", fromProjectId);
    if (toProjectId) query = query.where("toProjectId", "==", toProjectId);
    if (date) query = query.where("transferDate", "==", date);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectFundTransfer));
  }

  async getProjectFundTransfer(id: string): Promise<ProjectFundTransfer | undefined> {
    const doc = await db.collection("projectFundTransfers").doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as ProjectFundTransfer) : undefined;
  }

  async createProjectFundTransfer(transfer: InsertProjectFundTransfer): Promise<ProjectFundTransfer> {
    const docRef = await db.collection("projectFundTransfers").add({
      ...transfer,
      createdAt: new Date()
    });
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as ProjectFundTransfer;
  }

  async updateProjectFundTransfer(id: string, transfer: Partial<InsertProjectFundTransfer>): Promise<ProjectFundTransfer | undefined> {
    await db.collection("projectFundTransfers").doc(id).update(transfer);
    return this.getProjectFundTransfer(id);
  }

  async deleteProjectFundTransfer(id: string): Promise<void> {
    await db.collection("projectFundTransfers").doc(id).delete();
  }

  async getWorkerAttendance(projectId: string, date?: string): Promise<WorkerAttendance[]> {
    let query = db.collection("workerAttendance").where("projectId", "==", projectId);
    if (date) query = query.where("date", "==", date);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkerAttendance));
  }

  async getWorkerAttendanceById(id: string): Promise<WorkerAttendance | null> {
    const doc = await db.collection("workerAttendance").doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as WorkerAttendance) : null;
  }

  async createWorkerAttendance(attendance: InsertWorkerAttendance): Promise<WorkerAttendance> {
    const docRef = await db.collection("workerAttendance").add({
      ...attendance,
      createdAt: new Date()
    });
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as WorkerAttendance;
  }

  async updateWorkerAttendance(id: string, attendance: Partial<InsertWorkerAttendance>): Promise<WorkerAttendance | undefined> {
    await db.collection("workerAttendance").doc(id).update(attendance);
    const doc = await db.collection("workerAttendance").doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as WorkerAttendance) : undefined;
  }

  async deleteWorkerAttendance(id: string): Promise<void> {
    await db.collection("workerAttendance").doc(id).delete();
  }

  async getMaterials(): Promise<Material[]> {
    const snapshot = await db.collection("materials").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material));
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const docRef = await db.collection("materials").add(material);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as Material;
  }

  async updateMaterial(id: string, material: Partial<InsertMaterial>): Promise<Material | undefined> {
    await db.collection("materials").doc(id).update(material);
    const doc = await db.collection("materials").doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as Material) : undefined;
  }

  async findMaterialByNameAndUnit(name: string, unit: string): Promise<Material | undefined> {
    const snapshot = await db.collection("materials")
      .where("name", "==", name)
      .where("unit", "==", unit)
      .limit(1).get();
    if (snapshot.empty) return undefined;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Material;
  }

  async getMaterialPurchases(projectId: string, dateFrom?: string, dateTo?: string): Promise<MaterialPurchase[]> {
    let query = db.collection("materialPurchases").where("projectId", "==", projectId);
    if (dateFrom) query = query.where("purchaseDate", ">=", dateFrom);
    if (dateTo) query = query.where("purchaseDate", "<=", dateTo);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialPurchase));
  }

  async getMaterialPurchasesWithFilters(filters: any): Promise<MaterialPurchase[]> {
    let query: any = db.collection("materialPurchases");
    if (filters.supplierId) query = query.where("supplierId", "==", filters.supplierId);
    if (filters.projectId) query = query.where("projectId", "==", filters.projectId);
    if (filters.dateFrom) query = query.where("purchaseDate", ">=", filters.dateFrom);
    if (filters.dateTo) query = query.where("purchaseDate", "<=", filters.dateTo);
    if (filters.purchaseType) query = query.where("purchaseType", "==", filters.purchaseType);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialPurchase));
  }

  async getMaterialPurchasesDateRange(): Promise<any> {
    const snapshot = await db.collection("materialPurchases").orderBy("purchaseDate").get();
    if (snapshot.empty) return { minDate: "", maxDate: "" };
    return {
      minDate: snapshot.docs[0].data().purchaseDate,
      maxDate: snapshot.docs[snapshot.docs.length - 1].data().purchaseDate
    };
  }

  async getMaterialPurchaseById(id: string): Promise<MaterialPurchase | null> {
    const doc = await db.collection("materialPurchases").doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as MaterialPurchase) : null;
  }

  async createMaterialPurchase(purchase: InsertMaterialPurchase): Promise<MaterialPurchase> {
    const docRef = await db.collection("materialPurchases").add(purchase);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as MaterialPurchase;
  }

  async updateMaterialPurchase(id: string, purchase: Partial<InsertMaterialPurchase>): Promise<MaterialPurchase | undefined> {
    await db.collection("materialPurchases").doc(id).update(purchase);
    const updated = await this.getMaterialPurchaseById(id);
    return updated || undefined;
  }

  async deleteMaterialPurchase(id: string): Promise<void> {
    await db.collection("materialPurchases").doc(id).delete();
  }

  async getAllTransportationExpenses(): Promise<TransportationExpense[]> {
    const snapshot = await db.collection("transportationExpenses").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransportationExpense));
  }

  async getTransportationExpenses(projectId: string, date?: string): Promise<TransportationExpense[]> {
    let query = db.collection("transportationExpenses").where("projectId", "==", projectId);
    if (date) query = query.where("date", "==", date);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransportationExpense));
  }

  async createTransportationExpense(expense: InsertTransportationExpense): Promise<TransportationExpense> {
    const docRef = await db.collection("transportationExpenses").add(expense);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as TransportationExpense;
  }

  async updateTransportationExpense(id: string, expense: Partial<InsertTransportationExpense>): Promise<TransportationExpense | undefined> {
    await db.collection("transportationExpenses").doc(id).update(expense);
    const doc = await db.collection("transportationExpenses").doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as TransportationExpense) : undefined;
  }

  async deleteTransportationExpense(id: string): Promise<void> {
    await db.collection("transportationExpenses").doc(id).delete();
  }

  async getDailyExpenseSummary(projectId: string, date: string): Promise<DailyExpenseSummary | undefined> {
    const snapshot = await db.collection("dailyExpenseSummaries")
      .where("projectId", "==", projectId)
      .where("date", "==", date)
      .limit(1).get();
    if (snapshot.empty) return undefined;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as DailyExpenseSummary;
  }

  async createOrUpdateDailyExpenseSummary(summary: InsertDailyExpenseSummary): Promise<DailyExpenseSummary> {
    const existing = await this.getDailyExpenseSummary(summary.projectId, summary.date);
    if (existing) {
      await db.collection("dailyExpenseSummaries").doc(existing.id).update(summary);
      return { ...existing, ...summary } as DailyExpenseSummary;
    }
    const docRef = await db.collection("dailyExpenseSummaries").add(summary);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as DailyExpenseSummary;
  }

  async updateDailyExpenseSummary(id: string, summary: Partial<InsertDailyExpenseSummary>): Promise<DailyExpenseSummary | undefined> {
    await db.collection("dailyExpenseSummaries").doc(id).update(summary);
    const doc = await db.collection("dailyExpenseSummaries").doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as DailyExpenseSummary) : undefined;
  }

  async getPreviousDayBalance(projectId: string, currentDate: string): Promise<string> {
    const snapshot = await db.collection("dailyExpenseSummaries")
      .where("projectId", "==", projectId)
      .where("date", "<", currentDate)
      .orderBy("date", "desc")
      .limit(1).get();
    if (snapshot.empty) return "0";
    return snapshot.docs[0].data().closingBalance || "0";
  }

  async deleteDailySummary(projectId: string, date: string): Promise<void> {
    const existing = await this.getDailyExpenseSummary(projectId, date);
    if (existing) {
      await db.collection("dailyExpenseSummaries").doc(existing.id).delete();
    }
  }

  async getDailySummary(projectId: string, date: string): Promise<DailyExpenseSummary | null> {
    const summary = await this.getDailyExpenseSummary(projectId, date);
    return summary || null;
  }

  async getWorkerBalance(workerId: string, projectId: string): Promise<WorkerBalance | undefined> {
    const snapshot = await db.collection("workerBalances")
      .where("workerId", "==", workerId)
      .where("projectId", "==", projectId)
      .limit(1).get();
    if (snapshot.empty) return undefined;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as WorkerBalance;
  }

  async updateWorkerBalance(workerId: string, projectId: string, balance: Partial<InsertWorkerBalance>): Promise<WorkerBalance> {
    const existing = await this.getWorkerBalance(workerId, projectId);
    if (existing) {
      await db.collection("workerBalances").doc(existing.id).update(balance);
      return { ...existing, ...balance } as WorkerBalance;
    }
    const docRef = await db.collection("workerBalances").add({ ...balance, workerId, projectId });
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as WorkerBalance;
  }

  async getWorkerTransfers(workerId: string, projectId?: string): Promise<WorkerTransfer[]> {
    let query = db.collection("workerTransfers").where("workerId", "==", workerId);
    if (projectId) query = query.where("projectId", "==", projectId);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkerTransfer));
  }

  async getWorkerTransfer(id: string): Promise<WorkerTransfer | null> {
    const doc = await db.collection("workerTransfers").doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as WorkerTransfer) : null;
  }

  async createWorkerTransfer(transfer: InsertWorkerTransfer): Promise<WorkerTransfer> {
    const docRef = await db.collection("workerTransfers").add(transfer);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as WorkerTransfer;
  }

  async updateWorkerTransfer(id: string, transfer: Partial<InsertWorkerTransfer>): Promise<WorkerTransfer | undefined> {
    await db.collection("workerTransfers").doc(id).update(transfer);
    const updated = await this.getWorkerTransfer(id);
    return updated || undefined;
  }

  async deleteWorkerTransfer(id: string): Promise<void> {
    await db.collection("workerTransfers").doc(id).delete();
  }

  async getAllWorkerTransfers(): Promise<WorkerTransfer[]> {
    const snapshot = await db.collection("workerTransfers").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkerTransfer));
  }

  async getFilteredWorkerTransfers(projectId?: string, date?: string): Promise<WorkerTransfer[]> {
    let query: any = db.collection("workerTransfers");
    if (projectId) query = query.where("projectId", "==", projectId);
    if (date) query = query.where("transferDate", "==", date);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkerTransfer));
  }

  async getProjectStatistics(projectId: string): Promise<any> {
    // Basic stats implementation
    const projectsCount = (await db.collection("projects").get()).size;
    const workersCount = (await db.collection("workers").get()).size;
    return { projectsCount, workersCount };
  }

  async getWorkerAccountStatement(workerId: string, projectId?: string, dateFrom?: string, dateTo?: string): Promise<any> {
    try {
      let attendanceQuery = db.collection("workerAttendance").where("workerId", "==", workerId);
      if (projectId) attendanceQuery = attendanceQuery.where("projectId", "==", projectId);
      if (dateFrom) attendanceQuery = attendanceQuery.where("date", ">=", dateFrom);
      if (dateTo) attendanceQuery = attendanceQuery.where("date", "<=", dateTo);
      
      let transfersQuery = db.collection("workerTransfers").where("workerId", "==", workerId);
      if (projectId) transfersQuery = transfersQuery.where("projectId", "==", projectId);
      
      const [attendanceSnapshot, transfersSnapshot] = await Promise.all([
        attendanceQuery.get(),
        transfersQuery.get()
      ]);

      const attendance = attendanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const transfers = transfersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const balance = projectId ? await this.getWorkerBalance(workerId, projectId) : null;

      return {
        attendance,
        transfers,
        balance: balance || null
      };
    } catch (error) {
      console.error("[FirebaseStorage] Error in getWorkerAccountStatement:", error);
      throw error;
    }
  }

  async getWorkersWithMultipleProjects(): Promise<any[]> {
    try {
      const balancesSnapshot = await db.collection("workerBalances").get();
      const workerProjects = new Map<string, Set<string>>();
      
      balancesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!workerProjects.has(data.workerId)) {
          workerProjects.set(data.workerId, new Set());
        }
        workerProjects.get(data.workerId)?.add(data.projectId);
      });

      const multiProjectWorkers = [];
      for (const [workerId, projects] of workerProjects.entries()) {
        if (projects.size > 1) {
          const worker = await this.getWorker(workerId);
          if (worker) {
            multiProjectWorkers.push({
              worker,
              projects: Array.from(projects),
              totalBalance: "0" // Simplified
            });
          }
        }
      }
      return multiProjectWorkers;
    } catch (error) {
      console.error("[FirebaseStorage] Error in getWorkersWithMultipleProjects:", error);
      return [];
    }
  }

  async getSupplierAccountStatement(supplierId: string, projectId?: string, dateFrom?: string, dateTo?: string): Promise<any> {
    try {
      let purchasesQuery = db.collection("materialPurchases").where("supplierId", "==", supplierId);
      if (projectId) purchasesQuery = purchasesQuery.where("projectId", "==", projectId);
      
      let paymentsQuery = db.collection("supplierPayments").where("supplierId", "==", supplierId);
      if (projectId) paymentsQuery = paymentsQuery.where("projectId", "==", projectId);

      const [purchasesSnapshot, paymentsSnapshot, supplier] = await Promise.all([
        purchasesQuery.get(),
        paymentsQuery.get(),
        db.collection("suppliers").doc(supplierId).get()
      ]);

      return {
        supplier: { id: supplier.id, ...supplier.data() },
        purchases: purchasesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        payments: paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        totalDebt: "0",
        totalPaid: "0",
        remainingDebt: "0"
      };
    } catch (error) {
      console.error("[FirebaseStorage] Error in getSupplierAccountStatement:", error);
      throw error;
    }
  }

  async getWorkerProjects(workerId: string): Promise<Project[]> {
    const balances = await db.collection("workerBalances").where("workerId", "==", workerId).get();
    const projectIds = balances.docs.map(doc => doc.data().projectId);
    const projects: Project[] = [];
    for (const id of projectIds) {
      const p = await this.getProject(id);
      if (p) projects.push(p);
    }
    return projects;
  }

  async updateDailySummaryForDate(projectId: string, date: string): Promise<void> {}

  async getDailyExpensesRange(projectId: string, dateFrom: string, dateTo: string): Promise<any[]> {
    const snapshot = await db.collection("dailyExpenseSummaries")
      .where("projectId", "==", projectId)
      .where("date", ">=", dateFrom)
      .where("date", "<=", dateTo)
      .get();
    return snapshot.docs.map(doc => doc.data());
  }

  async getAutocompleteData(category: string): Promise<AutocompleteData[]> {
    const snapshot = await db.collection("autocompleteData").where("category", "==", category).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AutocompleteData));
  }

  async saveAutocompleteData(data: InsertAutocompleteData): Promise<AutocompleteData> {
    const docRef = await db.collection("autocompleteData").add(data);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as AutocompleteData;
  }

  async removeAutocompleteData(category: string, value: string): Promise<void> {
    const snapshot = await db.collection("autocompleteData")
      .where("category", "==", category)
      .where("value", "==", value)
      .get();
    for (const doc of snapshot.docs) {
      await doc.ref.delete();
    }
  }

  async getWorkerMiscExpenses(projectId: string, date?: string): Promise<WorkerMiscExpense[]> {
    let query = db.collection("workerMiscExpenses").where("projectId", "==", projectId);
    if (date) query = query.where("date", "==", date);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkerMiscExpense));
  }

  async getWorkerMiscExpense(id: string): Promise<WorkerMiscExpense | null> {
    const doc = await db.collection("workerMiscExpenses").doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as WorkerMiscExpense) : null;
  }

  async createWorkerMiscExpense(expense: InsertWorkerMiscExpense): Promise<WorkerMiscExpense> {
    const docRef = await db.collection("workerMiscExpenses").add(expense);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as WorkerMiscExpense;
  }

  async updateWorkerMiscExpense(id: string, expense: Partial<InsertWorkerMiscExpense>): Promise<WorkerMiscExpense | undefined> {
    await db.collection("workerMiscExpenses").doc(id).update(expense);
    const updated = await this.getWorkerMiscExpense(id);
    return updated || undefined;
  }

  async deleteWorkerMiscExpense(id: string): Promise<void> {
    await db.collection("workerMiscExpenses").doc(id).delete();
  }

  async getExpensesForReport(projectId: string, dateFrom: string, dateTo: string): Promise<any[]> { return []; }
  async getIncomeForReport(projectId: string, dateFrom: string, dateTo: string): Promise<any[]> { return []; }

  async getSuppliers(): Promise<Supplier[]> {
    const snapshot = await db.collection("suppliers").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const doc = await db.collection("suppliers").doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as Supplier) : undefined;
  }

  async getSupplierByName(name: string): Promise<Supplier | undefined> {
    const snapshot = await db.collection("suppliers").where("name", "==", name.trim()).limit(1).get();
    if (snapshot.empty) return undefined;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Supplier;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const docRef = await db.collection("suppliers").add(supplier);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as Supplier;
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    await db.collection("suppliers").doc(id).update(supplier);
    return this.getSupplier(id);
  }

  async deleteSupplier(id: string): Promise<void> {
    await db.collection("suppliers").doc(id).delete();
  }

  async getAllSupplierPayments(): Promise<SupplierPayment[]> {
    const snapshot = await db.collection("supplierPayments").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplierPayment));
  }

  async getSupplierPayments(supplierId: string, projectId?: string): Promise<SupplierPayment[]> {
    let query = db.collection("supplierPayments").where("supplierId", "==", supplierId);
    if (projectId) query = query.where("projectId", "==", projectId);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplierPayment));
  }

  async getSupplierPayment(id: string): Promise<SupplierPayment | undefined> {
    const doc = await db.collection("supplierPayments").doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as SupplierPayment) : undefined;
  }

  async createSupplierPayment(payment: InsertSupplierPayment): Promise<SupplierPayment> {
    const docRef = await db.collection("supplierPayments").add(payment);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as SupplierPayment;
  }

  async updateSupplierPayment(id: string, payment: Partial<InsertSupplierPayment>): Promise<SupplierPayment | undefined> {
    await db.collection("supplierPayments").doc(id).update(payment);
    return this.getSupplierPayment(id);
  }

  async deleteSupplierPayment(id: string): Promise<void> {
    await db.collection("supplierPayments").doc(id).delete();
  }

  async getSupplierAccountStatement(supplierId: string, projectId?: string, dateFrom?: string, dateTo?: string): Promise<any> {
    return {};
  }

  async getSupplierStatistics(filters?: any): Promise<any> {
    return {};
  }

  async getPurchasesBySupplier(supplierId: string, purchaseType?: string, dateFrom?: string, dateTo?: string): Promise<MaterialPurchase[]> {
    let query = db.collection("materialPurchases").where("supplierId", "==", supplierId);
    if (purchaseType) query = query.where("purchaseType", "==", purchaseType);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialPurchase));
  }

  async getPrintSettings(reportType?: string, userId?: string): Promise<PrintSettings[]> {
    let query: any = db.collection("printSettings");
    if (reportType) query = query.where("reportType", "==", reportType);
    if (userId) query = query.where("userId", "==", userId);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrintSettings));
  }

  async getPrintSettingsById(id: string): Promise<PrintSettings | undefined> {
    const doc = await db.collection("printSettings").doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as PrintSettings) : undefined;
  }

  async createPrintSettings(settings: InsertPrintSettings): Promise<PrintSettings> {
    const docRef = await db.collection("printSettings").add(settings);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as PrintSettings;
  }

  async updatePrintSettings(id: string, settings: Partial<InsertPrintSettings>): Promise<PrintSettings | undefined> {
    await db.collection("printSettings").doc(id).update(settings);
    return this.getPrintSettingsById(id);
  }

  async deletePrintSettings(id: string): Promise<void> {
    await db.collection("printSettings").doc(id).delete();
  }

  async getDefaultPrintSettings(reportType: string): Promise<PrintSettings | undefined> {
    const snapshot = await db.collection("printSettings")
      .where("reportType", "==", reportType)
      .where("isDefault", "==", true)
      .limit(1).get();
    if (snapshot.empty) return undefined;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as PrintSettings;
  }

  async getReportTemplates(): Promise<ReportTemplate[]> {
    const snapshot = await db.collection("reportTemplates").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReportTemplate));
  }

  async getReportTemplate(id: string): Promise<ReportTemplate | undefined> {
    const doc = await db.collection("reportTemplates").doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as ReportTemplate) : undefined;
  }

  async getActiveReportTemplate(): Promise<ReportTemplate | undefined> {
    const snapshot = await db.collection("reportTemplates").where("isActive", "==", true).limit(1).get();
    if (snapshot.empty) return undefined;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ReportTemplate;
  }

  async createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate> {
    const docRef = await db.collection("reportTemplates").add(template);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as ReportTemplate;
  }

  async updateReportTemplate(id: string, template: Partial<InsertReportTemplate>): Promise<ReportTemplate | undefined> {
    await db.collection("reportTemplates").doc(id).update(template);
    return this.getReportTemplate(id);
  }

  async deleteReportTemplate(id: string): Promise<void> {
    await db.collection("reportTemplates").doc(id).delete();
  }

  async getEquipment(filters?: any): Promise<Equipment[]> {
    let query: any = db.collection("equipment");
    if (filters?.projectId) query = query.where("projectId", "==", filters.projectId);
    if (filters?.status) query = query.where("status", "==", filters.status);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment));
  }

  async getEquipmentById(id: string): Promise<Equipment | undefined> {
    const doc = await db.collection("equipment").doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as Equipment) : undefined;
  }

  async getEquipmentByCode(code: string): Promise<Equipment | undefined> {
    const snapshot = await db.collection("equipment").where("code", "==", code).limit(1).get();
    if (snapshot.empty) return undefined;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Equipment;
  }

  async getEquipmentByProject(projectId: string): Promise<Equipment[]> {
    const snapshot = await db.collection("equipment").where("projectId", "==", projectId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment));
  }

  async generateNextEquipmentCode(): Promise<string> {
    const snapshot = await db.collection("equipment").orderBy("code", "desc").limit(1).get();
    if (snapshot.empty) return "EQ-001";
    const lastCode = snapshot.docs[0].data().code;
    const num = parseInt(lastCode.split("-")[1]) + 1;
    return `EQ-${num.toString().padStart(3, "0")}`;
  }

  async createEquipment(equipment: InsertEquipment): Promise<Equipment> {
    const docRef = await db.collection("equipment").add(equipment);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as Equipment;
  }

  async updateEquipment(id: string, equipment: Partial<InsertEquipment>): Promise<Equipment | undefined> {
    await db.collection("equipment").doc(id).update(equipment);
    return this.getEquipmentById(id);
  }

  async deleteEquipment(id: string): Promise<void> {
    await db.collection("equipment").doc(id).delete();
  }

  async getEquipmentMovements(equipmentId: string): Promise<EquipmentMovement[]> {
    const snapshot = await db.collection("equipmentMovements").where("equipmentId", "==", equipmentId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EquipmentMovement));
  }

  async createEquipmentMovement(movement: InsertEquipmentMovement): Promise<EquipmentMovement> {
    const docRef = await db.collection("equipmentMovements").add(movement);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as EquipmentMovement;
  }

  async updateEquipmentMovement(id: string, movement: Partial<InsertEquipmentMovement>): Promise<EquipmentMovement | undefined> {
    await db.collection("equipmentMovements").doc(id).update(movement);
    const doc = await db.collection("equipmentMovements").doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as EquipmentMovement) : undefined;
  }

  async isNotificationRead(userId: string, notificationId: string, notificationType: string): Promise<boolean> {
    const snapshot = await db.collection("notificationReadStates")
      .where("userId", "==", userId)
      .where("notificationId", "==", notificationId)
      .where("notificationType", "==", notificationType)
      .limit(1).get();
    return !snapshot.empty;
  }

  async getNotificationReadState(userId: string, notificationId: string, notificationType: string): Promise<NotificationReadState | undefined> {
    const snapshot = await db.collection("notificationReadStates")
      .where("userId", "==", userId)
      .where("notificationId", "==", notificationId)
      .where("notificationType", "==", notificationType)
      .limit(1).get();
    if (snapshot.empty) return undefined;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as NotificationReadState;
  }

  async markNotificationAsRead(userId: string, notificationId: string, notificationType: string): Promise<void> {
    await db.collection("notificationReadStates").add({ userId, notificationId, notificationType, readAt: new Date() });
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {}

  async getReadNotifications(userId: string, notificationType?: string): Promise<NotificationReadState[]> {
    let query = db.collection("notificationReadStates").where("userId", "==", userId);
    if (notificationType) query = query.where("notificationType", "==", notificationType);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationReadState));
  }

  async getDatabaseTables(): Promise<any[]> { return []; }
  async toggleTableRLS(): Promise<any> { return {}; }
  async getTablePolicies(): Promise<any[]> { return []; }
  async analyzeSecurityThreats(): Promise<any> { return {}; }
}

export const storage = new FirebaseStorage();
