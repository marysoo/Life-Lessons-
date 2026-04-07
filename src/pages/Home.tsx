import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Heart, MessageCircle, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { AdDisplay } from '../components/AdDisplay';

export function Home() {
  const { profileData } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const filteredPosts = selectedTag 
    ? posts.filter(post => post.tags && post.tags.includes(selectedTag))
    : posts;

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-pulse text-sky-600">Loading lessons...</div></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
      <div className="md:col-span-2 space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-sky-950">Recent Life Lessons</h1>
          <p className="text-sky-700 mt-2">Read genuine experiences and wisdom shared by the community.</p>
          
          {selectedTag && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-sky-700">Filtered by:</span>
              <Badge variant="secondary" className="flex items-center gap-1 pl-2 pr-1 py-1 bg-orange-100 text-orange-800 hover:bg-orange-200">
                #{selectedTag}
                <button onClick={() => setSelectedTag(null)} className="hover:bg-orange-200 rounded-full p-0.5 ml-1">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            </div>
          )}
        </div>

        {filteredPosts.length === 0 ? (
          <div className="text-center py-12 text-sky-700 bg-white rounded-xl border border-sky-100 shadow-sm">
            {selectedTag ? `No lessons found with tag #${selectedTag}.` : 'No lessons shared yet. Be the first to share your experience!'}
          </div>
        ) : (
          filteredPosts.map((post, index) => (
            <div key={post.id}>
              <Card className="overflow-hidden transition-all hover:shadow-md border-sky-100 mb-6">
                <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <Link to={`/profile/${post.authorId}`} className="flex items-center gap-3 group">
                    <Avatar className="ring-2 ring-sky-50">
                      <AvatarImage src={post.authorPhoto} referrerPolicy="no-referrer" />
                      <AvatarFallback className="bg-sky-100 text-sky-700">{post.authorName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-slate-900 group-hover:text-sky-600 transition-colors">{post.authorName}</p>
                      <p className="text-xs text-slate-500">
                        {post.createdAt?.toDate ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                      </p>
                    </div>
                  </Link>
                  {post.isAIModerated && (
                    <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                      Verified Genuine
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Link to={`/post/${post.id}`} className="block group">
                  <p className="text-slate-700 whitespace-pre-wrap line-clamp-4 mb-4 group-hover:text-slate-900 transition-colors">{post.content}</p>
                  
                  {post.mediaUrl && (
                    <div className="mt-3 rounded-lg overflow-hidden border border-sky-100 bg-sky-50/50">
                      {post.mediaType === 'video' ? (
                        <video src={post.mediaUrl} className="max-h-[400px] w-full object-cover" controls />
                      ) : (
                        <img src={post.mediaUrl} alt="Lesson media" className="max-h-[400px] w-full object-cover" loading="lazy" />
                      )}
                    </div>
                  )}
                </Link>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {post.tags.map((tag: string) => (
                      <button key={tag} onClick={() => setSelectedTag(tag)}>
                        <Badge variant="outline" className="text-xs text-sky-700 border-sky-200 bg-sky-50 hover:bg-sky-100 cursor-pointer">#{tag}</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-sky-50 bg-sky-50/30 py-3">
                <div className="flex items-center gap-6 text-slate-500 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-orange-500" />
                    <span>{post.likesCount || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-sky-500" />
                    <span>{post.commentsCount || 0}</span>
                  </div>
                </div>
              </CardFooter>
            </Card>
            
            {/* Insert Ad every 3 posts */}
            {(index + 1) % 3 === 0 && (
              <div className="mb-6">
                <AdDisplay />
              </div>
            )}
            </div>
          ))
        )}
      </div>

      <div className="hidden md:block space-y-6">
        <div className="sticky top-24">
          <Card className="border-sky-100 bg-gradient-to-br from-sky-50 to-white shadow-sm mb-6">
            <CardContent className="p-6">
              <h3 className="font-bold text-sky-950 mb-2">About LifeLessons</h3>
              <p className="text-sm text-slate-600 mb-4">A community dedicated to sharing genuine experiences and wisdom to help others grow.</p>
              <Link to="/ads" className="text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline">
                Advertise with us &rarr;
              </Link>
            </CardContent>
          </Card>

          {/* Sidebar Ad */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sponsored</h3>
            <AdDisplay />
          </div>
        </div>
      </div>
    </div>
  );
}
