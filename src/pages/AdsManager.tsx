import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Coins, PlusCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AdsManager() {
  const { user, isBlocked, tokens, isProfileComplete } = useAuth();
  const [ads, setAds] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBuyingTokens, setIsBuyingTokens] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'ads'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setAds(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const buyTokens = async () => {
    if (!user || isBlocked) return;
    setIsBuyingTokens(true);
    try {
      await runTransaction(db, async (transaction) => {
        const privateUserRef = doc(db, 'users_private', user.uid);
        const publicProfileRef = doc(db, 'public_profiles', user.uid);
        
        const privateDoc = await transaction.get(privateUserRef);
        if (!privateDoc.exists()) throw new Error("User document does not exist!");
        
        const currentTokens = privateDoc.data().tokens || 0;

        // Add 100 tokens (Mock purchase)
        transaction.update(privateUserRef, { tokens: currentTokens + 100 });
        transaction.update(publicProfileRef, { tokens: currentTokens + 100 });
      });
      alert('Successfully purchased 100 tokens! (Mock)');
    } catch (error: any) {
      console.error(error);
      alert('Failed to purchase tokens.');
    } finally {
      setIsBuyingTokens(false);
    }
  };

  const submitAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isBlocked || !isProfileComplete) return;
    
    if (tokens < 50) {
      alert('Insufficient tokens. You need 50 tokens to submit an ad.');
      return;
    }

    setIsSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        const privateUserRef = doc(db, 'users_private', user.uid);
        const publicProfileRef = doc(db, 'public_profiles', user.uid);
        
        const privateDoc = await transaction.get(privateUserRef);
        if (!privateDoc.exists()) throw new Error("User document does not exist!");
        
        const currentTokens = privateDoc.data().tokens || 0;
        if (currentTokens < 50) throw new Error("Insufficient tokens!");

        // Deduct tokens
        transaction.update(privateUserRef, { tokens: currentTokens - 50 });
        transaction.update(publicProfileRef, { tokens: currentTokens - 50 });

        // Create Ad
        const newAdRef = doc(collection(db, 'ads'));
        transaction.set(newAdRef, {
          userId: user.uid,
          title,
          description,
          linkUrl,
          imageUrl,
          status: 'pending', // Requires admin approval
          isActive: true,
          createdAt: serverTimestamp()
        });
      });

      setTitle('');
      setDescription('');
      setLinkUrl('');
      setImageUrl('');
      alert('Ad submitted for review! 50 tokens have been deducted.');
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Failed to submit ad.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (adId: string, current: boolean) => {
    await updateDoc(doc(db, 'ads', adId), { isActive: !current });
  };

  if (isBlocked) {
    return <div className="text-center py-12 text-red-500">Your account is blocked. You cannot manage ads.</div>;
  }

  if (!isProfileComplete) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 bg-white rounded-xl border border-orange-200 shadow-sm">
        <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Complete Your Profile</h2>
        <p className="text-slate-600 mb-6">You need to complete your profile before you can manage ads.</p>
        <Link to="/settings">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            Go to Settings
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-sky-100 shadow-sm">
        <h1 className="text-2xl font-bold text-sky-950">My Advertisements</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-lg border border-orange-100">
            <Coins className="w-5 h-5 text-orange-500" />
            <span className="font-bold text-orange-700">{tokens} Tokens</span>
          </div>
          <Button onClick={buyTokens} disabled={isBuyingTokens} variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50">
            <PlusCircle className="w-4 h-4 mr-2" />
            Buy Tokens
          </Button>
        </div>
      </div>

      <Card className="border-sky-100">
        <CardHeader>
          <h2 className="text-xl font-bold text-slate-900">Create New Ad</h2>
          <p className="text-sm text-slate-500">Promote your business to the community. Ads require admin approval. Cost: 50 tokens.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitAd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ad Title</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} required maxLength={100} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target URL</label>
                <Input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Image URL (Optional)</label>
              <Input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} required maxLength={500} rows={3} />
            </div>
            <Button type="submit" disabled={isSubmitting || tokens < 50} className="bg-orange-500 hover:bg-orange-600 text-white">
              {isSubmitting ? 'Processing...' : 'Pay 50 Tokens & Submit Ad'}
            </Button>
            {tokens < 50 && (
              <p className="text-sm text-red-500 mt-2">You need at least 50 tokens to submit an ad.</p>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Your Campaigns</h2>
        {ads.length === 0 ? (
          <p className="text-slate-500">You haven't created any ads yet.</p>
        ) : (
          <div className="grid gap-4">
            {ads.map(ad => (
              <Card key={ad.id} className="border-sky-100">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-bold text-slate-900">{ad.title}</h3>
                    <p className="text-sm text-slate-600 mb-2">{ad.description}</p>
                    <div className="flex gap-2">
                      <Badge variant={ad.status === 'approved' ? 'default' : ad.status === 'rejected' ? 'destructive' : 'secondary'}>
                        Status: {ad.status}
                      </Badge>
                      <Badge variant="outline">
                        {ad.isActive ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Button variant="outline" onClick={() => toggleActive(ad.id, ad.isActive)}>
                      {ad.isActive ? 'Pause Ad' : 'Resume Ad'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
