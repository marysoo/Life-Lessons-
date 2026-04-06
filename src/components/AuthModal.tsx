import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X, Phone } from 'lucide-react';

export function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { signInWithGoogle, sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const [step, setStep] = useState<'select' | 'phone' | 'otp'>('select');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('select');
    setPhoneNumber('');
    setOtp('');
    setError('');
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      await signInWithGoogle();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      // Basic validation for E.164 format
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      await sendPhoneOtp(formattedPhone, 'recaptcha-container');
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code. Please check the number and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await verifyPhoneOtp(otp);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Invalid verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl relative">
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign In / Sign Up</h2>
        <p className="text-sm text-slate-500 mb-6">Join the Life Lessons community to share your experiences.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
            {error}
          </div>
        )}

        {step === 'select' && (
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full py-6 flex items-center gap-3 text-base"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">or</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <Button 
              variant="outline" 
              className="w-full py-6 flex items-center gap-3 text-base"
              onClick={() => setStep('phone')}
              disabled={isLoading}
            >
              <Phone className="w-5 h-5 text-slate-700" />
              Continue with Phone Number
            </Button>
          </div>
        )}

        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">Phone Number</label>
              <Input 
                type="tel" 
                placeholder="+1 234 567 8900" 
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
              <p className="text-xs text-slate-500">Include your country code (e.g., +1 for US).</p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !phoneNumber}>
              {isLoading ? 'Sending...' : 'Send Verification Code'}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setStep('select')} disabled={isLoading}>
              Back
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">Verification Code</label>
              <Input 
                type="text" 
                placeholder="123456" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
              <p className="text-xs text-slate-500">Enter the 6-digit code sent to your phone.</p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !otp}>
              {isLoading ? 'Verifying...' : 'Verify & Sign In'}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setStep('phone')} disabled={isLoading}>
              Back
            </Button>
          </form>
        )}

        {/* Invisible Recaptcha Container */}
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}
