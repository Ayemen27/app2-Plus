import { createRoot } from "react-dom/client";
import { initializeDB } from "./offline/db";
import App from "./App";
import "./index.css";
import "./nav-fix.css";

// 🚀 تنظيف الكود وتبسيط عملية الإقلاع للإنتاج
const startApp = async () => {
  const rootElement = document.getElementById("root");
  if (!rootElement) return;

  try {
    // محاولة تنظيف الكاش إذا كان هناك تحديث جديد
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.update();
        }
      });
    }

    // تهيئة قاعدة البيانات في الخلفية لتجنب حجب الواجهة
    initializeDB().catch(console.error);

    const root = createRoot(rootElement);
    root.render(<App />);
  } catch (err: any) {
    console.error("Fatal startup error:", err);
    rootElement.innerHTML = `<div style="padding:20px;text-align:center;direction:rtl;">حدث خطأ أثناء تشغيل التطبيق. يرجى تحديث الصفحة.</div>`;
  }
};

startApp();
