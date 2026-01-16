import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Bot, 
  Copy, 
  Trash2,
  Plus,
  History,
  Settings,
  Search,
  MessageSquare,
  ThumbsUp,
  Share2,
  Sparkles,
  Zap,
  ArrowUpRight,
  ArrowUp,
  ShieldCheck,
  BrainCircuit,
  PanelLeftClose,
  PanelLeftOpen,
  FileSpreadsheet,
  Clock,
  CheckCircle,
  Loader,
  RefreshCw
} from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";

// Mock ThemeToggle to prevent crash
const ThemeToggle = () => (
  <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 no-default-hover-elevate no-default-active-elevate">
    <Zap className="h-4 w-4" />
  </Button>
);

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  pending?: boolean;
  error?: string;
  feedback?: "thumbs_up" | "thumbs_down";
  steps?: { title: string; status: 'completed' | 'in_progress' | 'pending'; description?: string }[];
}

export default function AIChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "مرحباً بك في مركز قيادة AgentForge. لقد تم تفعيل الوكيل الجديد مع كافة الصلاحيات للوصول إلى أدوات المشروع وتحليل البيانات الاستراتيجية.\n\nكيف يمكنني مساعدتك اليوم باستخدام قدرات AF المتقدمة؟",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setAttachments(prev => [...prev, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setAttachmentPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // جلب الجلسات
  const { data: sessions = [] } = useQuery({
    queryKey: ["/api/ai/sessions"],
    queryFn: async () => {
      try {
        const res = await apiRequest("/api/ai/sessions", "GET");
        return Array.isArray(res) ? res : [];
      } catch (error) {
        console.error("خطأ في جلب الجلسات:", error);
        return [];
      }
    },
    enabled: !!user,
  });

  // جلب الوصول
  const { data: accessData, isLoading: isAccessLoading } = useQuery({
    queryKey: ["/api/ai/access"],
    queryFn: async () => {
      try {
        const res = await apiRequest("/api/ai/access", "GET");
        return res;
      } catch (error: any) {
        if (user?.role === 'admin' || user?.role === 'super_admin') {
          return { hasAccess: true };
        }
        throw error;
      }
    },
    retry: 1,
    staleTime: 30000
  });

  const hasAccess = user?.role === 'admin' || user?.role === 'super_admin' || accessData?.hasAccess;

  const createSessionMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest("/api/ai/sessions", "POST", { title });
      return res;
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.sessionId);
      queryClient.invalidateQueries({ queryKey: ["/api/ai/sessions"] });
      setMessages([
        {
          role: "assistant",
          content: "بدأنا جلسة جديدة. أنا جاهز لمعالجة طلباتك واستخراج البيانات المطلوبة.",
          timestamp: new Date(),
        },
      ]);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      setIsLoading(true);
      try {
        let activeSessionId = currentSessionId;

        if (!activeSessionId) {
          const sessionRes = await apiRequest("/api/ai/sessions", "POST", { 
            title: message.substring(0, 50) + (message.length > 50 ? "..." : "") 
          });
          
          activeSessionId = sessionRes.sessionId;
          setCurrentSessionId(activeSessionId);
          queryClient.invalidateQueries({ queryKey: ["/api/ai/sessions"] });
        }

        const chatRes = await apiRequest("/api/ai/chat", "POST", {
          sessionId: activeSessionId,
          message,
        });
        
        return { ...chatRes, sessionId: activeSessionId };
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/sessions"] });
      const assistantMessage: Message = {
        role: "assistant",
        content: data.message || "عذراً، لم أتمكن من معالجة الطلب حالياً.",
        timestamp: new Date(),
        steps: data.steps,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error || error.message || "انقطع الاتصال بالخادم الذكي";
      toast({
        title: "خطأ في المعالجة",
        description: errorMsg,
        variant: "destructive",
      });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest(`/api/ai/sessions/${sessionId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/sessions"] });
      if (currentSessionId) {
        setCurrentSessionId(null);
        startNewChat();
      }
    },
  });

  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      lastScrollY.current = currentScrollY;
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setAttachments([]);
    setAttachmentPreviews([]);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      await sendMessageMutation.mutateAsync(currentInput);
    } catch (err) {
      // Error handled by mutation
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([
      {
        role: "assistant",
        content: "مرحباً بك في مركز القيادة الذكي. أنا الوكيل المتقدم لمساعدتك في إدارة العمليات والبيانات.\n\nبإمكاني تحليل المشاريع، إنشاء التقارير، وأتمتة المهام الروتينية بدقة عالية. كيف يمكنني دعم أهدافك اليوم؟",
        timestamp: new Date(),
      },
    ]);
  };

  const handleSessionClick = async (sessionId: string) => {
    if (currentSessionId === sessionId) {
      if (window.innerWidth < 1024) setSidebarOpen(false);
      return;
    }
    
    setCurrentSessionId(sessionId);
    if (window.innerWidth < 1024) setSidebarOpen(false);
    
    setMessages([{ 
      role: "assistant", 
      content: "جاري تحميل محادثتك الاستراتيجية...", 
      timestamp: new Date(),
      pending: true 
    }]);

    try {
      const res = await apiRequest(`/api/ai/sessions/${sessionId}/messages`, "GET");
      if (Array.isArray(res)) {
        if (res.length === 0) {
          setMessages([{
            role: "assistant",
            content: "هذه المحادثة فارغة حالياً. كيف يمكنني مساعدتك؟",
            timestamp: new Date(),
          }]);
        } else {
          setMessages(res.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: new Date(m.createdAt),
            steps: m.steps
          })));
        }
      }
    } catch (error) {
      toast({
        title: "خطأ في الاتصال",
        description: "تعذر تحميل رسائل الجلسة من قاعدة البيانات",
        variant: "destructive",
      });
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "تم النسخ",
      description: "النص جاهز في الحافظة",
    });
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 100);
      }
    }
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const filteredSessions = sessions.filter((s: any) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isAccessLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-slate-950">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-4"
        >
          <BrainCircuit className="h-10 w-10 text-blue-600" />
        </motion.div>
        <p className="text-slate-500 font-medium animate-pulse">جاري تهيئة الوكيل الذكي...</p>
      </div>
    );
  }

  if (!hasAccess && !isAccessLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="p-8 text-center border-none shadow-2xl bg-white/70 backdrop-blur-2xl dark:bg-slate-900/70 rounded-[2.5rem] overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
            <div className="relative z-10">
              <div className="w-20 h-20 bg-blue-600/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="h-10 w-10 text-blue-600" />
              </div>
              <h1 className="text-3xl font-black mb-4 tracking-tight text-slate-900 dark:text-white">منطقة استراتيجية</h1>
              <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed font-medium">
                الوصول إلى الوكيل الذكي يتطلب مستوى صلاحيات "مسؤول نظام" لتفعيل قدرات التحليل المتقدمة.
              </p>
              <div className="space-y-4">
                <Button 
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] no-default-hover-elevate no-default-active-elevate" 
                  onClick={() => setLocation('/')}
                >
                  العودة للوحة التحكم
                </Button>
                <p className="text-xs text-slate-400 font-medium">تواصل مع الإدارة لطلب الترقية</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden font-sans selection:bg-blue-100 dark:selection:bg-blue-900/30" dir="rtl">
        {/* Sidebar - Glassmorphic Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              {/* Scrim/Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-[140]"
              />
              <motion.div
                initial={{ width: 0, opacity: 0, x: 20 }}
                animate={{ width: 260, opacity: 1, x: 0 }}
                exit={{ width: 0, opacity: 0, x: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-l border-slate-200/60 dark:border-slate-800/60 flex flex-col fixed inset-y-0 right-0 z-[150] shadow-2xl"
              >
                <div className="p-6 flex flex-col gap-6 h-full">
                  <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group">
                              <Sparkles className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
                            </div>
                            <div>
                              <h2 className="font-black text-slate-900 dark:text-white tracking-tight">AgentForge Commander</h2>
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Powered by AF-Core</span>
                              </div>
                            </div>
                          </div>
                    <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="rounded-xl hover:bg-white dark:hover:bg-slate-800 shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                      <PanelLeftClose className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button 
                    onClick={startNewChat}
                    className="w-full h-12 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white gap-3 shadow-sm border border-slate-200 dark:border-slate-700 transition-all hover:scale-[1.02] active:scale-[0.98] font-bold rounded-xl no-default-hover-elevate no-default-active-elevate"
                  >
                    <Plus className="h-4 w-4 text-blue-600" />
                    محادثة استراتيجية
                  </Button>

                  <div className="relative group">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                      placeholder="البحث في الأرشيف..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10 h-11 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all rounded-xl text-sm font-medium"
                    />
                  </div>

                  <ScrollArea className="flex-1 -mx-2 px-2">
                    <div className="space-y-1.5 pb-4">
                      {filteredSessions.length === 0 ? (
                        <div className="text-center py-12 px-4">
                          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                            <History className="h-5 w-5 text-slate-300" />
                          </div>
                          <p className="text-xs font-bold text-slate-400">لا توجد سجلات حالية</p>
                        </div>
                      ) : filteredSessions.map((session: any) => (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, x: 5 }}
                          animate={{ opacity: 1, x: 0 }}
                          onClick={() => handleSessionClick(session.id)}
                          className={`group relative p-3.5 rounded-2xl cursor-pointer transition-all border ${
                            currentSessionId === session.id
                              ? "bg-white dark:bg-slate-800 border-blue-100 dark:border-blue-900/50 shadow-sm"
                              : "border-transparent hover:bg-white/40 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                              currentSessionId === session.id 
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600"
                            }`}>
                              <MessageSquare className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold truncate ${currentSessionId === session.id ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"}`}>
                                {session.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{session.messagesCount} تفاعل</span>
                                <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                <span className="text-[10px] font-medium text-slate-400 italic">نشط</span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSessionMutation.mutate(session.id);
                              }}
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg no-default-hover-elevate no-default-active-elevate"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="mt-auto pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center overflow-hidden border border-white dark:border-slate-600 shadow-sm">
                      <span className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase">{user?.email?.[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-900 dark:text-white truncate tracking-tight">{user?.email?.split('@')[0]}</p>
                      <Badge variant="outline" className="text-[9px] font-black uppercase py-0 px-1.5 border-blue-200 text-blue-600 bg-blue-50/50">
                        {user?.role === 'admin' ? 'Chief Architect' : user?.role}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl no-default-hover-elevate no-default-active-elevate">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative bg-white dark:bg-slate-950 min-w-0 h-full overflow-hidden">
        {/* Header Overlay - Adjusted for better visibility and float */}
        <AnimatePresence>
          {showHeader && (
            <motion.div 
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="absolute top-0 left-0 right-0 z-[100] p-4 pointer-events-none"
            >
              <div className="max-w-5xl mx-auto flex items-center justify-between pointer-events-auto">
                <div className="flex items-center gap-2">
                  {!sidebarOpen && (
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => setSidebarOpen(true)} 
                      className="h-10 w-10 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all no-default-hover-elevate no-default-active-elevate"
                    >
                      <PanelLeftOpen className="h-4 w-4 text-slate-600" />
                    </Button>
                  )}
                  <div className="flex items-center gap-2 px-3 h-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Neural Pro</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startNewChat}
                    className="h-10 px-4 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-slate-200 dark:border-slate-800 text-[10px] font-bold gap-2 no-default-hover-elevate no-default-active-elevate hidden sm:flex shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5 text-blue-600" />
                    مهمة جديدة
                  </Button>
                  <div className="h-10 w-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center">
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto py-24 space-y-10 pb-40">
            {messages.length <= 1 && !currentSessionId && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="text-center py-16"
              >
                <div className="relative inline-block mb-10">
                  <div className="absolute inset-0 bg-blue-600/20 blur-[60px] rounded-full scale-150 animate-pulse" />
                  <div className="relative w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-blue-500/40 transform -rotate-6">
                    <Sparkles className="h-12 w-12 text-white" />
                  </div>
                </div>
                <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter leading-tight">كيف يمكنني قيادة <br/><span className="text-blue-600">بياناتك اليوم؟</span></h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed font-medium text-lg mb-16">أنا وحدة الذكاء الاصطناعي المتقدمة، مصمم لتحليل أداء مشاريعك واستخراج رؤى استراتيجية من بياناتك بدقة متناهية.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
                  {[
                    { title: "التقرير التنفيذي الشامل", desc: "ملخص ذكي لكافة العمليات الجارية", icon: FileSpreadsheet, prompt: "أريد تقريراً تنفيذياً شاملاً عن حالة كافة المشاريع النشطة اليوم", color: "blue" },
                    { title: "تحليل كفاءة الإنفاق", desc: "رصد الانحرافات المالية والتدفقات", icon: Zap, prompt: "حلل نمط الإنفاق في آخر 30 يوماً وقارنه بالميزانيات التقديرية", color: "amber" },
                    { title: "جرد المستحقات العمالية", desc: "كشوفات دقيقة للعمال والمهام", icon: MessageSquare, prompt: "استخرج لي قائمة بالمستحقات المتبقية للعمال في المشاريع النشطة", color: "emerald" },
                    { title: "التدقيق المالي الاستباقي", desc: "كشف الثغرات والأخطاء المحتملة", icon: ShieldCheck, prompt: "هل تكتشف أي تضارب أو عمليات غير منطقية في السجلات المالية الأخيرة؟", color: "rose" }
                  ].map((item, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ y: -5, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setInput(item.prompt)}
                      className="p-6 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 hover:shadow-2xl hover:shadow-blue-500/10 text-right transition-all group flex items-start gap-5 relative overflow-hidden"
                    >
                      <div className={`p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner`}>
                        <item.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 pt-1">
                        <h4 className="font-black text-slate-900 dark:text-white mb-1 tracking-tight">{item.title}</h4>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none">{item.desc}</p>
                      </div>
                      <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowUpRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="space-y-10">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex gap-3 max-w-[90%] sm:max-w-[85%] ${message.role === "user" ? "flex-row" : "flex-row-reverse"}`}>
                    <div className={`flex-1 flex flex-col gap-1.5 ${message.role === "user" ? "items-end" : "items-start"}`}>
                      <div className={`flex items-center gap-2 px-1 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                          {message.role === "user" ? "You" : "Neural Agent"}
                        </span>
                        <span className="text-[10px] text-slate-300 dark:text-slate-600">
                          {format(message.timestamp, "h:mm a")}
                        </span>
                      </div>

                      <div className={`flex flex-col gap-2 w-full ${message.role === "user" ? "items-end" : "items-start"}`}>
                        {message.role === "assistant" && message.pending && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                            <Loader className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                            <span className="text-xs font-bold text-blue-600 animate-pulse">Working...</span>
                          </div>
                        )}
                        {message.steps && (
                          <div className="w-full max-w-sm">
                            <Card className="border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden rounded-2xl">
                              <details className="group">
                                <summary className="flex items-center justify-between p-3 cursor-pointer list-none hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                      {message.steps.length} Completed tasks
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-slate-400">
                                      {message.steps.filter(s => s.status === 'completed').length}/{message.steps.length}
                                    </span>
                                    <ArrowUp className="h-3 w-3 text-slate-400 group-open:rotate-180 transition-transform" />
                                  </div>
                                </summary>
                                <div className="p-3 pt-0 space-y-2 border-t border-slate-200/40 dark:border-slate-800/40">
                                  {message.steps.map((step, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                      {step.status === 'completed' ? (
                                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                                      ) : step.status === 'in_progress' ? (
                                        <Loader className="h-3 w-3 text-blue-500 animate-spin" />
                                      ) : (
                                        <Clock className="h-3 w-3 text-slate-300" />
                                      )}
                                      <span className="text-[11px] font-medium text-slate-500">{step.title}</span>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </Card>
                          </div>
                        )}

                        <div className={`text-sm leading-relaxed whitespace-pre-wrap font-medium break-words max-w-full ${
                          message.role === "user" ? "text-slate-700 dark:text-slate-200" : "text-slate-800 dark:text-slate-100"
                        }`}>
                          {message.content}
                        </div>
                      </div>

                      {message.role === "assistant" && !message.pending && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => copyMessage(message.content)} className="h-7 w-7 text-slate-300 hover:text-blue-600">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-blue-600">
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-shrink-0 pt-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        message.role === "user" 
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-500" 
                          : "bg-blue-600/10 text-blue-600"
                      }`}>
                        {message.role === "user" ? (
                          <span className="text-[10px] font-black uppercase">{user?.email?.[0]}</span>
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-5 max-w-[75%]">
                    <div className="w-11 h-11 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center animate-pulse">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-[2.5rem] rounded-tl-none shadow-sm border border-slate-200/50 dark:border-slate-800/50">
                        <div className="flex gap-1.5">
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </ScrollArea>

                        {/* Floating Input Bar - Replit Style */}
        <div className="absolute bottom-6 left-0 right-0 p-4 z-[120] pointer-events-none">
          <div className="max-w-3xl mx-auto relative group pointer-events-auto">
            <div className="absolute inset-0 bg-blue-600/5 blur-2xl rounded-[1.5rem] group-focus-within:bg-blue-600/10 transition-all" />
            <div className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 p-2 rounded-[1.5rem] shadow-none">
              <div className="flex flex-col">
                {/* Image Previews */}
                <AnimatePresence>
                  {attachmentPreviews.length > 0 && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="flex flex-wrap gap-2 px-3 pt-2 overflow-hidden"
                    >
                      {attachmentPreviews.map((preview, i) => (
                        <div key={i} className="relative group/img">
                          <img src={preview} alt="Attachment" className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                          <button 
                            onClick={() => removeAttachment(i)}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <textarea
                  ref={textareaRef}
                  placeholder="كيف يمكنني مساعدتك في إدارة مشاريعك اليوم؟"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.shiftKey) {
                      // Allow shift+enter for new lines if needed, 
                      // but user specifically asked Enter to be new line.
                    }
                  }}
                  rows={1}
                  className="w-full bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 py-3 px-3 text-sm font-medium resize-none min-h-[44px] max-h-48 shadow-none"
                />
                
                <div className="flex items-center justify-between px-2 pb-1 mt-1">
                  <div className="flex items-center gap-1">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      multiple 
                      onChange={handleFileSelect}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => fileInputRef.current?.click()}
                      className="h-9 w-9 rounded-xl text-slate-400 hover:text-blue-600 no-default-hover-elevate no-default-active-elevate"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:text-blue-600 no-default-hover-elevate no-default-active-elevate">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <AnimatePresence>
                      {(input.trim() || attachments.length > 0) && (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                        >
                          <Button 
                            onClick={handleSend}
                            disabled={isLoading}
                            size="icon"
                            className="h-9 w-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95 no-default-hover-elevate no-default-active-elevate"
                          >
                            {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {!input.trim() && attachments.length === 0 && (
                      <div className="h-9 w-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 rounded-xl">
                        <ArrowUp className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
