import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Send, ArrowLeft, User as UserIcon, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AdDisplay } from '../components/AdDisplay';

export function Chat() {
  const { userId: otherUserId } = useParams();
  const { user, isProfileComplete } = useAuth();
  const navigate = useNavigate();
  
  const [chats, setChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch list of chats
  useEffect(() => {
    if (!user || !isProfileComplete) return;

    const q = query(
      collection(db, 'chats'),
      where('participantIds', 'array-contains', user.uid),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatsData = await Promise.all(snapshot.docs.map(async (chatDoc) => {
        const data = chatDoc.data();
        const otherId = data.participantIds.find((id: string) => id !== user.uid);
        
        // Fetch other user's profile
        let otherProfile = { displayName: 'Unknown User', photoURL: '' };
        if (otherId) {
          const profileSnap = await getDoc(doc(db, 'public_profiles', otherId));
          if (profileSnap.exists()) {
            otherProfile = profileSnap.data() as any;
          }
        }
        
        return {
          id: chatDoc.id,
          ...data,
          otherUser: { id: otherId, ...otherProfile }
        };
      }));
      
      setChats(chatsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isProfileComplete]);

  // Handle specific chat
  useEffect(() => {
    if (!user || !otherUserId || !isProfileComplete) {
      setChatId(null);
      setOtherUser(null);
      setMessages([]);
      return;
    }

    const loadChat = async () => {
      // Fetch other user's profile
      const profileSnap = await getDoc(doc(db, 'public_profiles', otherUserId));
      if (profileSnap.exists()) {
        setOtherUser({ id: otherUserId, ...profileSnap.data() });
      }

      // Find existing chat or wait for one to be created
      const q = query(
        collection(db, 'chats'),
        where('participantIds', 'in', [[user.uid, otherUserId], [otherUserId, user.uid]])
      );

      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const existingChatId = querySnapshot.docs[0].id;
        setChatId(existingChatId);
        
        // Listen to messages
        const messagesQ = query(
          collection(db, `chats/${existingChatId}/messages`),
          orderBy('createdAt', 'asc')
        );

        const unsubscribeMessages = onSnapshot(messagesQ, (snapshot) => {
          setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        });

        return () => unsubscribeMessages();
      } else {
        setChatId(null);
        setMessages([]);
      }
    };

    loadChat();
  }, [user, otherUserId, isProfileComplete]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !otherUserId || !newMessage.trim() || !isProfileComplete) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      let currentChatId = chatId;

      // Create chat if it doesn't exist
      if (!currentChatId) {
        const chatRef = doc(collection(db, 'chats'));
        currentChatId = chatRef.id;
        
        await setDoc(chatRef, {
          participantIds: [user.uid, otherUserId],
          lastMessage: messageText,
          lastMessageTime: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        
        setChatId(currentChatId);
      } else {
        // Update last message
        await updateDoc(doc(db, 'chats', currentChatId), {
          lastMessage: messageText,
          lastMessageTime: serverTimestamp()
        });
      }

      // Add message
      await addDoc(collection(db, `chats/${currentChatId}/messages`), {
        chatId: currentChatId,
        senderId: user.uid,
        text: messageText,
        isRead: false,
        createdAt: serverTimestamp()
      });

    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (!user) {
    return <div className="text-center py-12">Please sign in to view messages.</div>;
  }

  if (!isProfileComplete) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 bg-white rounded-xl border border-orange-200 shadow-sm mt-8">
        <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Complete Your Profile</h2>
        <p className="text-slate-600 mb-6">You need to complete your profile before you can use the chat feature.</p>
        <Link to="/settings">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            Go to Settings
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex h-[calc(100vh-8rem)]">
      
      {/* Sidebar - Chat List */}
      <div className={`w-full md:w-1/3 border-r border-slate-200 flex flex-col ${otherUserId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-bold text-lg text-slate-800">Messages</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-slate-500">Loading chats...</div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-center text-slate-500">No messages yet.</div>
          ) : (
            chats.map(chat => (
              <Link 
                key={chat.id} 
                to={`/chat/${chat.otherUser.id}`}
                className={`block p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${chat.otherUser.id === otherUserId ? 'bg-sky-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {chat.otherUser.photoURL ? (
                      <img src={chat.otherUser.photoURL} alt="" className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    {chat.otherUser.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-medium text-slate-900 truncate">{chat.otherUser.displayName}</h3>
                      {chat.lastMessageTime && (
                        <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                          {formatDistanceToNow(chat.lastMessageTime.toDate(), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 truncate">{chat.lastMessage}</p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`w-full md:w-2/3 flex flex-col ${!otherUserId ? 'hidden md:flex' : 'flex'}`}>
        {otherUserId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 bg-white flex items-center gap-3">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => navigate('/chat')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <Link to={`/profile/${otherUserId}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="relative">
                  {otherUser?.photoURL ? (
                    <img src={otherUser.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                  {otherUser?.isOnline && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">{otherUser?.displayName || 'Loading...'}</h2>
                  {otherUser && (
                    <p className="text-xs text-slate-500">
                      {otherUser.isOnline ? 'Online' : otherUser.lastSeen ? `Last seen ${formatDistanceToNow(otherUser.lastSeen.toDate(), { addSuffix: true })}` : 'Offline'}
                    </p>
                  )}
                </div>
              </Link>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500">
                  Send a message to start the conversation.
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, index) => {
                    const isMine = msg.senderId === user.uid;
                    const showTime = index === 0 || msg.createdAt?.toMillis() - messages[index - 1].createdAt?.toMillis() > 300000; // 5 mins
                    
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        {showTime && msg.createdAt && (
                          <span className="text-xs text-slate-400 mb-2 mx-2">
                            {msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        <div 
                          className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                            isMine 
                              ? 'bg-sky-500 text-white rounded-br-sm' 
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-slate-200 bg-white">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" disabled={!newMessage.trim()} className="bg-sky-500 hover:bg-sky-600 text-white">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <div className="mt-4">
                <AdDisplay />
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-50">
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
              <UserIcon className="w-8 h-8 text-slate-400" />
            </div>
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}