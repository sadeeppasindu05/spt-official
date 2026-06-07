import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Mail, User, ShieldCheck, ArrowRight, Eye, EyeOff, Sparkles, AlertCircle, CheckCircle2, ChevronLeft, Key } from 'lucide-react';
import { supabase } from '../supabaseClient'; 

export type GateView = 'login' | 'signup' | 'otp' | 'forgot' | 'forgot_otp' | 'reset_password';

interface SptUniverseGateProps {
  onClose?: () => void;
  onSuccess?: (userData: { email: string; name?: string; password?: string }, isSignUp?: boolean) => void;
  language?: 'si' | 'en';
}

export default function SptUniverseGate({ onClose, onSuccess, language = 'en' }: SptUniverseGateProps) {
  const [view, setView] = useState<GateView>('login');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMesssage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Password Visibility toggles
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showRePassword, setShowRePassword] = useState<boolean>(false);

  // Form States
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [rePassword, setRePassword] = useState<string>('');
  const [otpPin, setOtpPin] = useState<string[]>(Array(6).fill(''));
  const [pendingUserId, setPendingUserId] = useState<string>('');

  // Reset Password states
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState<boolean>(false);

  // Language translation helper helper
  const gt = (siText: string, enText: string) => (language === 'si' ? siText : enText);

  // Clear states when switching screens
  const handleViewChange = (newView: GateView) => {
    setView(newView);
    setErrorMessage('');
    setSuccessMessage('');
    if (newView === 'otp' || newView === 'forgot_otp') {
      setOtpPin(Array(6).fill(''));
    }
  };

  // 1. Google Auth Logic (Real Supabase Connection)
  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMessage('');

    // Check if running inside an iframe (such as the AI Studio preview pane)
    const isInIframe = (() => {
      try {
        return window.self !== window.top;
      } catch (e) {
        return true;
      }
    })();

    if (isInIframe) {
      setErrorMessage(
        gt(
          '⚠️ Google ආරක්‍ෂක උපදෙස් හේතුවෙන් preview කවුළුව තුළ Google Login ක්‍රියා නොකරයි. Google හරහා සම්බන්ධ වීමට කරුණාකර ඉහළ ඇති "Open in New Tab" (Expand) අයිකනය ක්ලික් කර අළුත් ටැබ් එකක විවෘත කරන්න.',
          '⚠️ Google Sign-In is blocked inside the preview iframe by Google Security. Please click the "Open in New Tab" (Expand) icon at the top of the preview to log in with Google!'
        )
      );
      setIsLoading(false);
      return;
    }

    try {
      const redirectUrl = window.location.origin + '/auth/callback';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMessage(err.message || gt('Google හරහා සම්බන්ධ වීමේදී දෝෂයක් මතු විය.', 'An error occurred while connecting with Google.'));
      setIsLoading(false);
    }
  };

  // 2. Login Submit Handler (Real Supabase Connection)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email || !password) {
      setErrorMessage(gt('කරුණාකර ඔබගේ ඊමේල් ලිපිනය සහ මුරපදය ඇතුළත් කරන්න.', 'Please enter your email address and password.'));
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      setSuccessMessage(gt(
        '✅ SPT OFFICIAL වෙත පිළිගනිමු! ප්‍රවේශය සාර්ථකයි.',
        '✅ Welcome to SPT OFFICIAL! Access verified successfully.'
      ));
      if (onSuccess) {
        onSuccess({ email: data.user.email || email, name: data.user.user_metadata?.full_name || email.split('@')[0], password });
      }
    } catch (err: any) {
      setErrorMessage(
        err.message 
          ? (language === 'si' ? 'ඊමේල් හෝ මුරපදය වැරදියි: ' + err.message : 'Invalid login: ' + err.message)
          : gt('ඔබගේ ඊමේල් ලිපිනය හෝ මුරපදය වැරදියි.', 'Invalid email address or password.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Signup Submit Handler (Receive Email PIN via Supabase)
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!fullName || !email || !password || !rePassword) {
      setErrorMessage(gt('සියලුම ක්ෂේත්‍ර පුරවා ගැනීම අනිවාර්ය වේ.', 'All fields are required.'));
      return;
    }
    if (password.length < 6) {
      setErrorMessage(gt('මුරපදය සඳහා අවම වශයෙන් අක්ෂර 6ක්වත් අවශ්‍ය වේ.', 'Password must be at least 6 characters long.'));
      return;
    }
    if (password !== rePassword) {
      setErrorMessage(gt('මුරපදයන් එකිනෙකට නොගැලපේ.', 'Passwords do not match.'));
      return;
    }

    setIsLoading(true);
    let userId = '';
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) throw error;
      userId = data.user?.id || '';
      setPendingUserId(userId);

      // Send OTP via our server (Gmail SMTP)
      const otpRes = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userId }),
      });
      const otpData = await otpRes.json();
      if (!otpRes.ok) throw new Error(otpData.error || 'Failed to send OTP email');

      setSuccessMessage(gt(
        '✅ SPT OFFICIAL: ඔබගේ ඊමේල් ලිපිනයට 6-ඉලක්කම් OTP කේතයක් එවා ඇත. කරුණාකර ඔබගේ ඊමේල් ලිපිනය පරීක්ෂා කරන්න (SPAM බලන්න).',
        '✅ SPT OFFICIAL: A 6-digit verification code has been sent to your email. Please check your inbox (and SPAM).'
      ));
      setView('otp');
    } catch (err: any) {
      setErrorMessage(err.message || gt('ලියාපදිංචි වීමේදී දෝෂයක් මතු විය.', 'Error signing up. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  // 4. OTP PIN submission handler (Real Supabase Verification)
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const finalPin = otpPin.join('');
    if (finalPin.length < 6 || !/^\d+$/.test(finalPin)) {
      setErrorMessage(gt('කරුණාකර අංක 6 කින් යුත් වලංගු ආරක්ෂක PIN කේතය ඇතුළත් කරන්න.', 'Please enter a valid 6-digit verification code.'));
      return;
    }

    setIsLoading(true);
    try {
      // Verify OTP via our server (confirms user via Supabase Admin API)
      const verifyRes = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: finalPin }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Invalid OTP');

      setSuccessMessage(gt(
        '🎉 සුබ පැතුම්! ඔබගේ SPT OFFICIAL සාමාජික ගිණුම සාර්ථකව සක්‍රිය කරන ලදී! දැන් ඔබට සියලුම SPT පහසුකම් සඳහා ප්‍රවේශ විය හැක.',
        '🎉 Congratulations! Your SPT OFFICIAL membership account has been successfully verified & activated! You now have access to all SPT features.'
      ));
      if (onSuccess) {
        onSuccess({ email, name: fullName || 'SPT Creator Member', password }, true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || gt('OTP කේතය වැරදියි හෝ කල් ඉකුත් වී ඇත.', 'Invalid OTP or expired session.'));
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Resend OTP Email Handler
  const handleResendOtp = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);
    try {
      if (!pendingUserId) throw new Error('User ID not found. Please sign up again.');
      const otpRes = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userId: pendingUserId }),
      });
      const otpData = await otpRes.json();
      if (!otpRes.ok) throw new Error(otpData.error || 'Failed to resend OTP');
      setSuccessMessage(gt('✅ OTP කේතය නැවත එවා ඇත. කරුණාකර ඔබගේ ඊමේල් ලිපිනය පරීක්ෂා කරන්න (SPAM බලන්න).', '✅ OTP code resent. Please check your inbox (and SPAM folder).'));
    } catch (err: any) {
      setErrorMessage(err.message || gt('OTP කේතය නැවත එවීමට අපොහොසත් විය.', 'Failed to resend OTP code.'));
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Forgot Password Handler (Real Supabase Logic)
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email) {
      setErrorMessage(gt('කරුණාකර ඔබගේ ඊමේල් ලිපිනය ඇතුළත් කරන්න.', 'Please enter your email address.'));
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSuccessMessage(
        gt(
          '🔐 SPT OFFICIAL: මුරපදය යළි සැකසීමට අවශ්‍ය OTP කේතය සහ සබැඳිය ඔබගේ ඊමේල් ලිපිනයට ලැබී ඇත. කරුණාකර ඔබගේ Inbox පරීක්ෂා කරන්න. (SPAM බලන්න)',
          '🔐 SPT OFFICIAL: A password reset OTP code and recovery link have been sent to your email. Please check your inbox (and SPAM folder).'
        )
      );
      setTimeout(() => {
        handleViewChange('forgot_otp');
      }, 3000);
    } catch (err: any) {
      setErrorMessage(err.message || gt('ඊමේල් එක يැවීමේදී දෝෂයක් මතු විය.', 'Error sending recovery transmission.'));
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Forgot OTP PIN Verification Handler
  const handleForgotOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const finalPin = otpPin.join('');
    if (finalPin.length < 6 || !/^\d+$/.test(finalPin)) {
      setErrorMessage(gt('කරුණාකර ඔබගේ ඊමේල් ලිපිනයට ලැබුණු අංක 6 ආරක්ෂිත PIN කේතය නිවැරදිව ඇතුළත් කරන්න.', 'Please enter the 6-digit recovery OTP code received in your email inbox.'));
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: finalPin,
        type: 'recovery',
      });
      if (error) throw error;

      setSuccessMessage(gt(
        '🔐 SPT OFFICIAL: ආරක්ෂිත කේතය සාර්ථකව තහවුරු විය! දැන් ඔබට නව මුරපදය ඇතුළත් කළ හැක.',
        '🔐 SPT OFFICIAL: Security code verified! You can now set a new password.'
      ));
      setTimeout(() => {
        handleViewChange('reset_password');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || gt('OTP කේතය වැරදියි හෝ කල් ඉකුත් වී ඇත.', 'Invalid OTP validation code. Check status logs.'));
    } finally {
      setIsLoading(false);
    }
  };

  // 7. Update Password Submission Handler
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!newPassword || !confirmNewPassword) {
      setErrorMessage(gt('කරුණාකර ඔබගේ නව මුරපදය දෙවරක්ම ඇතුළු කරන්න.', 'Please enter your new password twice.'));
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage(gt('මුරපදය සඳහා අවම වශයෙන් අක්ෂර 6ක්වත් අවශ්‍ය වේ.', 'Security matrix constraint: Password must be at least 6 characters.'));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage(gt('ඇතුළත් කළ මුරපදයන් එකිනෙකට නොගැලපේ.', 'Encryption mismatch: password entries must perfectly align.'));
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      setSuccessMessage(gt(
        '✅ සුභ පැතුම්! ඔබගේ SPT OFFICIAL ගිණුමේ මුරපදය සාර්ථකව යාවත්කාලීන කරන ලදී!',
        '✅ Congratulations! Your SPT OFFICIAL account password has been successfully updated!'
      ));
      
      setTimeout(() => {
        if (onSuccess) {
          onSuccess({
            email: data.user?.email || email,
            name: data.user?.user_metadata?.full_name || email.split('@')[0]
          });
        }
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || gt('මුරපදය රීසෙට් කිරීමේදී දෝෂයක් සිදු විය.', 'Unable to rewrite credential layers in local directory.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Custom function to handle OTP input movement
  const handlePinChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return;

    const newOtp = [...otpPin];
    newOtp[index] = element.value;
    setOtpPin(newOtp);

    // Focus next input automatically
    if (element.value !== '' && element.nextSibling) {
      (element.nextSibling as HTMLInputElement).focus();
    }
  };

  const handlePinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otpPin[index] && e.currentTarget.previousSibling) {
      (e.currentTarget.previousSibling as HTMLInputElement).focus();
    }
  };

  return (
    <div 
      id="spt-universe-gate-container" 
      className="flex items-center justify-center min-h-[580px] w-full p-1.5 relative overflow-hidden bg-transparent rounded-3xl"
    >
      {/* Background ambient light paths with higher transparency and vibrant blurred circles */}
      <div className="absolute top-1/4 left-1/4 w-[180px] h-[180px] rounded-full bg-cyan-400/10 blur-[60px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[220px] h-[220px] rounded-full bg-amber-400/5 blur-[80px] pointer-events-none animate-pulse"></div>

      <motion.div
        id="spt-gate-glass-modal"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full backdrop-blur-2xl bg-[#030712]/45 border border-white/10 rounded-2xl px-6 py-7 shadow-[0_8px_32px_0_rgba(0,0,0,0.65)] relative z-10 text-white min-h-[500px] flex flex-col justify-between"
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-400/10 border border-white/10 text-cyan-400 backdrop-blur-md">
                <Sparkles className="w-4.5 h-4.5 animate-spin-slow" />
              </div>
              <div>
                <h4 className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest leading-none font-bold">
                  {gt('SPT විශ්වීය ද්වාරය', 'SPT UNIVERSE GATE')}
                </h4>
                <p className="text-[8px] font-mono text-slate-400 tracking-wider mt-1 uppercase">
                  {gt('ආරක්ෂිත නිර්මාණකරු පද්ධතිය', 'SECURE CREATOR MATRIX')}
                </p>
              </div>
            </div>
          </div>

          {/* Feedback Messages */}
          <AnimatePresence mode="wait">
            {errorMesssage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-xl flex items-start gap-2 text-[11px] backdrop-blur-md"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                <span>{errorMesssage}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-3 rounded-xl flex items-start gap-2 text-[11px] backdrop-blur-md"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Views */}
          <AnimatePresence mode="wait">
            
            {/* 1. LOGIN VIEW */}
            {view === 'login' && (
              <motion.div
                key="login-view"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-6">
                  <h2 className="text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
                    {gt('නිර්මාණකරුවන්ගේ ද්වාරය විවෘත කරන්න', 'Unlock Creator Platform')}{' '}
                    <Lock className="w-4.5 h-4.5 text-cyan-400 animate-pulse" />
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {gt('ඔබගේ නිර්මාණශීලී විශ්වයේ අසීමිත පහසුකම් සඳහා ප්‍රවේශ වන්න.', 'Access the unlimited features of your creative universe.')}
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5 tracking-wider">
                      {gt('ඊමේල් ලිපිනය', 'EMAIL ADDRESS')}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="sadeep@sptcreative.com"
                        className="w-full pl-10 pr-4 py-2.5 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono backdrop-blur-md"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                        {gt('මුරපදය', 'PASSWORD')}
                      </label>
                      <button 
                        type="button" 
                        onClick={() => handleViewChange('forgot')} 
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
                      >
                        {gt('මුරපදය අමතකද?', 'Forgot Password?')}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="******"
                        className="w-full pl-10 pr-10 py-2.5 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono backdrop-blur-md"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-2.5 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-neutral-950 font-bold text-xs font-mono uppercase tracking-widest rounded-xl transition-all duration-300 shadow-[0_4px_20px_rgba(6,182,212,0.25)] flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        {gt('ප්‍රවේශ වීම තහවුරු කරන්න', 'VERIFY ACCESS & CONTINUE')} <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="my-5 flex items-center justify-center gap-3">
                  <div className="flex-grow border-t border-white/5"></div>
                  <span className="text-[9px] font-mono text-slate-400 tracking-widest">
                    {gt('නැතහොත් OAUTH තෝරන්න', 'OR CHOOSE OAUTH')}
                  </span>
                  <div className="flex-grow border-t border-white/5"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                  className="w-full py-2.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-xl text-xs font-mono flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer text-slate-200"
                >
                  {gt('Google ගිණුමෙන් ඇතුල් වන්න', 'Continue with Google')}
                </button>

                {(() => {
                  try {
                    if (window.self !== window.top) {
                      return (
                        <p className="mt-3 text-[10px] text-amber-300 leading-relaxed font-sans text-center bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/10 backdrop-blur-md">
                          {gt(
                            '⚠️ Google ආරක්‍ෂක උපදෙස් හේතුවෙන් preview කවුළුව තුළ Google Login ක්‍රියා නොකරයි. කරුණාකර ඉහළ ඇති "Open in New Tab" අයිකනය ක්ලික් කර වෙනම පටිත්තක ඇප් එක විවෘත කරන්න.',
                            '⚠️ Google Sign-In is blocked inside the preview iframe. Please click the "Open in New Tab" icon at the top of the interface to launch it natively.'
                          )}
                        </p>
                      );
                    }
                  } catch (e) {}
                  return null;
                })()}
              </motion.div>
            )}

            {/* 2. SIGN UP VIEW */}
            {view === 'signup' && (
              <motion.div
                key="signup-view"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-5">
                  <h2 className="text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
                    {gt('ලියාපදිංචි වී සම්බන්ධ වන්න', 'Sign Up & Connect')}{' '}
                    <Sparkles className="w-4.5 h-4.5 text-cyan-400" />
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    {gt('නව නිර්මාණකරුවෙකු ලෙස SPT පද්ධතිය සමඟ එක්වන්න.', 'Join the official SPT network matrices as a new creator.')}
                  </p>
                </div>

                <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 tracking-wider">
                      {gt('සම්පූර්ණ නම', 'FULL NAME')}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Sadeep Pasindu"
                        className="w-full pl-10 pr-4 py-2.5 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono backdrop-blur-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 tracking-wider">
                      {gt('ඊමේල් ලිපිනය', 'EMAIL ADDRESS')}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="sadeep@sptcreative.com"
                        className="w-full pl-10 pr-4 py-2.5 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono backdrop-blur-md"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 tracking-wider">
                        {gt('මුරපදය', 'PASSWORD')}
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="******"
                        className="w-full px-3.5 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 tracking-wider">
                        {gt('නැවත ඇතුළත් කරන්න', 'RE-ENTER')}
                      </label>
                      <input
                        type={showRePassword ? 'text' : 'password'}
                        required
                        value={rePassword}
                        onChange={e => setRePassword(e.target.value)}
                        placeholder="******"
                        className="w-full px-3.5 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-neutral-950 font-bold text-xs font-mono uppercase tracking-widest rounded-xl transition-all duration-300 shadow-[0_4px_20px_rgba(6,182,212,0.25)] flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        {gt('OTP කේතය ලබාගන්න', 'RECEIVE EMAIL PIN CODE')} <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="my-4 flex items-center justify-center gap-3">
                  <div className="flex-grow border-t border-white/5"></div>
                  <span className="text-[9px] font-mono text-slate-400 tracking-widest">
                    {gt('නැතහොත් OAUTH ද්වාරය', 'OR REGISTER WITH')}
                  </span>
                  <div className="flex-grow border-t border-white/5"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                  className="w-full py-2.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-xl text-xs font-mono flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer text-slate-200"
                >
                  {gt('Google ගිණුම සම්බන්ධ කරන්න', 'Connect Google Account')}
                </button>

                {(() => {
                  try {
                    if (window.self !== window.top) {
                      return (
                        <p className="mt-3 text-[10px] text-amber-300 leading-relaxed font-sans text-center bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/10 backdrop-blur-md">
                          {gt(
                            '⚠️ Google ආරක්‍ෂක උපදෙස් හේතුවෙන් preview කවුළුව තුළ Google Sign-In ක්‍රියා නොකරයි. කරුණාකර වෙනම standalone පටිත්තක ඇප් එක විවෘත කරන්න.',
                            '⚠️ Google authentication is blocked in this iframe block. Open the viewport outside to execute OAuth.'
                          )}
                        </p>
                      );
                    }
                  } catch (e) {}
                  return null;
                })()}
              </motion.div>
            )}

            {/* 3. OTP VERIFICATION VIEW */}
            {view === 'otp' && (
              <motion.div
                key="otp-view"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-6">
                  <h2 className="text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
                    {gt('ආරක්ෂිත PIN එක ඇතුළත් කරන්න', 'Enter Security PIN')}{' '}
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {gt('ඔබගේ ඊමේල් ලිපිනයට ලැබුණු අංක 6 ආරක්ෂිත සංකේතය ඇතුළත් කරන්න.', 'Enter the 6-digit security code sent to your email.')}
                  </p>
                </div>

                <form onSubmit={handleOtpSubmit} className="space-y-5">
                  <div className="grid grid-cols-6 gap-2 max-w-[260px] mx-auto">
                    {otpPin.map((data, index) => (
                      <input
                        key={index}
                        type="text"
                        maxLength={1}
                        value={data}
                        onChange={e => handlePinChange(e.target, index)}
                        onKeyDown={e => handlePinKeyDown(e, index)}
                        className="w-full h-12 text-center text-lg font-bold font-mono bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-500/25 transition-all backdrop-blur-md"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-neutral-950 font-bold text-xs font-mono uppercase tracking-widest rounded-xl transition-all duration-300 shadow-[0_4px_20px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        {gt('කේතය තහවුරු කරන්න', 'VERIFY PIN & ACTIVATE ACCOUNT')} <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-4 text-center space-y-2">
                  <button
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="text-[11px] font-mono text-amber-400 hover:text-amber-300 underline underline-offset-2 mx-auto cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? gt('යවමින්...', 'Sending...') : gt('OTP කේතය නැවත එවන්න', 'Resend OTP Code')}
                  </button>
                  <div>
                    <button
                      onClick={() => handleViewChange('signup')}
                      className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> {gt('නැවත ලියාපදිංචි වීමට', 'Back to Sign Up')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. FORGOT PASSWORD VIEW */}
            {view === 'forgot' && (
              <motion.div
                key="forgot-view"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-6">
                  <h2 className="text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
                    {gt('මුරපදය යළි සකසන්න', 'Reset Matrix')}{' '}
                    <Key className="w-5 h-5 text-cyan-400" />
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {gt('ඔබගේ මුරපදය අමතක වූවාද? ගිණුමට සම්බන්ධිත ඊමේල් ලිපිනය ඇතුළත් කරන්න.', 'Lost authorization credentials? Supply your registered mail index below.')}
                  </p>
                </div>

                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5 tracking-wider">
                      {gt('ඊමේල් ලිපිනය', 'EMAIL ADDRESS')}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="sadeep@sptcreative.com"
                        className="w-full pl-10 pr-4 py-2.5 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono backdrop-blur-md"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-neutral-950 font-bold text-xs font-mono uppercase tracking-widest rounded-xl transition-all duration-300 shadow-[0_4px_20px_rgba(6,182,212,0.25)] flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        {gt('නැවත සකසන කේතය ලබාගන්න', 'SEND RESET CODE & LINK')} <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => handleViewChange('login')}
                    className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> {gt('නැවත ප්‍රවේශ වීමේ ද්වාරයට', 'Back to Login Matrix')}
                  </button>
                </div>
              </motion.div>
            )}

            {/* 5. FORGOT PASSWORD OTP VIEW */}
            {view === 'forgot_otp' && (
              <motion.div
                key="forgot-otp-view"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-6">
                  <h2 className="text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
                    {gt('ප්‍රතිසාධන කේතය ඇතුළත් කරන්න', 'Enter Recovery Code')}{' '}
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {gt('ඔබගේ ඊමේල් ලිපිනයට ලැබුණු අංක 6 ආරක්ෂිත Reset සංකේතය (OTP) ඇතුළත් කරන්න.', 'Enter the 6-digit password reset code (OTP) sent to your email.')}
                  </p>
                </div>

                <form onSubmit={handleForgotOtpSubmit} className="space-y-5">
                  <div className="grid grid-cols-6 gap-2 max-w-[260px] mx-auto">
                    {otpPin.map((data, index) => (
                      <input
                        key={index}
                        type="text"
                        maxLength={1}
                        value={data}
                        onChange={e => handlePinChange(e.target, index)}
                        onKeyDown={e => handlePinKeyDown(e, index)}
                        className="w-full h-12 text-center text-lg font-bold font-mono bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-500/25 transition-all backdrop-blur-md"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-neutral-950 font-bold text-xs font-mono uppercase tracking-widest rounded-xl transition-all duration-300 shadow-[0_4px_20px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        {gt('ආරක්ෂිත කේතය තහවුරු කරන්න', 'CONFIRM SECURITY CODE')} <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-4 text-center space-y-2">
                  <button
                    onClick={async () => {
                      setErrorMessage('');
                      setSuccessMessage('');
                      setIsLoading(true);
                      try {
                        const { error } = await supabase.auth.resend({ type: 'recovery', email });
                        if (error) throw error;
                        setSuccessMessage(gt('✅ Reset කේතය නැවත එවා ඇත. SPAM බලන්න.', '✅ Reset code resent. Check SPAM.'));
                      } catch (err: any) {
                        setErrorMessage(err.message || gt('නැවත එවීමට අපොහොසත් විය.', 'Failed to resend.'));
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading}
                    className="text-[11px] font-mono text-amber-400 hover:text-amber-300 underline underline-offset-2 mx-auto cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? gt('යවමින්...', 'Sending...') : gt('Reset කේතය නැවත එවන්න', 'Resend Reset Code')}
                  </button>
                  <div>
                    <button
                      onClick={() => handleViewChange('forgot')}
                      className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> {gt('නැවත ඊමේල් ඇතුළත් කිරීමට', 'Back to Email Entry')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 6. RESET PASSWORD FORM */}
            {view === 'reset_password' && (
              <motion.div
                key="reset-password-view"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-6">
                  <h2 className="text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
                    {gt('නව මුරපදයක් ඇතුළු කරන්න', 'Choose New Password')}{' '}
                    <Lock className="w-5 h-5 text-cyan-400" />
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {gt('ආරක්ෂිත නව මුරපදයක් දෙවරක්ම නිවැරදිව ඇතුළත් කරන්න.', 'Choose a safe, uncompromised passcode sequence containing characters & digits.')}
                  </p>
                </div>

                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5 tracking-wider">
                      {gt('නව මුරපදය', 'NEW PASSWORD')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="******"
                        className="w-full pl-10 pr-10 py-2.5 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono backdrop-blur-md"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-2.5 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5 tracking-wider">
                      {gt('නව මුරපදය තහවුරු කරන්න', 'CONFIRM NEW PASSWORD')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type={showConfirmNewPassword ? 'text' : 'password'}
                        required
                        value={confirmNewPassword}
                        onChange={e => setConfirmNewPassword(e.target.value)}
                        placeholder="******"
                        className="w-full pl-10 pr-10 py-2.5 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono backdrop-blur-md"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        className="absolute right-3.5 top-2.5 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                      >
                        {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-neutral-950 font-bold text-xs font-mono uppercase tracking-widest rounded-xl transition-all duration-300 shadow-[0_4px_20px_rgba(6,182,212,0.25)] flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        {gt('මුරපදය වෙනස් කර ඇතුල් වන්න', 'RESET PASSWORD & CONTINUE')} <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-mono">
          {view === 'login' ? (
            <>
              <span>{gt('නව ගිණුමක් අවශ්‍යද?', 'Need a new account?')}</span>
              <button onClick={() => handleViewChange('signup')} className="text-cyan-400 hover:underline text-xs flex items-center gap-1 cursor-pointer font-bold">
                {gt('ලියාපදිංචි වන්න', 'Sign Up')} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : view === 'signup' ? (
            <>
              <span>{gt('දැනටමත් ගිණුමක් තිබේද?', 'Already have an account?')}</span>
              <button onClick={() => handleViewChange('login')} className="text-cyan-400 hover:underline text-xs flex items-center gap-1 cursor-pointer font-bold">
                {gt('ප්‍රවේශ වන්න', 'Login')} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <span>{gt('ප්‍රශ්නයක් තිබේද?', 'Have questions?')}</span>
              <button 
                type="button"
                onClick={() => {
                  window.dispatchEvent(new Event('open_spt_support_ticket'));
                }}
                className="text-amber-400 hover:text-amber-300 font-bold ml-1 hover:underline cursor-pointer bg-transparent border-none p-0 focus:outline-none"
              >
                {gt('සහායක සේවා පද්ධතිය', 'SPT SUPPORT')}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
