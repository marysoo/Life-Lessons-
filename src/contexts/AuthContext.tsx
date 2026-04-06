import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

interface AuthContextType {
  user: User | null;
  profileRole: string;
  isBlocked: boolean;
  tokens: number;
  isProfileComplete: boolean;
  isOnline: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  sendPhoneOtp: (phoneNumber: string, containerId: string) => Promise<void>;
  verifyPhoneOtp: (otp: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profileRole, setProfileRole] = useState('user');
  const [isBlocked, setIsBlocked] = useState(false);
  const [tokens, setTokens] = useState(0);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    let unsubscribeDoc: () => void;
    let onlineInterval: NodeJS.Timeout;
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const privateUserRef = doc(db, 'users_private', currentUser.uid);
        const publicProfileRef = doc(db, 'public_profiles', currentUser.uid);
        
        unsubscribeDoc = onSnapshot(privateUserRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfileRole(data.role || 'user');
            setIsBlocked(data.isBlocked || false);
            setTokens(data.tokens || 0);
            setIsProfileComplete(data.isProfileComplete || false);
            setIsOnline(data.isOnline || false);
          } else {
            // Create user documents if they don't exist
            const timestamp = serverTimestamp();
            const displayName = currentUser.displayName || currentUser.phoneNumber || 'Anonymous User';
            
            await setDoc(privateUserRef, {
              uid: currentUser.uid,
              email: currentUser.email || '',
              phoneNumber: currentUser.phoneNumber || '',
              displayName: displayName,
              photoURL: currentUser.photoURL || '',
              bio: '',
              role: 'user',
              isBlocked: false,
              tokens: 100, // Initial tokens for new users
              isProfileComplete: false,
              isOnline: true,
              lastSeen: timestamp,
              createdAt: timestamp,
            });

            await setDoc(publicProfileRef, {
              uid: currentUser.uid,
              displayName: displayName,
              photoURL: currentUser.photoURL || '',
              bio: '',
              role: 'user',
              isBlocked: false,
              tokens: 100,
              isProfileComplete: false,
              isOnline: true,
              lastSeen: timestamp,
              createdAt: timestamp,
            });
            
            setProfileRole('user');
            setIsBlocked(false);
            setTokens(100);
            setIsProfileComplete(false);
            setIsOnline(true);
          }
          setLoading(false);
        });

        // Update online status periodically
        const updateOnlineStatus = async () => {
          try {
            const timestamp = serverTimestamp();
            await updateDoc(privateUserRef, { isOnline: true, lastSeen: timestamp });
            await updateDoc(publicProfileRef, { isOnline: true, lastSeen: timestamp });
          } catch (error) {
            console.error("Failed to update online status", error);
          }
        };

        updateOnlineStatus();
        onlineInterval = setInterval(updateOnlineStatus, 60000); // Update every minute

        const handleUnload = () => {
          // Attempt to set offline on unload (best effort)
          updateDoc(privateUserRef, { isOnline: false, lastSeen: serverTimestamp() }).catch(() => {});
          updateDoc(publicProfileRef, { isOnline: false, lastSeen: serverTimestamp() }).catch(() => {});
        };
        window.addEventListener('beforeunload', handleUnload);

      } else {
        setProfileRole('user');
        setIsBlocked(false);
        setTokens(0);
        setIsProfileComplete(false);
        setIsOnline(false);
        setLoading(false);
        if (unsubscribeDoc) unsubscribeDoc();
        if (onlineInterval) clearInterval(onlineInterval);
      }
    });
    
    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
      if (onlineInterval) clearInterval(onlineInterval);
    };
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google', error);
      throw error;
    }
  };

  const sendPhoneOtp = async (phoneNumber: string, containerId: string) => {
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
          size: 'invisible',
        });
      }
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
    } catch (error) {
      console.error('Error sending OTP', error);
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
      throw error;
    }
  };

  const verifyPhoneOtp = async (otp: string) => {
    if (!confirmationResult) throw new Error("No OTP confirmation result found.");
    try {
      await confirmationResult.confirm(otp);
    } catch (error) {
      console.error('Error verifying OTP', error);
      throw error;
    }
  };

  const logOut = async () => {
    try {
      if (user) {
        const privateUserRef = doc(db, 'users_private', user.uid);
        const publicProfileRef = doc(db, 'public_profiles', user.uid);
        await updateDoc(privateUserRef, { isOnline: false, lastSeen: serverTimestamp() });
        await updateDoc(publicProfileRef, { isOnline: false, lastSeen: serverTimestamp() });
      }
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profileRole, isBlocked, tokens, isProfileComplete, isOnline, loading, signInWithGoogle, sendPhoneOtp, verifyPhoneOtp, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
