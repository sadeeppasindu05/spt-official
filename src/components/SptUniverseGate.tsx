import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Mail, User, ArrowRight, Eye, EyeOff, Sparkles, AlertCircle, CheckCircle2, ChevronLeft, Key } from 'lucide-react';
import { supabase } from '../supabaseClient'; 

export type GateView = 'login' | 'signup' | 'forgot' | 'reset_password';

interface SptUniverseGateProps {
  onClose?: () => void;
  onSuccess?: (userData: { email: string; name?: string; password?: string }, isSignUp?: boolean) => void;
  language?: 'si' | 'en';
  recoveryMode?: boolean;
}

export default function SptUniverseGate({ onClose, onSuccess, language = 'en', recoveryMode }: SptUniverseGateProps) {
  const [view, setView] = useState<GateView>(recoveryMode ? 'reset_password' : 'login');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMesssage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // OTP states
  const [showOtpInput, setShowOtpInput] = useState<boolean>(false);
  const [otpValue, setOtpValue] = useState<string>('');
  const [otpMode, setOtpMode] = useState<'signup' | 'forgot'>('signup');
  const [recoveryToken, setRecoveryToken] = useState<string>('');

  // Show success message if coming from recovery link
  useEffect(() => {
    if (recoveryMode) {
      setSuccessMessage(gt(
        '🔐 ආරක්ෂිත සබැඳිය තහවුරු කරන ලදී. කරුණාකර නව මුරපදයක් ඇතුළත් කරන්න.',
        '🔐 Recovery link verified. Please enter a new password.'
      ));
    }
  }, []);

  // Password Visibility toggles
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showRePassword, setShowRePassword] = useState<boolean>(false);

  // Form States
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [rePassword, setRePassword] = useState<string>('');

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

  // 3. Signup Submit Handler — auto-confirm via server (no OTP/Gmail needed)
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
    if (password.length > 16) {
      setErrorMessage(gt('මුරපදය උපරිම අක්ෂර 16ක් විය යුතුය.', 'Password must be at most 16 characters long.'));
      return;
    }
    if (password !== rePassword) {
      setErrorMessage(gt('මුරපදයන් එකිනෙකට නොගැලපේ.', 'Passwords do not match.'));
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) throw error;

      // Send confirmation email via server (nodemailer)
      const confirmRes = await fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!confirmRes.ok) {
        await fetch('/api/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, userId: data.user?.id || '' }),
        });
      }

      setOtpMode('signup');
      setOtpValue('');
      setShowOtpInput(true);
      setSuccessMessage(gt(
        '✅ ලියාපදිංචිය සාර්ථකයි! ඔබගේ ඊමේල් ලිපිනයට තහවුරු කිරීමේ සබැඳියක් සහ OTP කේතයක් එවා ඇත. කරුණාකර ඔබගේ Inbox (සහ SPAM) පරීක්ෂා කරන්න.',
        '✅ Registration successful! A confirmation link and OTP code have been sent to your email. Please check your inbox (and SPAM folder).'
      ));
    } catch (err: any) {
      setErrorMessage(err.message || gt('ලියාපදිංචි වීමේදී දෝෂයක් මතු විය.', 'Error signing up. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Forgot Password Handler — sends reset link via Supabase built-in email
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
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset link');

      setOtpMode('forgot');
      setOtpValue('');
      setShowOtpInput(true);
      setSuccessMessage(gt(
        '🔐 SPT OFFICIAL: ඔබගේ ඊමේල් ලිපිනයට මුරපදය යළි සැකසීමේ සබැඳියක් සහ OTP කේතයක් එවා ඇත. කරුණාකර ඔබගේ Inbox (සහ SPAM) පරීක්ෂා කරන්න.',
        '🔐 SPT OFFICIAL: A password reset link and OTP code have been sent to your email. Please check your inbox (and SPAM folder).'
      ));
    } catch (err: any) {
      setErrorMessage(err.message || gt('ඊමේල් එක යැවීමේදී දෝෂයක් මතු විය.', 'Error sending recovery transmission.'));
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Update Password Submission Handler
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
    if (newPassword.length > 16) {
      setErrorMessage(gt('මුරපදය උපරිම අක්ෂර 16ක් විය යුතුය.', 'Password must be at most 16 characters long.'));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage(gt('ඇතුළත් කළ මුරපදයන් එකිනෙකට නොගැලපේ.', 'Encryption mismatch: password entries must perfectly align.'));
      return;
    }

    setIsLoading(true);
    try {
      if (recoveryToken) {
        // OTP-based recovery
        const res = await fetch('/api/update-password-with-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, newPassword, resetToken: recoveryToken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update password');
        setRecoveryToken('');
      } else {
        // Default Supabase recovery (from email link)
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      }

      setSuccessMessage(gt(
        '✅ සුභ පැතුම්! ඔබගේ SPT OFFICIAL ගිණුමේ මුරපදය සාර්ථකව යාවත්කාලීන කරන ලදී!',
        '✅ Congratulations! Your SPT OFFICIAL account password has been successfully updated!'
      ));
      
      setTimeout(async () => {
        const resolvedEmail = email || (await supabase.auth.getSession()).data.session?.user?.email || '';
        if (onSuccess) {
          onSuccess({ email: resolvedEmail, name: resolvedEmail.split('@')[0] });
        }
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || gt('මුරපදය රීසෙට් කිරීමේදී දෝෂයක් සිදු විය.', 'Unable to rewrite credential layers in local directory.'));
    } finally {
      setIsLoading(false);
    }
  };

  // 6. OTP Verification Handler
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!otpValue || otpValue.length !== 6) {
      setErrorMessage(gt('කරුණාකර 6-ඉලක්කම් OTP කේතය ඇතුළත් කරන්න.', 'Please enter the 6-digit OTP code.'));
      return;
    }
    setIsLoading(true);
    try {
      const endpoint = otpMode === 'signup' ? '/api/verify-otp' : '/api/verify-recovery-otp';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'OTP verification failed');

      if (otpMode === 'signup') {
        // Auto-login after signup confirmation
        setSuccessMessage(gt('✅ ගිණුම තහවුරු කරන ලදී! ස්වයංක්‍රීයව පිවිසෙමින්...', '✅ Account confirmed! Auto-logging in...'));
        const { data: pwData } = await supabase.auth.getSession();
        if (!pwData.session) {
          setView('login');
        } else if (onSuccess) {
          onSuccess({ email: pwData.session.user.email || email });
        }
      } else {
        // Forgot password — store reset token and show reset form
        setRecoveryToken(data.resetToken || '');
        setSuccessMessage(gt('✅ OTP තහවුරු කරන ලදී! කරුණාකර නව මුරපදයක් ඇතුළත් කරන්න.', '✅ OTP verified! Please enter a new password.'));
        setShowOtpInput(false);
        setView('reset_password');
      }
    } catch (err: any) {
      setErrorMessage(err.message || gt('OTP තහවුරු කිරීමේදී දෝෂයක් මතු විය.', 'Error verifying OTP.'));
    } finally {
      setIsLoading(false);
    }
  };

  // 7. Resend OTP
  const handleResendOtp = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);
    try {
      const endpoint = otpMode === 'signup' ? '/api/send-confirmation' : '/api/forgot-password';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(gt('නැවත යැවීමට අපොහොසත් විය.', 'Failed to resend.'));
      setSuccessMessage(gt('✅ OTP කේතය නැවත එවා ඇත!', '✅ OTP code resent!'));
    } catch (err: any) {
      setErrorMessage(err.message || gt('නැවත යැවීමේදී දෝෂයක්.', 'Error resending.'));
    } finally {
      setIsLoading(false);
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
            {view === 'signup' && !showOtpInput && (
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
                        maxLength={16}
                        className="w-full px-3.5 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                      />
                      <p className="mt-1 text-[9px] font-mono text-slate-500">
                        {gt('අකුරු 6-16 අතර විය යුතුය', '6-16 characters required')}
                        {password.length > 0 && (
                          <span className={password.length >= 6 && password.length <= 16 ? ' text-green-400 ml-1' : ' text-amber-400 ml-1'}>
                            ({password.length}/16)
                          </span>
                        )}
                      </p>
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
                        maxLength={16}
                        className={`w-full px-3.5 py-2 text-xs bg-white/[0.04] border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all ${rePassword && password !== rePassword ? 'border-red-500/50' : 'border-white/10'}`}
                      />
                      {rePassword && password !== rePassword && (
                        <p className="mt-1 text-[9px] font-mono text-red-400">
                          {gt('මුරපදයන් නොගැලපේ', 'Passwords do not match')}
                        </p>
                      )}
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
            {showOtpInput && (
              <motion.div
                key="otp-view"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-5">
                  <h2 className="text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-cyan-400" />
                    {gt('OTP කේතය ඇතුළත් කරන්න', 'Enter OTP Code')}
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    {gt('ඔබගේ ඊමේල් ලිපිනයට එවන ලද 6-ඉලක්කම් කේතය ඇතුළත් කරන්න. එසේත් නැත්නම් ඊමේල් එකේ ඇති සබැඳිය ක්ලික් කරන්න.', 'Enter the 6-digit code sent to your email. Or click the confirmation link in the email.')}
                  </p>
                </div>

                <form onSubmit={handleOtpSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 tracking-wider">
                      {gt('OTP කේතය', 'OTP CODE')}
                    </label>
                    <input
                      type="text"
                      required
                      value={otpValue}
                      onChange={e => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full px-3.5 py-3 text-lg text-center tracking-[8px] bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
                    />
                    <p className="mt-1 text-[9px] font-mono text-slate-500 text-center">
                      {gt('ඊමේල් එකේ ඇති කේතය ඇතුළත් කරන්න', 'Enter the code from your email')}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-neutral-950 font-bold text-xs font-mono uppercase tracking-widest rounded-xl transition-all duration-300 shadow-[0_4px_20px_rgba(6,182,212,0.25)] flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>{gt('තහවුරු කරන්න', 'VERIFY & CONFIRM')} <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>

                <div className="mt-4 text-center space-y-2">
                  <button
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 cursor-pointer mx-auto block"
                  >
                    {gt('OTP කේතය නැවත එවන්න', 'Resend OTP Code')}
                  </button>
                  <button
                    onClick={() => { setShowOtpInput(false); setOtpValue(''); handleViewChange(otpMode === 'signup' ? 'signup' : 'forgot'); }}
                    className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> {gt('ආපසු', 'Go Back')}
                  </button>
                </div>
              </motion.div>
            )}

            {/* 4. FORGOT PASSWORD VIEW */}
            {view === 'forgot' && !showOtpInput && (
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
            {/* 5. RESET PASSWORD FORM */}
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
                        maxLength={16}
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
                    <p className="mt-1 text-[9px] font-mono text-slate-500">
                      {gt('අකුරු 6-16 අතර විය යුතුය', '6-16 characters required')}
                      {newPassword.length > 0 && (
                        <span className={newPassword.length >= 6 && newPassword.length <= 16 ? ' text-green-400 ml-1' : ' text-amber-400 ml-1'}>
                          ({newPassword.length}/16)
                        </span>
                      )}
                    </p>
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
                        maxLength={16}
                        className={`w-full pl-10 pr-10 py-2.5 text-xs bg-white/[0.04] border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono backdrop-blur-md ${confirmNewPassword && newPassword !== confirmNewPassword ? 'border-red-500/50' : 'border-white/10'}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        className="absolute right-3.5 top-2.5 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                      >
                        {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmNewPassword && newPassword !== confirmNewPassword && (
                      <p className="mt-1 text-[9px] font-mono text-red-400">
                        {gt('මුරපදයන් නොගැලපේ', 'Passwords do not match')}
                      </p>
                    )}
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
