import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { io, Socket } from 'socket.io-client';

export function useWebSocketSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const connectSocket = () => {
      try {
        console.log('🔌 [Socket.IO] محاولة الاتصال...');
        
        // Socket.IO سيتعامل مع كل شيء تلقائياً
        const socket = io({
          // ترك الـ URL فارغ = استخدام نفس الـ origin الحالي
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 10,
          transports: ['websocket', 'polling'],
          // إذا كنا في development على localhost
          ...(window.location.hostname === 'localhost' && {
            // لا نحتاج إلى أي تخصيص - Socket.IO يعرف أنه localhost
          }),
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('✅ [Socket.IO] تم الاتصال بنجاح!', socket.id);
        });

        socket.on('disconnect', (reason: string) => {
          console.log('🔌 [Socket.IO] تم قطع الاتصال:', reason);
        });

        socket.on('error', (error: any) => {
          console.error('❌ [Socket.IO] خطأ:', error);
        });

        socket.on('message', (message: any) => {
          try {
            console.log('📨 [Socket.IO] رسالة مستلمة:', message);

            // Handle different message types
            if (message.type === 'INVALIDATE') {
              const queryKey = [message.entity, message.id].filter(Boolean);
              console.log('🔄 [Socket.IO] تحديث الـ cache:', queryKey);
              queryClient.invalidateQueries({ queryKey });
            } else if (message.type === 'UPDATE_ALL') {
              queryClient.invalidateQueries({ 
                queryKey: [message.entity],
                exact: false 
              });
            }
          } catch (error) {
            console.error('❌ [Socket.IO] خطأ في معالجة الرسالة:', error);
          }
        });

      } catch (error) {
        console.error('❌ [Socket.IO] خطأ في الاتصال:', error);
      }
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [queryClient, toast]);
}
