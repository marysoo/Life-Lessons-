import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
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
  const [loading, setLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    let unsubscribeDoc: () => void;
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const privateUserRef = doc(db, 'users_private', currentUser.uid);
        const publicProfileRef = doc(db, 'public_profiles', currentUser.uid);
        
        unsubscribeDoc = onSnapshot(privateUserRef, async (docSnap) => {
          if (docSnap.exists()) {
            setProfileRole(docSnap.data().role || 'user');
            setIsBlocked(docSnap.data().isBlocked || false);
            setTokens(docSnap.data().tokens || 0);
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
              createdAt: timestamp,
            });
            
            setProfileRole('user');
            setIsBlocked(false);
            setTokens(100);
          }
          setLoading(false);
        });
      } else {
        setProfileRole('user');
        setIsBlocked(false);
        setTokens(0);
        setLoading(false);
        if (unsubscribeDoc) unsubscribeDoc();
      }
    });
    
    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
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
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profileRole, isBlocked, tokens, loading, signInWithGoogle, sendPhoneOtp, verifyPhoneOtp, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
