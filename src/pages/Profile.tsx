import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Heart, MessageCircle, MapPin, Phone, Globe, Calendar, User as UserIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { useAuth } from '../contexts/AuthContext';

export function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const { user, isProfileComplete } = useAuth();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'public_profiles', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfileUser({ id: docSnap.id, ...docSnap.data() });
        } else {
          // Fallback to legacy users collection
          const legacyRef = doc(db, 'users', userId);
          const legacySnap = await getDoc(legacyRef);
          if (legacySnap.exists()) {
            setProfileUser({ id: legacySnap.id, ...legacySnap.data() });
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `public_profiles/${userId}`);
      }
    };

    fetchProfile();

    const q = query(collection(db, 'posts'), where('authorId', '==', userId), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUserPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-pulse text-sky-600">Loading profile...</div></div>;
  }

  if (!profileUser) {
    return <div className="text-center py-12 text-slate-500">User not found.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex flex-col items-center text-center space-y-4 p-8 bg-white rounded-2xl border border-sky-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-sky-400 to-orange-400 opacity-20"></div>
        
        {/* Profile Photos Slideshow */}
        {profileUser.photos && profileUser.photos.length > 0 ? (
          <div className="relative z-10 w-full max-w-md mx-auto mb-4">
            <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-4 pb-4 px-4">
              {profileUser.photos.map((photo: string, idx: number) => (
                <div key={idx} className="snap-center shrink-0 w-48 h-48 sm:w-64 sm:h-64 rounded-2xl overflow-hidden border-4 border-white shadow-lg">
                  <img src={photo} alt={`${profileUser.displayName} ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="relative z-10">
            <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
              <AvatarImage src={profileUser.photoURL} referrerPolicy="no-referrer" />
              <AvatarFallback className="text-4xl bg-sky-100 text-sky-700">{profileUser.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            {profileUser.isOnline && (
              <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></div>
            )}
          </div>
        )}

        <div className="relative z-10 mt-2">
          <h1 className="text-3xl font-bold text-sky-950">
            {profileUser.realName ? profileUser.realName : profileUser.displayName}
          </h1>
          {profileUser.realName && (
            <p className="text-lg font-medium text-sky-600 mt-1">@{profileUser.displayName}</p>
          )}
          <p className="text-sm text-slate-500 mt-2">
            {profileUser.isOnline ? (
              <span className="text-green-600 font-medium flex items-center justify-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Online Now
              </span>
            ) : profileUser.lastSeen ? (
              `Last seen ${formatDistanceToNow(profileUser.lastSeen.toDate(), { addSuffix: true })}`
            ) : (
              `Joined ${profileUser.createdAt?.toDate ? formatDistanceToNow(profileUser.createdAt.toDate(), { addSuffix: true }) : 'recently'}`
            )}
          </p>
        </div>
        
        {profileUser.bio && (
          <p className="text-slate-700 max-w-lg relative z-10 text-lg leading-relaxed">{profileUser.bio}</p>
        )}
        
        <div className="flex flex-wrap justify-center gap-3 pt-4 relative z-10">
          {profileUser.city && (
            <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
              <MapPin className="w-4 h-4 text-sky-500" />
              <span>{profileUser.city}</span>
            </div>
          )}
          {profileUser.country && (
            <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
              <Globe className="w-4 h-4 text-sky-500" />
              <span>{profileUser.country}</span>
            </div>
          )}
          {profileUser.phoneNumber && (
            <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
              <Phone className="w-4 h-4 text-sky-500" />
              <span>{profileUser.phoneNumber}</span>
            </div>
          )}
          {profileUser.sex && (
            <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
              <UserIcon className="w-4 h-4 text-sky-500" />
              <span>{profileUser.sex}</span>
            </div>
          )}
          {profileUser.age && (
            <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
              <Calendar className="w-4 h-4 text-sky-500" />
              <span>{profileUser.age} years old</span>
            </div>
          )}
        </div>

        <div className="flex gap-4 text-sm text-sky-800 font-medium pt-4 relative z-10 items-center">
          <div className="bg-sky-50 px-4 py-2 rounded-lg border border-sky-100"><span className="text-sky-900 font-bold">{userPosts.length}</span> Lessons Shared</div>
          {user && user.uid !== userId && (
            <Button 
              onClick={() => navigate(`/chat/${userId}`)} 
              className="bg-sky-500 hover:bg-sky-600 text-white"
              disabled={!isProfileComplete}
              title={!isProfileComplete ? "Complete your profile to send messages" : ""}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Message
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-sky-950 border-b border-sky-100 pb-2">Lessons by {profileUser.displayName}</h2>
        
        {userPosts.length === 0 ? (
          <div className="text-center py-12 text-sky-700 bg-white rounded-xl border border-sky-100 shadow-sm">
            This user hasn't shared any lessons yet.
          </div>
        ) : (
          userPosts.map(post => (
            <Card key={post.id} className="overflow-hidden transition-all hover:shadow-md border-sky-100">
              <CardContent className="pt-6">
                <Link to={`/post/${post.id}`} className="block group">
                  <p className="text-slate-700 whitespace-pre-wrap line-clamp-4 mb-4 group-hover:text-slate-900 transition-colors">{post.content}</p>
                  
                  {post.mediaUrl && (
                    <div className="mt-3 rounded-lg overflow-hidden border border-sky-100 bg-sky-50/50">
                      {post.mediaType === 'video' ? (
                        <video src={post.mediaUrl} className="max-h-[300px] w-full object-cover" controls />
                      ) : (
                        <img src={post.mediaUrl} alt="Lesson media" className="max-h-[300px] w-full object-cover" loading="lazy" />
                      )}
                    </div>
                  )}
                </Link>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {post.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs text-sky-700 border-sky-200 bg-sky-50">#{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-sky-50 bg-sky-50/30 py-3 flex justify-between">
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
                <span className="text-xs text-slate-400">
                  {post.createdAt?.toDate ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                </span>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
