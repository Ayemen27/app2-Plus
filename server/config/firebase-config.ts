import admin from "firebase-admin";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * إعداد Firebase Admin SDK
 */

if (!admin.apps.length) {
  try {
    let serviceAccount;
    
    // محاولة استخدام متغير البيئة أولاً
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      // البحث عن ملف المفتاح في عدة مسارات محتملة
      const possiblePaths = [
        join(process.cwd(), "serviceAccountKey.json"),
        join(process.cwd(), "firebase-service-account.json"),
        "/home/runner/workspace/serviceAccountKey.json"
      ];
      
      let foundPath = possiblePaths.find(p => {
        try {
          return readFileSync(p);
        } catch (e) {
          return false;
        }
      });

      if (foundPath) {
        serviceAccount = JSON.parse(readFileSync(foundPath, "utf8"));
      }
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
        storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
      });
      // إجبار Firestore على استخدام قاعدة البيانات الافتراضية بشكل صريح
      admin.firestore().settings({
        host: "firestore.googleapis.com",
        ssl: true,
        ignoreUndefinedProperties: true
      });
      console.log("✅ تم ربط Firebase Admin SDK بنجاح وإعداد Firestore");
    } else {
      // المحاولة باستخدام أوراق الاعتماد الافتراضية
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET
      });
      console.log("✅ تم ربط Firebase Admin SDK باستخدام Application Default Credentials");
    }
  } catch (error) {
    console.error("❌ فشل إعداد Firebase Admin SDK:", error);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
