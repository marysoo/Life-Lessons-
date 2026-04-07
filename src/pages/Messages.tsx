import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { AdDisplay } from '../components/AdDisplay';

export function Messages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const qUser = query(collection(db, 'admin_messages'), where('userId', '==', user.uid));
    const qAll = query(collection(db, 'admin_messages'), where('userId', '==', 'all'));

    let userMsgs: any[] = [];
    let allMsgs: any[] = [];

    const updateMessages = () => {
      const combined = [...userMsgs, ...allMsgs].sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
      setMessages(unique);
    };

    const unsubUser = onSnapshot(qUser, (snap) => {
      userMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateMessages();
    });

    const unsubAll = onSnapshot(qAll, (snap) => {
      allMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateMessages();
    });

    return () => {
      unsubUser();
      unsubAll();
    };
  }, [user]);

  const markAsRead = async (msgId: string) => {
    await updateDoc(doc(db, 'admin_messages', msgId), { isRead: true });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-sky-950">Inbox & Notifications</h1>
      
      {messages.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-sky-100 shadow-sm">
          You have no messages.
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map(msg => (
            <Card key={msg.id} className={`border-sky-100 transition-colors ${!msg.isRead ? 'bg-sky-50' : 'bg-white'}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    {msg.subject}
                    {!msg.isRead && <Badge className="bg-orange-500">New</Badge>}
                    {msg.userId === 'all' && <Badge variant="secondary">Broadcast</Badge>}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {msg.createdAt?.toDate ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                  </span>
                </div>
                <p className="text-slate-700 whitespace-pre-wrap">{msg.content}</p>
                {!msg.isRead && msg.userId !== 'all' && (
                  <button onClick={() => markAsRead(msg.id)} className="mt-3 text-sm text-sky-600 hover:underline">
                    Mark as read
                  </button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <div className="mt-8">
        <AdDisplay />
      </div>
    </div>
  );
}
