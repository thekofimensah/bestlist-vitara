import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithFacebook, supabase } from '../lib/supabase';

const AuthView = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Client-side validation
    const currentEmail = pendingEmail || email;
    if (!validateEmail(currentEmail)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (isSignUp && (!name || name.trim().length < 2)) {
      setError('Please enter your full name (at least 2 characters)');
      setLoading(false);
      return;
    }

    try {
      let result;
      const emailLower = (pendingEmail || email).trim().toLowerCase();
      
      if (isSignUp) {
        console.log('🚀 Starting sign up for:', emailLower);
        result = await signUpWithEmail(emailLower, password, name.trim());
        console.log('📥 Sign up result:', JSON.stringify(result, null, 2));
      } else {
        console.log('🔑 Starting sign in for:', emailLower);
        result = await signInWithEmail(emailLower, password);
        console.log('📥 Sign in result:', JSON.stringify(result, null, 2));
      }

      if (result.error) {
        // Provide more helpful error messages
        let errorMessage = result.error.message;
        
        if (errorMessage.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address. Make sure it includes @ and a domain (e.g., user@example.com)';
        } else if (errorMessage.includes('Password')) {
          errorMessage = 'Password must be at least 6 characters long';
        } else if (errorMessage.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Try signing in instead.';
        } else if (errorMessage.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        }
        
        setError(errorMessage);
        console.error('❌ Auth error:', result.error);
      } else if (isSignUp && result.data) {
        // Sign up success - check if email confirmation is needed
        console.log('✅ Sign up successful:', JSON.stringify(result.data, null, 2));
        
        if (result.data.user) {
          console.log('👤 User created with ID:', result.data.user.id);
          console.log('📧 Email confirmed at:', result.data.user.email_confirmed_at);
          console.log('🎫 Session exists:', !!result.data.session);
          
          // Check if user was actually created in Supabase
          try {
            const { data: authUser } = await supabase.auth.getUser();
            console.log('🔍 Current auth user after signup:', authUser?.user?.id || 'NONE');
          } catch (authCheck) {
            console.log('🔍 Auth check failed:', authCheck.message);
          }
        }
        
        if (result.data.user && !result.data.session) {
          // User created but needs email confirmation
          setSuccess('Account created! Please check your email and click the confirmation link, then return here to sign in.');
          setPendingEmail(emailLower);
          // Auto-switch to login mode with email pre-filled
          setTimeout(() => {
            setIsSignUp(false);
            setPassword('');
            setName('');
            setSuccess('Please enter your password to complete sign in.');
          }, 3000);
        } else if (result.data.session) {
          // User created and automatically signed in
          setSuccess('Account created and signed in successfully!');
        } else if (result.data.user) {
          // User exists but no session - this shouldn't happen without email confirmation
          console.log('⚠️ Unusual state: User exists but no session and no email confirmation required');
          setSuccess('Account created! You can now sign in.');
          setTimeout(() => {
            setIsSignUp(false);
            setPassword('');
            setName('');
          }, 2000);
        }
      } else if (!isSignUp && result.data?.session) {
        // Sign in success
        console.log('✅ Sign in successful');
        setSuccess('Signed in successfully!');
      }
    } catch (err) {
      console.error('💥 Unexpected auth error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleFacebookSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithFacebook();
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-pink-50 to-blue-100 flex items-center justify-center p-4">
      <motion.div
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1
            className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 mb-2"
            style={{ fontFamily: 'Comic Sans MS, cursive', letterSpacing: '0.1em' }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            bestlist
          </motion.h1>
          <p className="text-gray-600 text-sm">
            {isSignUp ? 'Create your account' : 'Welcome back!'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-red-600 text-sm text-center font-medium">{error}</p>
            {error.includes('Invalid email') && (
              <div className="mt-2 text-xs text-red-500 text-center">
                <p>Email format tips:</p>
                <p>• Must include @ symbol</p>
                <p>• Must have domain (.com, .org, etc.)</p>
                <p>• No spaces or invalid characters</p>
                <p>• Example: user@example.com</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Success Message */}
        {success && (
          <motion.div
            className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-green-600 text-sm text-center font-medium">{success}</p>
            {success.includes('check your email') && (
              <div className="mt-2 text-xs text-green-600 text-center">
                <p>📧 Check your inbox and spam folder</p>
                <p>🔗 Click the confirmation link</p>
                <p>🔄 Return here to sign in</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Social Login */}
        <div className="space-y-3 mb-6">
          <motion.button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-5 h-5 mr-3">
              <svg viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <span className="text-gray-700 font-medium">Continue with Google</span>
          </motion.button>

          <motion.button
            onClick={handleFacebookSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-5 h-5 mr-3">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <span className="font-medium">Continue with Facebook</span>
          </motion.button>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isSignUp && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                required
              />
            </div>
          )}
          
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="email"
              value={pendingEmail || email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (pendingEmail) setPendingEmail(''); // Clear pending email when user types
              }}
              placeholder="Email Address (e.g., user@example.com)"
              className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent ${
                (pendingEmail || email) && !validateEmail(pendingEmail || email) 
                  ? 'border-red-300 focus:ring-red-400' 
                  : 'border-gray-200 focus:ring-pink-400'
              }`}
              required
            />
            {(pendingEmail || email) && !validateEmail(pendingEmail || email) && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-500 text-xs">✕</span>
                </div>
              </div>
            )}
            {(pendingEmail || email) && validateEmail(pendingEmail || email) && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-500 text-xs">✓</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          
          <motion.button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-pink-400 to-orange-400 text-white rounded-xl font-bold shadow-lg disabled:opacity-50"
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </motion.button>
        </form>

        {/* Toggle Sign Up/In */}
        <div className="text-center mt-6">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setSuccess('');
              if (!pendingEmail) {
                setPassword('');
              }
            }}
            className="text-gray-600 hover:text-pink-400 transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthView;