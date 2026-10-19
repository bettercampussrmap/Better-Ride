import React, { useState } from 'react';
import { Profile } from '../../types/database';
import { useToast } from '../ui/Toast';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import {
  authenticateWithSupabase,
  saveUserToSupabase,
  isEmailRegistered,
  findUserByEmail,
  updateUserPasswordInSupabase,
} from '../../lib/user-auth-service';
import { toValidUuid } from '../../lib/uuid-utils';

interface LoginPageProps {
  onLoginSuccess: (profile: Profile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { showToast } = useToast();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Forgot password flow state
  const [forgotName, setForgotName] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<'verify' | 'reset'>('verify');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [verifiedProfile, setVerifiedProfile] = useState<Profile | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Handle Sign In with Supabase database credentials check
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      showToast('error', 'Missing Information', 'Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await authenticateWithSupabase(cleanEmail, cleanPassword);

      if (!res.success || !res.profile) {
        showToast(
          'error',
          res.error?.includes('password') ? 'Invalid Credentials' : 'Account Not Found',
          res.error || 'Login failed.'
        );
        setIsSubmitting(false);
        return;
      }

      showToast(
        'success',
        'Login Successful',
        `Welcome back, ${res.profile.display_name || 'Student'}!`
      );
      onLoginSuccess(res.profile);
    } catch (err: any) {
      console.error('Login error:', err);
      showToast('error', 'Login Error', err?.message || 'Could not complete login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Sign Up with Supabase database persistence
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      showToast('error', 'Missing Information', 'Please fill in all required fields.');
      return;
    }

    if (cleanPassword.length < 4) {
      showToast('error', 'Password Too Short', 'Password must be at least 4 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      const alreadyRegistered = await isEmailRegistered(cleanEmail);
      if (alreadyRegistered) {
        showToast(
          'error',
          'Email Already Registered',
          'An account with this email already exists. Please log in or reset password.'
        );
        setIsSubmitting(false);
        return;
      }

      const safeId = toValidUuid(`srm-student-${cleanEmail}`);
      const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        cleanName
      )}&backgroundColor=1A73E8`;

      const newProfile: Profile = {
        id: safeId,
        display_name: cleanName,
        email: cleanEmail,
        gender: gender,
        password: cleanPassword,
        avatar_url: avatarUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Save user credentials into Supabase database
      const saveRes = await saveUserToSupabase(newProfile);
      if (!saveRes.success) {
        throw new Error(saveRes.error || 'Failed to save account to database');
      }

      showToast('success', 'Registration Successful', `Welcome to Better Ride, ${cleanName}!`);
      onLoginSuccess(newProfile);
    } catch (err: any) {
      console.error('Registration error:', err);
      showToast('error', 'Registration Failed', err?.message || 'Could not register account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Forgot Password - Step 1: Verify Name and Email
  const handleForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = forgotName.trim();
    const cleanEmail = forgotEmail.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      showToast('error', 'Missing Details', 'Please enter both your registered name and email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await findUserByEmail(cleanEmail);

      if (!user || user.display_name?.trim().toLowerCase() !== cleanName.toLowerCase()) {
        showToast(
          'error',
          'Verification Failed',
          'The name and email address do not match any registered student account. Please verify both details.'
        );
        setIsSubmitting(false);
        return;
      }

      setVerifiedProfile(user);
      setForgotStep('reset');
      showToast(
        'success',
        'Identity Verified',
        `Account confirmed for ${user.display_name}. Enter your new password below.`
      );
    } catch (err: any) {
      showToast('error', 'Verification Error', err?.message || 'Could not verify account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Forgot Password - Step 2: Set New Password
  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedProfile || !verifiedProfile.email) return;

    const cleanPass = newPassword.trim();
    const cleanConfirm = confirmNewPassword.trim();

    if (cleanPass.length < 4) {
      showToast('error', 'Password Too Short', 'Password must be at least 4 characters long.');
      return;
    }

    if (cleanPass !== cleanConfirm) {
      showToast('error', 'Passwords Do Not Match', 'New password and confirm password must match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await updateUserPasswordInSupabase(verifiedProfile.email, cleanPass);
      if (!res.success) {
        showToast('error', 'Reset Failed', res.error || 'Could not reset password.');
        setIsSubmitting(false);
        return;
      }

      showToast(
        'success',
        'Password Reset Successful',
        'Your password has been updated in the database. Please log in with your new password.'
      );

      // Return to login mode with email pre-filled
      setEmail(verifiedProfile.email);
      setPassword('');
      setForgotName('');
      setForgotEmail('');
      setNewPassword('');
      setConfirmNewPassword('');
      setVerifiedProfile(null);
      setForgotStep('verify');
      setMode('login');
    } catch (err: any) {
      showToast('error', 'Reset Failed', err?.message || 'Could not reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between items-center bg-[#FAFAF8] px-4 py-6 sm:py-8 selection:bg-[#09090B] selection:text-white relative">
      {/* Spacer */}
      <div className="h-4" />

      {/* Main Login / Sign Up Card */}
      <div className="w-full max-w-[340px] my-auto">
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-2xs border border-[#E4E4E7] flex flex-col items-center space-y-4">
          {/* Better Ride Exact Uploaded Emblem Logo - Large and Prominent */}
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-2 border-[#E4E4E7] bg-white shadow-lg p-1 shrink-0 mb-4">
            <img
              src="/assets/aistudio/Gemini_Generated_Image_5av8f85av8f85av8_f440b7ed.png"
              alt="Better Ride"
              className="w-full h-full object-cover rounded-full"
            />
          </div>

          {/* App Branding */}
          <div className="text-center space-y-0.5">
            <h1 className="text-lg sm:text-xl font-extrabold text-[#09090B] tracking-tight">
              Better Ride
            </h1>
          </div>

          {/* Form Header */}
          <div className="w-full text-center pb-0.5">
            <h2 className="text-xs font-bold text-[#09090B]">
              {mode === 'login'
                ? 'Sign in to your account'
                : mode === 'signup'
                ? 'Create student account'
                : forgotStep === 'verify'
                ? 'Reset your password'
                : 'Set new password'}
            </h2>
            {mode !== 'login' && (
              <p className="text-[10px] text-[#71717A]">
                {mode === 'signup'
                  ? 'Fill in your details to register in database'
                  : forgotStep === 'verify'
                  ? 'Enter your registered name and email to verify'
                  : `Verified for ${verifiedProfile?.email}`}
              </p>
            )}
          </div>

          {/* 1. LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="w-full space-y-2.5">
              <div>
                <label className="block text-[10px] font-bold text-[#3F3F46] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@srmist.edu.in"
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E4E4E7] focus:border-[#09090B] focus:ring-1 focus:ring-[#09090B] outline-none text-xs text-[#09090B] bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-[#3F3F46]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setForgotStep('verify');
                      setForgotName('');
                      setForgotEmail(email);
                    }}
                    className="text-[10px] font-semibold text-[#71717A] hover:text-[#09090B] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-8 pr-8 py-1.5 rounded-lg border border-[#E4E4E7] focus:border-[#09090B] focus:ring-1 focus:ring-[#09090B] outline-none text-xs text-[#09090B] bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#09090B] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-8.5 mt-1 rounded-lg bg-[#09090B] hover:bg-[#18181B] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Log In</span>
                    <ArrowRight className="w-3 h-3" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* 2. SIGN UP FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="w-full space-y-2.5">
              <div>
                <label className="block text-[10px] font-bold text-[#3F3F46] mb-1">
                  Full Name (Username)
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E4E4E7] focus:border-[#09090B] focus:ring-1 focus:ring-[#09090B] outline-none text-xs text-[#09090B] bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#3F3F46] mb-1">
                  Gender
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(['Male', 'Female', 'Other'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer text-center ${
                        gender === g
                          ? 'bg-[#09090B] text-white border-[#09090B] shadow-2xs'
                          : 'bg-white text-[#71717A] border-[#E4E4E7] hover:border-gray-400'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#3F3F46] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@srmist.edu.in"
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E4E4E7] focus:border-[#09090B] focus:ring-1 focus:ring-[#09090B] outline-none text-xs text-[#09090B] bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#3F3F46] mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password (min 4 chars)"
                    className="w-full pl-8 pr-8 py-1.5 rounded-lg border border-[#E4E4E7] focus:border-[#09090B] focus:ring-1 focus:ring-[#09090B] outline-none text-xs text-[#09090B] bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#09090B] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-8.5 mt-1 rounded-lg bg-[#09090B] hover:bg-[#18181B] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-3 h-3" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* 3. FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <div className="w-full space-y-2.5">
              {forgotStep === 'verify' ? (
                /* Step 1: Verify Name & Email */
                <form onSubmit={handleForgotVerify} className="space-y-2.5">
                  <div className="bg-[#F4F4F5] p-2 rounded-lg text-[10px] text-[#71717A] leading-relaxed">
                    Enter the exact <strong>Full Name</strong> and <strong>Email Address</strong> registered with your account to verify your identity.
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#3F3F46] mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={forgotName}
                        onChange={(e) => setForgotName(e.target.value)}
                        placeholder="Enter your registered name"
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E4E4E7] focus:border-[#09090B] focus:ring-1 focus:ring-[#09090B] outline-none text-xs text-[#09090B] bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#3F3F46] mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="student@srmist.edu.in"
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E4E4E7] focus:border-[#09090B] focus:ring-1 focus:ring-[#09090B] outline-none text-xs text-[#09090B] bg-white transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-8.5 mt-1 rounded-lg bg-[#09090B] hover:bg-[#18181B] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Verify Account Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Step 2: Set New Password (only displayed when name and email match correctly) */
                <form onSubmit={handleForgotReset} className="space-y-2.5">
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-semibold leading-relaxed">
                    Identity verified for <strong>{verifiedProfile?.display_name}</strong> ({verifiedProfile?.email}). Enter your new password below.
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#3F3F46] mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min 4 chars)"
                        className="w-full pl-8 pr-8 py-1.5 rounded-lg border border-[#E4E4E7] focus:border-[#09090B] focus:ring-1 focus:ring-[#09090B] outline-none text-xs text-[#09090B] bg-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#09090B] cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#3F3F46] mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full pl-8 pr-8 py-1.5 rounded-lg border border-[#E4E4E7] focus:border-[#09090B] focus:ring-1 focus:ring-[#09090B] outline-none text-xs text-[#09090B] bg-white transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-8.5 mt-1 rounded-lg bg-[#09090B] hover:bg-[#18181B] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Change Password</span>
                        <ArrowRight className="w-3 h-3" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Bottom Switcher */}
          <div className="w-full pt-2.5 border-t border-[#E4E4E7] text-center">
            {mode === 'login' ? (
              <p className="text-xs text-[#71717A]">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setPassword('');
                  }}
                  className="font-bold text-[#09090B] hover:underline cursor-pointer"
                >
                  Sign up
                </button>
              </p>
            ) : mode === 'signup' ? (
              <p className="text-xs text-[#71717A]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setPassword('');
                  }}
                  className="font-bold text-[#09090B] hover:underline cursor-pointer"
                >
                  Log in
                </button>
              </p>
            ) : (
              <p className="text-xs text-[#71717A]">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setForgotStep('verify');
                    setPassword('');
                  }}
                  className="font-bold text-[#09090B] hover:underline cursor-pointer"
                >
                  Log in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom required branding */}
      <footer className="w-full text-center py-3">
        <p className="text-[11px] font-medium text-[#71717A]">
          Better Campus Community
        </p>
      </footer>
    </div>
  );
};
