import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card';
import { moderatePost } from '../services/geminiService';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { AlertCircle, Link as LinkIcon } from 'lucide-react';

export function CreatePost() {
  const { user, isBlocked, isProfileComplete, profileData } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isBlocked || !isProfileComplete) return;
    if (content.trim().length < 20) {
      setError('Please share a bit more detail. A good lesson is usually more than a few words.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 1. AI Moderation Check
      const moderationResult = await moderatePost(content);
      
      if (!moderationResult.isGenuine) {
        setError(`Your post was flagged by our moderation system: ${moderationResult.reason}. Please ensure you are sharing a genuine life experience.`);
        setIsSubmitting(false);
        return;
      }

      // 2. Parse tags
      const tags = tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0).slice(0, 5);

      // 3. Determine Author Name based on privacy settings
      let authorName = profileData?.displayName || user.displayName || 'Anonymous';
      if (profileData && !profileData.hideRealName && profileData.realName) {
        authorName = profileData.realName;
      }

      // 4. Save to Firestore
      const postData: any = {
        authorId: user.uid,
        authorName: authorName,
        authorPhoto: profileData?.photoURL || user.photoURL || '',
        content: content.trim(),
        tags,
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
        isAIModerated: true
      };

      if (mediaUrlInput.trim()) {
        postData.mediaUrl = mediaUrlInput.trim();
        postData.mediaType = mediaType || 'image'; // Default to image if not explicitly set to video
      }

      await addDoc(collection(db, 'posts'), postData);

      navigate('/');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'posts');
      setError('Failed to share your lesson. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <div className="text-center py-12">Please sign in to share a lesson.</div>;
  }

  if (isBlocked) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 bg-white rounded-xl border border-red-200 shadow-sm">
        <h2 className="text-xl font-bold text-red-600 mb-2">Account Blocked</h2>
        <p className="text-slate-600">Your account has been blocked by an administrator. You cannot share new lessons.</p>
      </div>
    );
  }

  if (!isProfileComplete) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 bg-white rounded-xl border border-orange-200 shadow-sm">
        <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Complete Your Profile</h2>
        <p className="text-slate-600 mb-6">You need to complete your profile before you can share a lesson.</p>
        <Link to="/settings">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            Go to Settings
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Share a Life Lesson</CardTitle>
          <p className="text-sm text-slate-500">
            Share a genuine experience and the wisdom you gained from it. Your story could help someone else navigating a similar path.
          </p>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">Your Story & Lesson</label>
              <Textarea 
                placeholder="I used to think that... but then I experienced... and I learned..." 
                className="min-h-[200px] resize-y"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>
            
            {/* Media URL Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">Add Photo or Video URL (Optional)</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <Input 
                    type="url" 
                    placeholder="https://example.com/image.jpg" 
                    className="pl-10"
                    value={mediaUrlInput}
                    onChange={(e) => setMediaUrlInput(e.target.value)}
                  />
                </div>
                <select 
                  className="h-10 rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={mediaType || 'image'}
                  onChange={(e) => setMediaType(e.target.value as 'image' | 'video')}
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>
              {mediaUrlInput && mediaType === 'image' && (
                <div className="mt-2 relative inline-block border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <img src={mediaUrlInput} alt="Preview" className="max-h-[200px] max-w-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">Tags (Optional)</label>
              <Input 
                placeholder="resilience, career, relationships (comma separated)" 
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
              <p className="text-xs text-slate-500">Add up to 5 tags to help others find your lesson.</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 border-t border-slate-100 pt-6">
            <Button type="button" variant="ghost" onClick={() => navigate('/')} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sharing...' : 'Share Lesson'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
