import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card';
import { moderatePost } from '../services/geminiService';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { ImagePlus, X, Film } from 'lucide-react';

export function CreatePost() {
  const { user, isBlocked } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be less than 10MB.');
      return;
    }

    setMediaFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isBlocked) return;
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

      // 2. Upload Media if exists
      let mediaUrl = null;
      let mediaType = null;
      
      if (mediaFile) {
        try {
          const fileRef = ref(storage, `posts/${user.uid}/${Date.now()}_${mediaFile.name}`);
          const uploadResult = await uploadBytes(fileRef, mediaFile);
          mediaUrl = await getDownloadURL(uploadResult.ref);
          mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
        } catch (uploadError: any) {
          console.error("Upload error:", uploadError);
          if (uploadError.code === 'storage/unauthorized') {
            setError('Storage is not configured or you do not have permission. Please enable Firebase Storage in your console.');
          } else {
            setError('Failed to upload media. Please try again.');
          }
          setIsSubmitting(false);
          return;
        }
      }

      // 3. Parse tags
      const tags = tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0).slice(0, 5);

      // 4. Save to Firestore
      const postData: any = {
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorPhoto: user.photoURL || '',
        content: content.trim(),
        tags,
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
        isAIModerated: true
      };

      if (mediaUrl && mediaType) {
        postData.mediaUrl = mediaUrl;
        postData.mediaType = mediaType;
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
            
            {/* Media Upload Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">Add Photo or Video (Optional)</label>
              
              {!mediaPreview ? (
                <div className="flex gap-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="w-4 h-4" />
                    <Film className="w-4 h-4" />
                    Upload Media
                  </Button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,video/*" 
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="relative inline-block border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <button 
                    type="button"
                    onClick={clearMedia}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {mediaFile?.type.startsWith('video/') ? (
                    <video src={mediaPreview} className="max-h-[300px] max-w-full object-contain" controls />
                  ) : (
                    <img src={mediaPreview} alt="Preview" className="max-h-[300px] max-w-full object-contain" />
                  )}
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
