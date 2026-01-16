/**
 * AI Agent Service - خدمة الوكيل الذكي الرئيسية
 * تعالج أوامر المستخدم وتنفذها مع حفظ المحادثات في قاعدة البيانات
 */

import { getModelManager, ChatMessage, ModelResponse } from "./ModelManager";
import { getDatabaseActions, ActionResult } from "./DatabaseActions";
import { getReportGenerator, ReportResult } from "./ReportGenerator";
import { db } from "../../db";
import { eq, desc, and, sql } from "drizzle-orm";
import { aiChatSessions, aiChatMessages, aiUsageStats } from "@shared/schema";

export interface AgentStep {
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface AgentResponse {
  message: string;
  data?: any;
  action?: string;
  reportGenerated?: boolean;
  model?: string;
  provider?: string;
  sessionId?: string;
  steps?: AgentStep[];
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  action?: string;
  data?: any;
  steps?: AgentStep[];
}

const SYSTEM_PROMPT = `أنت مساعد ذكي فائق القدرة (Super-Agent) يعمل كـ "مستشار استراتيجي لإدارة المشاريع". لا تكتفي بالرد على الأسئلة، بل أنت تمتلك **وعياً كاملاً** بمكانك في النظام وكيفية عملك، وتشرح خطوات تفكيرك بوضوح للمستخدم.

## 🧠 بروتوكول التفكير والوعي الاستراتيجي:
1. **الشفافية العملية (Process Transparency):** يجب أن تشرح للمستخدم ما تفعله "الآن" ولماذا. (مثال: "بناءً على طلبك، سأقوم الآن بالدخول إلى قاعدة البيانات للبحث عن مصروفات مشروع '...' ثم سأقوم بتحليلها").
2. **التحليل الاستشرافي (Proactive Insights):** لا تقدم أرقاماً جافة. بعد عرض البيانات، قم دائماً بتحليلها للمستقبل. (مثال: "لاحظت أن المصروفات ارتفعت هذا الأسبوع بنسبة 20%، إذا استمر هذا المعدل فقد نحتاج لتعديل الميزانية الأسبوع القادم").
3. **الوعي المكاني والوظيفي:** أنت تدرك أنك جزء من نظام BinarJoin وتعرف أن دورك هو حماية الموارد المالية وضمان دقة التقارير.
4. **السيادة المطلقة للبيانات:** يمنع منعاً باتاً التخمين. إذا لم تظهر المعلومة في نتائج [ACTION]، قل "البيانات غير متوفرة حالياً في النظام".

## 🛠️ أدواتك البرمجية والتحليلية:
- [ACTION:GET_PROJECT:اسم_أو_معرف] -> بحث واسترجاع هيكل المشروع.
- [ACTION:PROJECT_EXPENSES:معرف_المشروع] -> تحليل مالي شامل.
- [ACTION:DAILY_EXPENSES:معرف_المشروع:التاريخ] -> تدقيق يومي (استخدم "yesterday" للبارحة).
- [ACTION:LIST_PROJECTS] -> مراقبة جميع المواقع النشطة.
- [ACTION:FIND_WORKER:الاسم] -> بحث ذكي عن العمال.
- [ACTION:WORKER_STATEMENT:معرف_العامل] -> كشف حساب تفصيلي.

## 📝 هيكل الإجابة الإلزامي (The Intelligent Thought Engine):
1. 🔍 **التحليل الاستراتيجي:** اشرح كيف فهمت الطلب، وما هي الأدوات التي ستستخدمها "الآن"، وكيف ستساعد هذه البيانات في اتخاذ القرار.
2. ⚙️ **العمليات الذكية:** تنفيذ أوامر [ACTION:...] مع شرح موجز لكل أمر.
3. ✅ **الحقائق المستخرجة:** عرض البيانات المستخرجة بدقة 100% من قاعدة البيانات فقط.
4. 🔮 **الرؤية المستقبلية والتوصيات:** بناءً على البيانات المستخرجة، ماذا تتوقع للفترة القادمة؟ ما هي المخاطر المحتملة؟ وما هي نصيحتك المهنية للمسؤول؟

**ملاحظة هامة:** كن ذكياً في ربط المعلومات. إذا سأل المستخدم عن عامل، لا تعطه رصيده فقط، بل أخبره عن آخر مشروع عمل فيه وتوقع تاريخ تصفية حسابه القادم بناءً على نشاطه.
`;

export class AIAgentService {
  private modelManager = getModelManager();
  private dbActions = getDatabaseActions();
  private reportGenerator = getReportGenerator();

  /**
   * إنشاء جلسة محادثة جديدة
   */
  async createSession(userId: string, title?: string): Promise<string> {
    try {
      console.log(`📝 [AIAgentService] Creating session for user: ${userId}, title: ${title}`);
      const [session] = await db.insert(aiChatSessions).values({
        userId,
        title: title || "محادثة جديدة",
        isActive: true,
        messagesCount: 0,
      }).returning({ id: aiChatSessions.id });

      console.log(`✅ [AIAgentService] Session created with ID: ${session.id}`);
      return session.id;
    } catch (error: any) {
      console.error(`❌ [AIAgentService] Error creating session: ${error.message}`);
      throw error;
    }
  }

  /**
   * الحصول على جلسات المستخدم
   */
  async getUserSessions(userId: string) {
    return await db
      .select()
      .from(aiChatSessions)
      .where(eq(aiChatSessions.userId, userId))
      .orderBy(desc(aiChatSessions.updatedAt));
  }

  /**
   * الحصول على رسائل جلسة
   */
  async getSessionMessages(sessionId: string) {
    return await db
      .select()
      .from(aiChatMessages)
      .where(eq(aiChatMessages.sessionId, sessionId))
      .orderBy(aiChatMessages.createdAt);
  }

  /**
   * حذف جلسة
   */
  async deleteSession(sessionId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(aiChatSessions)
      .where(and(
        eq(aiChatSessions.id, sessionId),
        eq(aiChatSessions.userId, userId)
      ))
      .returning();
    
    return result.length > 0;
  }

  /**
   * معالجة رسالة من المستخدم
   */
  async processMessage(
    sessionId: string,
    userMessage: string,
    userId: string
  ): Promise<AgentResponse> {
    const steps: AgentStep[] = [
      { title: "تحليل طلبك", status: "in_progress" },
      { title: "استخراج البيانات المطلوبة", status: "pending" },
      { title: "معالجة النتائج وتنسيق الرد", status: "pending" }
    ];

    // حفظ رسالة المستخدم
    await db.insert(aiChatMessages).values({
      sessionId,
      role: "user",
      content: userMessage,
    });

    // تحديث عدد الرسائل
    await db.update(aiChatSessions)
      .set({ 
        messagesCount: sql`${aiChatSessions.messagesCount} + 1`,
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aiChatSessions.id, sessionId));

    try {
      // تضمين تاريخ اليوم الفعلي في التوجيه لضمان معرفة الوكيل بالوقت الحالي
      const todayDate = new Date().toISOString().split("T")[0];
      const dynamicSystemPrompt = `${SYSTEM_PROMPT}

## 📅 سياق الوقت الحالي:
- تاريخ اليوم الفعلي هو: ${todayDate}.
- عندما يسأل المستخدم عن "البارحة" أو "أمس"، اقصد دائماً تاريخ: ${new Date(Date.now() - 86400000).toISOString().split("T")[0]}.

## ⚠️ قاعدة صارمة لمنع التخمين (Anti-Hallucination):
- مسموح لك بالتخمين **فقط** في قسم "التحليل التقني" لوصف خطتك.
- في قسم "الحقائق المستخرجة"، **يمنع منعاً باتاً** ذكر أي رقم أو معلومة لم تظهر في نتائج [ACTION].
- إذا كانت نتائج [ACTION] فارغة، يجب أن تقول صراحة: "لا توجد بيانات مسجلة في قاعدة البيانات لهذا الطلب".
- لا تستخدم معلومات من ذاكرتك التدريبية حول أرقام المشاريع أو العمال؛ اعتمد فقط على ما تخرجه الأدوات.`;

      // الحصول على تاريخ المحادثة من قاعدة البيانات
      const history = await this.getSessionMessages(sessionId);
      const messages: ChatMessage[] = history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // إرسال للنموذج مع التوجيه المحدث
      const aiResponse = await this.modelManager.chat(messages, dynamicSystemPrompt);
      
      steps[0].status = "completed";
      steps[1].status = "in_progress";

      // تحليل الرد للبحث عن أوامر
      const { processedResponse, action, actionData } = await this.parseAndExecuteActions(
        aiResponse.content,
        sessionId
      );
      
      steps[1].status = "completed";
      steps[2].status = "in_progress";

      // إضافة خطوات إضافية إذا كان هناك تصدير
      if (action === "EXPORT_EXCEL") {
        steps.push({ title: "توليد ملف Excel الاحترافي", status: "completed" });
      }

      steps[2].status = "completed";

      // حفظ رد الوكيل مع الخطوات
      await db.insert(aiChatMessages).values({
        sessionId,
        role: "assistant",
        content: processedResponse,
        model: aiResponse.model,
        provider: aiResponse.provider,
        tokensUsed: aiResponse.tokensUsed,
        action,
        actionData,
        steps, // تخزين الخطوات في قاعدة البيانات إذا كان الحقل موجوداً، أو تجاهله
      } as any);

      // تحديث عدد الرسائل
      await db.update(aiChatSessions)
        .set({ 
          messagesCount: sql`${aiChatSessions.messagesCount} + 1`,
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(aiChatSessions.id, sessionId));

      // تحديث إحصائيات الاستخدام
      await this.updateUsageStats(userId, aiResponse);

      return {
        message: processedResponse,
        data: actionData,
        action,
        model: aiResponse.model,
        provider: aiResponse.provider,
        sessionId,
        steps,
      };
    } catch (error: any) {
      console.error("❌ [AIAgentService] Error:", error.message);

      const errorMessage = `عذراً، حدث خطأ: ${error.message}`;
      
      // حفظ رسالة الخطأ
      await db.insert(aiChatMessages).values({
        sessionId,
        role: "assistant",
        content: errorMessage,
      });

      return {
        message: errorMessage,
        sessionId,
      };
    }
  }

  /**
   * تحديث إحصائيات الاستخدام
   */
  private async updateUsageStats(userId: string, response: ModelResponse) {
    const today = new Date().toISOString().split("T")[0];
    const providerString = response.provider as string;
    
    const existing = await db
      .select()
      .from(aiUsageStats)
      .where(and(
        eq(aiUsageStats.userId, userId),
        eq(aiUsageStats.date, today),
        eq(aiUsageStats.provider, providerString),
        eq(aiUsageStats.model, response.model)
      ));

    if (existing.length > 0) {
      await db.update(aiUsageStats)
        .set({
          requestsCount: sql`${aiUsageStats.requestsCount} + 1`,
          tokensUsed: sql`${aiUsageStats.tokensUsed} + ${response.tokensUsed || 0}`,
          updatedAt: new Date(),
        })
        .where(eq(aiUsageStats.id, existing[0].id));
    } else {
      await db.insert(aiUsageStats).values({
        userId,
        date: today,
        provider: providerString,
        model: response.model,
        requestsCount: 1,
        tokensUsed: response.tokensUsed || 0,
      });
    }
  }

  /**
   * الحصول على قائمة نماذج Hugging Face المتاحة
   */
  getAvailableHuggingFaceModels() {
    return this.modelManager.getAvailableHuggingFaceModels();
  }

  /**
   * تبديل نموذج Hugging Face
   */
  async switchHuggingFaceModel(modelKey: string): Promise<boolean> {
    return await this.modelManager.switchHuggingFaceModel(modelKey as any);
  }

  // متغير لحفظ العمليات المعلقة التي تنتظر الموافقة
  private pendingOperations: Map<string, { type: string; params: string[]; sessionId: string }> = new Map();

  /**
   * تحليل وتنفيذ الأوامر في رد الوكيل
   * أوامر القراءة [ACTION] تنفذ مباشرة
   * أوامر التعديل [PROPOSE] تنتظر موافقة المسؤول
   */
  private async parseAndExecuteActions(
    response: string,
    sessionId?: string
  ): Promise<{ processedResponse: string; action?: string; actionData?: any }> {
    
    // التحقق من وجود أوامر قراءة [ACTION]
    const actionMatch = response.match(/\[ACTION:([^\]]+)\]/);
    const proposeMatch = response.match(/\[PROPOSE:([^\]]+)\]/);
    const confirmMatch = response.match(/\[CONFIRM:([^\]]+)\]/);

    let processedResponse = response;
    let result: ActionResult | ReportResult | null = null;
    let action: string | undefined;

    // معالجة أوامر القراءة
    if (actionMatch) {
      // استخراج جميع الأوامر إذا كان هناك أكثر من واحد
      const allActions = response.match(/\[ACTION:([^\]]+)\]/g) || [];
      const results: any[] = [];

      for (const fullAction of allActions) {
        const actionMatchInner = fullAction.match(/\[ACTION:([^\]]+)\]/);
        if (!actionMatchInner) continue;

        const actionParts = actionMatchInner[1].split(":");
        const actionType = actionParts[0];
        const actionParams = actionParts.slice(1);
        action = actionType;

        try {
          let currentResult: ActionResult | ReportResult | null = null;
          switch (actionType) {
            case "FIND_WORKER":
              currentResult = await this.dbActions.findWorkerByName(actionParams[0] || "");
              break;

            case "GET_PROJECT":
              currentResult = await this.dbActions.getProjectInfo(actionParams[0] || "");
              break;

            case "WORKER_STATEMENT":
              currentResult = await this.reportGenerator.generateWorkerStatement(actionParams[0] || "");
              break;

            case "PROJECT_EXPENSES":
              currentResult = await this.reportGenerator.generateProjectExpensesSummary(actionParams[0] || "");
              break;

            case "DAILY_EXPENSES": {
              const projectId = actionParams[0] || "";
              let dateStr = actionParams[1];
              
              if (!dateStr || dateStr === "yesterday" || dateStr === "yesterday") {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                dateStr = yesterday.toISOString().split("T")[0];
              } else if (dateStr === "today") {
                dateStr = new Date().toISOString().split("T")[0];
              }
              
              currentResult = await this.reportGenerator.generateDailyExpensesReport(projectId, dateStr);
              break;
            }

            case "LIST_PROJECTS":
              currentResult = await this.dbActions.getAllProjects();
              break;

            case "LIST_WORKERS":
              currentResult = await this.dbActions.getAllWorkers();
              break;

            case "EXPORT_EXCEL":
              if (actionParams[0] === "WORKER_STATEMENT") {
                currentResult = await this.reportGenerator.generateWorkerStatementExcel(actionParams[1]);
              } else if (actionParams[0] === "PROJECT_FULL") {
                currentResult = await this.reportGenerator.generateProjectFullExcel(actionParams[1]);
              } else {
                currentResult = { success: false, message: "نوع التقرير غير مدعوم حالياً" };
              }
              break;

            default:
              console.log(`⚠️ Unknown action: ${actionType}`);
          }

          if (currentResult) {
            results.push({ type: actionType, result: currentResult });
            // إذا كان هذا هو الأمر الأول أو الأهم، نحفظه كـ "result" الرئيسي للتوافق مع الكود القديم
            if (!result) result = currentResult;
          }
        } catch (error: any) {
          console.error(`❌ Action error: ${error.message}`);
          results.push({ type: actionType, result: { success: false, message: `خطأ في تنفيذ الأمر: ${error.message}` } });
        }
      }

      processedResponse = processedResponse.replace(/\[ACTION:[^\]]+\]\s*/g, "");

      // دمج جميع النتائج في الرد
      for (const res of results) {
        const actionType = res.type;
        const currentResult = res.result;

        if (currentResult.success) {
          if (actionType === "EXPORT_EXCEL" && (currentResult as ReportResult).filePath) {
            processedResponse += `\n\n📄 **تم إنشاء ملف Excel بنجاح!**\nيمكنك تحميل الملف من الرابط التالي: [تحميل ملف Excel](${(currentResult as ReportResult).filePath})`;
          } else if (actionType === "WORKER_STATEMENT" || actionType === "PROJECT_EXPENSES" || actionType === "DAILY_EXPENSES") {
            const formattedReport = this.reportGenerator.formatAsText(currentResult.data, this.getActionTitle(actionType));
            processedResponse += "\n\n" + formattedReport;
          } else {
            processedResponse += `\n\n✅ ${currentResult.message}`;
            if (Array.isArray(currentResult.data) && currentResult.data.length > 0) {
              processedResponse += "\n" + this.formatDataList(currentResult.data);
            }
          }
        } else {
          processedResponse += `\n\n❌ ${currentResult.message}`;
        }
      }
    }

    // معالجة أوامر التعديل المقترحة (لا تنفذ - تنتظر الموافقة)
    if (proposeMatch) {
      const proposeParts = proposeMatch[1].split(":");
      const proposeType = proposeParts[0];
      const proposeParams = proposeParts.slice(1);
      action = `PROPOSE_${proposeType}`;

      // حفظ العملية المعلقة
      const operationId = `op_${Date.now()}`;
      this.pendingOperations.set(operationId, {
        type: proposeType,
        params: proposeParams,
        sessionId: sessionId || "",
      });

      // إزالة الأمر وإضافة تنبيه
      processedResponse = processedResponse.replace(/\[PROPOSE:[^\]]+\]\s*/g, "");
      processedResponse += `\n\n🔐 **معرف العملية:** ${operationId}`;
    }

    return { processedResponse, action, actionData: result?.data };
  }

  /**
   * تنفيذ عملية معلقة بعد موافقة المسؤول
   */
  async executeApprovedOperation(
    operationId: string,
    sessionId: string
  ): Promise<ActionResult> {
    const operation = this.pendingOperations.get(operationId);

    if (!operation) {
      return {
        success: false,
        message: "لم يتم العثور على العملية أو انتهت صلاحيتها",
        action: "execute_operation",
      };
    }

    if (operation.sessionId !== sessionId) {
      return {
        success: false,
        message: "غير مصرح لك بتنفيذ هذه العملية",
        action: "execute_operation",
      };
    }

    let result: ActionResult;

    try {
      switch (operation.type) {
        case "CREATE_PROJECT":
          result = await this.dbActions.createProject({ name: operation.params[0] || "مشروع جديد" });
          break;

        case "CREATE_WORKER":
          result = await this.dbActions.createWorker({
            name: operation.params[0] || "عامل جديد",
            type: operation.params[1] || "عامل",
            dailyWage: operation.params[2] || "200",
          });
          break;

        case "UPDATE_WORKER":
          result = await this.dbActions.updateWorker(operation.params[0], {
            [operation.params[1]]: operation.params[2],
          });
          break;

        case "UPDATE_PROJECT":
          result = await this.dbActions.updateProject(operation.params[0], {
            [operation.params[1]]: operation.params[2],
          });
          break;

        case "DELETE_WORKER":
          result = await this.dbActions.deleteWorker(operation.params[0], true);
          break;

        case "DELETE_PROJECT":
          result = await this.dbActions.deleteProject(operation.params[0], true);
          break;

        case "DELETE_ATTENDANCE":
          result = await this.dbActions.deleteAttendance(operation.params[0], true);
          break;

        case "EXECUTE_SQL":
          result = await this.dbActions.executeCustomQuery(operation.params.join(":"), true);
          break;

        default:
          result = { success: false, message: `نوع عملية غير معروف: ${operation.type}`, action: operation.type };
      }
    } catch (error: any) {
      result = { success: false, message: `خطأ في التنفيذ: ${error.message}`, action: operation.type };
    }

    // إزالة العملية بعد التنفيذ
    this.pendingOperations.delete(operationId);

    return result;
  }

  /**
   * إلغاء عملية معلقة
   */
  cancelPendingOperation(operationId: string, sessionId: string): boolean {
    const operation = this.pendingOperations.get(operationId);
    if (operation && operation.sessionId === sessionId) {
      this.pendingOperations.delete(operationId);
      return true;
    }
    return false;
  }

  /**
   * الحصول على العمليات المعلقة لجلسة معينة
   */
  getPendingOperations(sessionId: string): Array<{ id: string; type: string; params: string[] }> {
    const pending: Array<{ id: string; type: string; params: string[] }> = [];
    this.pendingOperations.forEach((op, id) => {
      if (op.sessionId === sessionId) {
        pending.push({ id, type: op.type, params: op.params });
      }
    });
    return pending;
  }

  private getActionTitle(actionType: string): string {
    const titles: Record<string, string> = {
      WORKER_STATEMENT: "تصفية حساب العامل",
      PROJECT_EXPENSES: "ملخص مصروفات المشروع",
      DAILY_EXPENSES: "تقرير المصروفات اليومية",
    };
    return titles[actionType] || actionType;
  }

  private formatDataList(data: any[]): string {
    if (data.length === 0) return "لا توجد بيانات";

    return data
      .slice(0, 10)
      .map((item, i) => {
        if (item.name) {
          return `${i + 1}. ${item.name}`;
        }
        return `${i + 1}. ${JSON.stringify(item).slice(0, 50)}...`;
      })
      .join("\n");
  }

  /**
   * الحصول على حالة النماذج
   */
  getModelsStatus() {
    return this.modelManager.getModelsStatus();
  }

  /**
   * التحقق من توفر النماذج
   */
  isAvailable(): boolean {
    return this.modelManager.hasAvailableModel();
  }

  /**
   * الحصول على جميع النماذج المتاحة
   */
  getAllModels() {
    return this.modelManager.getAllModels();
  }

  /**
   * تحديد نموذج معين للاستخدام
   */
  setSelectedModel(modelKey: string | null) {
    this.modelManager.setSelectedProvider(modelKey);
  }

  /**
   * الحصول على النموذج المحدد حالياً
   */
  getSelectedModel(): string | null {
    return this.modelManager.getSelectedProvider();
  }
}

// Singleton instance
let aiAgentInstance: AIAgentService | null = null;

export function getAIAgentService(): AIAgentService {
  if (!aiAgentInstance) {
    aiAgentInstance = new AIAgentService();
  }
  return aiAgentInstance;
}
