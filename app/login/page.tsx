'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  Auth,
  UserCredential,
  User
} from 'firebase/auth';
import Navbar from '@/components/navbar';

// Firebase configuration - replace with your config
const firebaseConfig = {
  apiKey: "AIzaSyA7mLECACZJ9B4TvBTcRcZzE_OB94E4iOg",
  authDomain: "practice-5e0e0.firebaseapp.com",
  projectId: "practice-5e0e0",
  storageBucket: "practice-5e0e0.firebasestorage.app",
  messagingSenderId: "732537143582",
  appId: "1:732537143582:web:e071db8db6d973ae89490f",
  measurementId: "G-XK9QJB14SN"
};

// Initialize Firebase
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth: Auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

interface PasswordStrength {
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  hasMinLength: boolean;
}

interface PasswordRequirement {
  key: keyof PasswordStrength;
  label: string;
}

export default function Login() {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [resetEmailSent, setResetEmailSent] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
    hasMinLength: false
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check password strength
  useEffect(() => {
    if (!isLogin && formData.password) {
      setPasswordStrength({
        hasUppercase: /[A-Z]/.test(formData.password),
        hasLowercase: /[a-z]/.test(formData.password),
        hasNumber: /\d/.test(formData.password),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
        hasMinLength: formData.password.length >= 8
      });
    }
  }, [formData.password, isLogin]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    if (!isLogin) {
      const { hasUppercase, hasLowercase, hasNumber, hasSpecialChar, hasMinLength } = passwordStrength;
      
      if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar || !hasMinLength) {
        newErrors.password = 'Password does not meet requirements';
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      if (isLogin) {
        const userCredential: UserCredential = await signInWithEmailAndPassword(
          auth, 
          formData.email, 
          formData.password
        );
        console.log('User logged in:', userCredential.user);
        // Redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        const userCredential: UserCredential = await createUserWithEmailAndPassword(
          auth, 
          formData.email, 
          formData.password
        );
        console.log('User created:', userCredential.user);
        // Store user in MongoDB
        await storeUserInMongoDB(userCredential.user);
        // Redirect to chatbot
        window.location.href = '/document-analyser';
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      // Firebase auth error codes
      let errorMessage = 'An error occurred. Please try again.';
      
      if (error.code === 'auth/invalid-credential' || 
          error.code === 'auth/wrong-password' || 
          error.code === 'auth/user-not-found') {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    
    try {
      const result: UserCredential = await signInWithPopup(auth, googleProvider);
      console.log('Google sign-in successful:', result.user);
      
      // Store user in MongoDB if new user
      const tokenResponse = (result as any)._tokenResponse;
      if (tokenResponse?.isNewUser) {
        await storeUserInMongoDB(result.user);
      }
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      setErrors({ general: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setErrors({ email: 'Please enter your email first' });
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, formData.email);
      setResetEmailSent(true);
    } catch (error: any) {
      console.error('Password reset error:', error);
      setErrors({ general: error.message });
    }
  };

  const storeUserInMongoDB = async (user: User) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: new Date().toISOString(),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to store user data');
      }
    } catch (error) {
      console.error('Error storing user in MongoDB:', error);
    }
  };

  if (!mounted) return null;

  const PasswordStrengthIndicator = () => {
    const requirements: PasswordRequirement[] = [
      { key: 'hasMinLength', label: '8+ characters' },
      { key: 'hasUppercase', label: 'Uppercase' },
      { key: 'hasLowercase', label: 'Lowercase' },
      { key: 'hasNumber', label: 'Number' },
    ];

    return (
      <div className="space-y-2 mt-2">
        <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Password Requirements:
        </div>
        <div className="grid grid-cols-2 gap-1">
          {requirements.map(({ key, label }) => (
            <div key={key} className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                passwordStrength[key] 
                  ? 'bg-green-500' 
                  : darkMode ? 'bg-[#4F7C82]' : 'bg-gray-300'
              }`} />
              <span className={`text-xs ${
                passwordStrength[key] 
                  ? 'text-green-600' 
                  : darkMode ? 'text-[#93B1B5]' : 'text-gray-500'
              }`}>
                {label}
              </span>
            </div>
          ))}
          <div className="flex items-center space-x-1 col-span-2">
            <div className={`w-2 h-2 rounded-full ${
              passwordStrength.hasSpecialChar 
                ? 'bg-green-500' 
                : darkMode ? 'bg-[#4F7C82]' : 'bg-gray-300'
            }`} />
            <span className={`text-xs ${
              passwordStrength.hasSpecialChar 
                ? 'text-green-600' 
                : darkMode ? 'text-[#93B1B5]' : 'text-gray-500'
            }`}>
              Special character (!@#$%^&*)
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen relative" 
      style={{
       backgroundImage: "url(/layered-bg.png)",
       backgroundSize: '100% 100%',
       backgroundPosition: 'center',
       backgroundRepeat: 'no-repeat',
      }}
    >
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
      
      <div className="pt-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className={`${
            darkMode ? 'bg-[#0B2E33]/80' : 'bg-white'
          } backdrop-blur-sm rounded-2xl shadow-xl py-6 px-8 border ${
            darkMode ? 'border-[#4F7C82]/20' : 'border-gray-200'
          }`}>
            
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className={`text-3xl font-bold ${
                darkMode ? 'text-[#B8E3E9]' : 'text-[#0B2E33]'
              }`}>
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className={`mt-2 text-sm ${
                darkMode ? 'text-[#93B1B5]' : 'text-gray-600'
              }`}>
                {isLogin ? 'Sign in to your account' : 'Join LegalFlow today'}
              </p>
            </div>

            {/* Reset Email Confirmation */}
            {resetEmailSent && (
              <div className={`mb-6 p-4 rounded-lg border ${
                darkMode 
                  ? 'bg-green-900/20 border-green-700/30 text-green-300' 
                  : 'bg-green-50 border-green-200 text-green-800'
              }`}>
                <div className="flex items-center space-x-2">
                  <CheckCircle size={20} />
                  <span className="text-sm font-medium">
                    Password reset email sent! Check your inbox.
                  </span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errors.general && (
              <div className={`mb-6 p-4 rounded-lg border flex items-center space-x-2 ${
                darkMode 
                  ? 'bg-red-900/20 border-red-700/30 text-red-300' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <AlertCircle size={20} />
                <span className="text-sm font-medium">{errors.general}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-[#B8E3E9]' : 'text-[#0B2E33]'
                }`}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                    darkMode ? 'text-[#93B1B5]' : 'text-gray-400'
                  }`} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-offset-0 transition-all duration-200 ${
                      darkMode
                        ? 'bg-[#0B2E33] border-[#4F7C82] text-[#B8E3E9] focus:border-[#B8E3E9] focus:ring-[#B8E3E9]/20'
                        : 'bg-white border-gray-300 text-[#0B2E33] focus:border-[#4F7C82] focus:ring-[#4F7C82]/20'
                    } ${errors.email ? 'border-red-500' : ''}`}
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-[#B8E3E9]' : 'text-[#0B2E33]'
                }`}>
                  Password
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                    darkMode ? 'text-[#93B1B5]' : 'text-gray-400'
                  }`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-offset-0 transition-all duration-200 ${
                      darkMode
                        ? 'bg-[#0B2E33] border-[#4F7C82] text-[#B8E3E9] focus:border-[#B8E3E9] focus:ring-[#B8E3E9]/20'
                        : 'bg-white border-gray-300 text-[#0B2E33] focus:border-[#4F7C82] focus:ring-[#4F7C82]/20'
                    } ${errors.password ? 'border-red-500' : ''}`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                      darkMode ? 'text-[#93B1B5] hover:text-[#B8E3E9]' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                )}
                {!isLogin && formData.password && <PasswordStrengthIndicator />}
              </div>

              {/* Confirm Password (Sign Up) */}
              {!isLogin && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-[#B8E3E9]' : 'text-[#0B2E33]'
                  }`}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                      darkMode ? 'text-[#93B1B5]' : 'text-gray-400'
                    }`} />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-offset-0 transition-all duration-200 ${
                        darkMode
                          ? 'bg-[#0B2E33] border-[#4F7C82] text-[#B8E3E9] focus:border-[#B8E3E9] focus:ring-[#B8E3E9]/20'
                          : 'bg-white border-gray-300 text-[#0B2E33] focus:border-[#4F7C82] focus:ring-[#4F7C82]/20'
                      } ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      placeholder="Confirm your password"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                  darkMode
                    ? 'bg-[#4F7C82] hover:bg-[#4F7C82]/90 text-white'
                    : 'bg-[#1E8DD0] hover:bg-[#1E8DD0]/90 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="animate-spin h-4 w-4" />
                    <span>{isLogin ? 'Signing In...' : 'Creating Account...'}</span>
                  </div>
                ) : (
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                )}
              </button>
            </form>

            {/* Google Sign In */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full border-t ${
                    darkMode ? 'border-[#1E8DD0]/30' : 'border-gray-300'
                  }`} />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className={`px-4 ${
                    darkMode ? 'bg-[#1E8DD0] text-[#93B1B5]' : 'bg-white text-gray-500'
                  }`}>
                    Or continue with
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className={`mt-3 w-full py-3 px-4 rounded-lg border font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-3 ${
                  darkMode
                    ? 'border-[#4F7C82] bg-[#1E8DD0] text-[#B8E3E9] hover:bg-[#4F7C82]/10'
                    : 'border-gray-300 bg-white text-[#0B2E33] hover:bg-gray-50'
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Sign {isLogin ? 'in' : 'up'} with Google</span>
              </button>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center space-y-4">
              {isLogin && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className={`text-sm font-medium transition-colors ${
                    darkMode
                      ? 'text-[#B8E3E9] hover:text-white'
                      : 'text-[#1E8DD0] hover:text-[#0B2E33]'
                  }`}
                >
                  Forgot your password?
                </button>
              )}
              
              <p className={`text-sm ${
                darkMode ? 'text-[#93B1B5]' : 'text-gray-600'
              }`}>
                {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrors({});
                    setFormData({ email: '', password: '', confirmPassword: '' });
                    setResetEmailSent(false);
                  }}
                  className={`font-medium transition-colors ${
                    darkMode
                      ? 'text-[#B8E3E9] hover:text-white'
                      : 'text-[#1E8DD0] hover:text-[#0B2E33]'
                  }`}
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}