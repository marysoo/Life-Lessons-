import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';

export function AdminDashboard() {
  const { user, profileRole } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  
  // Message form
  const [msgSubject, setMsgSubject] = useState('');
  const [msgContent, setMsgContent] = useState('');
  const [msgUserId, setMsgUserId] = useState('all');

  useEffect(() => {
    if (!user || (profileRole !== 'admin' && user.email !== 'tersooaker@gmail.com')) {
      navigate('/');
      return;
    }

    const unsubUsers = onSnapshot(collection(db, 'users_private'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubAds = onSnapshot(query(collection(db, 'ads'), orderBy('createdAt', 'desc')), (snap) => {
      setAds(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubUsers();
      unsubAds();
    };
  }, [user, profileRole, navigate]);

  const toggleBlock = async (userId: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'users_private', userId), { isBlocked: !currentStatus });
    await updateDoc(doc(db, 'public_profiles', userId), { isBlocked: !currentStatus });
  };

  const updateAdStatus = async (adId: string, status: string) => {
    await updateDoc(doc(db, 'ads', adId), { status });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'admin_messages'), {
      userId: msgUserId,
      subject: msgSubject,
      content: msgContent,
      isRead: false,
      createdAt: serverTimestamp()
    });
    setMsgSubject('');
    setMsgContent('');
    alert('Message sent!');
  };

  if (profileRole !== 'admin' && user?.email !== 'tersooaker@gmail.com') return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-sky-950">Admin Dashboard</h1>
      
      <div className="flex gap-4 border-b border-sky-100 pb-2">
        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'users' ? 'bg-sky-100 text-sky-900' : 'text-slate-500 hover:bg-slate-50'}`}>Users</button>
        <button onClick={() => setActiveTab('ads')} className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'ads' ? 'bg-sky-100 text-sky-900' : 'text-slate-500 hover:bg-slate-50'}`}>Ads</button>
        <button onClick={() => setActiveTab('messages')} className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'messages' ? 'bg-sky-100 text-sky-900' : 'text-slate-500 hover:bg-slate-50'}`}>Broadcast/Messages</button>
      </div>

      {activeTab === 'users' && (
        <div className="grid gap-4">
          {users.map(u => (
            <Card key={u.id} className="border-sky-100">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-bold text-slate-900">{u.displayName} <span className="text-sm font-normal text-slate-500">({u.email})</span></p>
                  <p className="text-sm text-slate-500">Role: {u.role || 'user'} | Status: {u.isBlocked ? <span className="text-red-500 font-bold">Blocked</span> : <span className="text-green-500">Active</span>}</p>
                </div>
                <Button 
                  variant={u.isBlocked ? "outline" : "destructive"} 
                  onClick={() => toggleBlock(u.id, u.isBlocked)}
                >
                  {u.isBlocked ? 'Unblock User' : 'Block User'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'ads' && (
        <div className="grid gap-4">
          {ads.map(ad => (
            <Card key={ad.id} className="border-sky-100">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-bold text-slate-900">{ad.title}</p>
                  <p className="text-sm text-slate-600">{ad.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{ad.status}</Badge>
                    <Badge variant={ad.isActive ? "default" : "secondary"}>{ad.isActive ? 'Active' : 'Paused'}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  {ad.status !== 'approved' && <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateAdStatus(ad.id, 'approved')}>Approve</Button>}
                  {ad.status !== 'rejected' && <Button variant="destructive" onClick={() => updateAdStatus(ad.id, 'rejected')}>Reject</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
          {ads.length === 0 && <p className="text-slate-500">No ads submitted yet.</p>}
        </div>
      )}

      {activeTab === 'messages' && (
        <Card className="border-sky-100 max-w-2xl">
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Send Message to Users</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={sendMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Recipient</label>
                <select value={msgUserId} onChange={e => setMsgUserId(e.target.value)} className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm">
                  <option value="all">All Users (Broadcast)</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.displayName} ({u.email})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <Input value={msgSubject} onChange={e => setMsgSubject(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message Content</label>
                <Textarea value={msgContent} onChange={e => setMsgContent(e.target.value)} required rows={4} />
              </div>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white">Send Message</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
