import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, runTransaction, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Heart, MessageCircle, AlertCircle, Edit, Link as LinkIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { moderatePost } from '../services/geminiService';

export function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const { user, isBlocked, isProfileComplete, profileData } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTagsInput, setEditTagsInput] = useState('');
  const [editMediaUrl, setEditMediaUrl] = useState('');
  const [editMediaType, setEditMediaType] = useState<'image' | 'video' | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (!postId) return;

    // Fetch Post
    const fetchPost = async () => {
      try {
        const docRef = doc(db, 'posts', postId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPost({ id: docSnap.id, ...data });
          setEditContent(data.content || '');
          setEditTagsInput((data.tags || []).join(', '));
          setEditMediaUrl(data.mediaUrl || '');
          setEditMediaType(data.mediaType || 'image');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `posts/${postId}`);
      }
    };

    fetchPost();

    // Listen to Comments
    const q = query(collection(db, 'comments'), where('postId', '==', postId), orderBy('createdAt', 'asc'));
    const unsubscribeComments = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'comments');
    });

    // Check if liked
    let unsubscribeLike = () => {};
    if (user) {
      const likeId = `${user.uid}_${postId}`;
      const likeRef = doc(db, 'likes', likeId);
      unsubscribeLike = onSnapshot(likeRef, (docSnap) => {
        setIsLiked(docSnap.exists());
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `likes/${likeId}`);
      });
    }

    return () => {
      unsubscribeComments();
      unsubscribeLike();
    };
  }, [postId, user]);

  const handleLike = async () => {
    if (!user || !post || isBlocked || !isProfileComplete) return;
    const likeId = `${user.uid}_${postId}`;
    const likeRef = doc(db, 'likes', likeId);
    const postRef = doc(db, 'posts', postId);

    try {
      let newLikesCount = 0;
      await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) throw new Error("Post does not exist!");

        const likeDoc = await transaction.get(likeRef);
        const currentLikes = postDoc.data().likesCount || 0;

        if (likeDoc.exists()) {
          // Unlike
          transaction.delete(likeRef);
          transaction.update(postRef, { likesCount: currentLikes - 1 });
          newLikesCount = currentLikes - 1;
        } else {
          // Like
          transaction.set(likeRef, {
            userId: user.uid,
            postId: postId,
            createdAt: serverTimestamp()
          });
          transaction.update(postRef, { likesCount: currentLikes + 1 });
          newLikesCount = currentLikes + 1;
        }
      });
      setPost({ ...post, likesCount: newLikesCount });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `likes/${likeId}`);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !postId || !newComment.trim() || isBlocked || !isProfileComplete) return;

    setSubmittingComment(true);
    try {
      await runTransaction(db, async (transaction) => {
        const postRef = doc(db, 'posts', postId);
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) throw new Error("Post does not exist!");

        let authorName = profileData?.displayName || user.displayName || 'Anonymous';
        if (profileData && !profileData.hideRealName && profileData.realName) {
          authorName = profileData.realName;
        }

        const newCommentRef = doc(collection(db, 'comments'));
        transaction.set(newCommentRef, {
          postId,
          authorId: user.uid,
          authorName: authorName,
          authorPhoto: profileData?.photoURL || user.photoURL || '',
          content: newComment.trim(),
          createdAt: serverTimestamp()
        });

        transaction.update(postRef, { commentsCount: (postDoc.data().commentsCount || 0) + 1 });
      });
      setNewComment('');
      setPost({ ...post, commentsCount: (post.commentsCount || 0) + 1 });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'comments');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !postId || isBlocked) return;
    if (editContent.trim().length < 20) {
      setEditError('Please share a bit more detail. A good lesson is usually more than a few words.');
      return;
    }

    setIsSavingEdit(true);
    setEditError('');

    try {
      // AI Moderation Check
      const moderationResult = await moderatePost(editContent);
      
      if (!moderationResult.isGenuine) {
        setEditError(`Your edit was flagged by our moderation system: ${moderationResult.reason}. Please ensure you are sharing a genuine life experience.`);
        setIsSavingEdit(false);
        return;
      }

      const tags = editTagsInput.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0).slice(0, 5);

      const updateData: any = {
        content: editContent.trim(),
        tags,
        lastModifiedAt: serverTimestamp(),
        isAIModerated: true
      };

      if (editMediaUrl.trim()) {
        updateData.mediaUrl = editMediaUrl.trim();
        updateData.mediaType = editMediaType || 'image';
      } else {
        updateData.mediaUrl = null;
        updateData.mediaType = null;
      }

      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, updateData);

      setPost({ ...post, ...updateData, lastModifiedAt: new Date() }); // Optimistic update
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
      setEditError('Failed to save edits. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (loading || !post) {
    return <div className="flex justify-center py-12"><div className="animate-pulse text-slate-500">Loading lesson...</div></div>;
  }

  const isAuthor = user && user.uid === post.authorId;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Card className="overflow-hidden border-sky-100">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <Link to={`/profile/${post.authorId}`} className="flex items-center gap-4 group">
              <Avatar className="h-12 w-12 ring-2 ring-sky-50">
                <AvatarImage src={post.authorPhoto} referrerPolicy="no-referrer" />
                <AvatarFallback className="bg-sky-100 text-sky-700">{post.authorName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-base font-semibold text-sky-950 group-hover:underline">{post.authorName}</p>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>{post.createdAt?.toDate ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'Just now'}</span>
                  {post.lastModifiedAt && (
                    <span className="text-xs italic text-slate-400">(edited)</span>
                  )}
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              {post.isAIModerated && (
                <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                  Verified Genuine
                </Badge>
              )}
              {isAuthor && !isEditing && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="text-sky-600 hover:text-sky-700 hover:bg-sky-50">
                  <Edit className="w-4 h-4 mr-1" /> Edit
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                  {editError}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">Your Story & Lesson</label>
                <Textarea 
                  className="min-h-[200px] resize-y"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">Photo or Video URL (Optional)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LinkIcon className="h-4 w-4 text-slate-400" />
                    </div>
                    <Input 
                      type="url" 
                      placeholder="https://example.com/image.jpg" 
                      className="pl-10"
                      value={editMediaUrl}
                      onChange={(e) => setEditMediaUrl(e.target.value)}
                    />
                  </div>
                  <select 
                    className="h-10 rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={editMediaType || 'image'}
                    onChange={(e) => setEditMediaType(e.target.value as 'image' | 'video')}
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                {editMediaUrl && editMediaType === 'image' && (
                  <div className="mt-2 relative inline-block border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <img src={editMediaUrl} alt="Preview" className="max-h-[200px] max-w-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">Tags (Optional)</label>
                <Input 
                  placeholder="resilience, career, relationships (comma separated)" 
                  value={editTagsInput}
                  onChange={(e) => setEditTagsInput(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} disabled={isSavingEdit}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingEdit}>
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          ) : (
            <>
              <p className="text-slate-800 text-lg leading-relaxed whitespace-pre-wrap">{post.content}</p>
              
              {post.mediaUrl && (
                <div className="mt-6 rounded-xl overflow-hidden border border-sky-100 bg-sky-50">
                  {post.mediaType === 'video' ? (
                    <video src={post.mediaUrl} className="max-h-[600px] w-full object-contain" controls />
                  ) : (
                    <img src={post.mediaUrl} alt="Lesson media" className="max-h-[600px] w-full object-contain" />
                  )}
                </div>
              )}

              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {post.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-sm text-sky-700 border-sky-200 bg-sky-50">#{tag}</Badge>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
        <CardFooter className="border-t border-sky-50 bg-sky-50/30 py-4">
          <div className="flex items-center gap-6">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`gap-2 ${isLiked ? 'text-orange-500 hover:text-orange-600 hover:bg-orange-50' : 'text-slate-500'}`}
              onClick={handleLike}
              disabled={isBlocked || (user && !isProfileComplete)}
              title={user && !isProfileComplete ? "Complete your profile to like posts" : ""}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              <span>{post.likesCount || 0}</span>
            </Button>
            <div className="flex items-center gap-2 text-sky-600 px-3 py-2 text-sm font-medium">
              <MessageCircle className="w-5 h-5" />
              <span>{post.commentsCount || 0}</span>
            </div>
          </div>
        </CardFooter>
      </Card>

      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-sky-950">Reflections & Comments</h3>
        
        {user ? (
          isBlocked ? (
            <div className="bg-red-50 p-4 rounded-lg text-center text-red-600 text-sm border border-red-100">
              Your account is blocked. You cannot comment on lessons.
            </div>
          ) : !isProfileComplete ? (
            <div className="bg-orange-50 p-4 rounded-lg text-center text-orange-700 text-sm border border-orange-200 flex flex-col items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <p>You need to complete your profile before you can comment.</p>
              <Link to="/settings" className="text-orange-600 font-medium hover:underline">Go to Settings</Link>
            </div>
          ) : (
            <form onSubmit={handleComment} className="flex gap-4">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={profileData?.photoURL || user.photoURL || ''} referrerPolicy="no-referrer" />
                <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea 
                  placeholder="Share your thoughts on this lesson..." 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[100px]"
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={submittingComment || !newComment.trim()} className="bg-sky-600 hover:bg-sky-700 text-white">
                    {submittingComment ? 'Posting...' : 'Post Comment'}
                  </Button>
                </div>
              </div>
            </form>
          )
        ) : (
          <div className="bg-sky-50 p-4 rounded-lg text-center text-sky-700 text-sm border border-sky-100">
            Please sign in to join the conversation.
          </div>
        )}

        <div className="space-y-4 mt-8">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-4 p-4 bg-white rounded-xl border border-sky-100 shadow-sm">
              <Link to={`/profile/${comment.authorId}`}>
                <Avatar className="h-10 w-10 shrink-0 ring-2 ring-sky-50">
                  <AvatarImage src={comment.authorPhoto} referrerPolicy="no-referrer" />
                  <AvatarFallback className="bg-sky-100 text-sky-700">{comment.authorName?.charAt(0)}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1">
                <div className="flex items-baseline justify-between mb-1">
                  <Link to={`/profile/${comment.authorId}`} className="font-medium text-sm text-sky-950 hover:underline">
                    {comment.authorName}
                  </Link>
                  <span className="text-xs text-slate-500">
                    {comment.createdAt?.toDate ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                  </span>
                </div>
                <p className="text-slate-700 text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
