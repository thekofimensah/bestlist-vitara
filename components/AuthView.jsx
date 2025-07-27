import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader,
  Check,
  X,
} from 'lucide-react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signInWithFacebook,
  supabase,
  checkUsernameAvailability,
} from '../lib/supabase';

/** ----------   TOKEN MAP   ---------- **/
const palette = {
  offWhite: '#F6F6F4',
  card: '#FFFFFF',
  herb: '#1F6D5A',
  herbLight: '#DCEFE9',
  redLight: '#FDEAEA',
  redText: '#B0443C',
  border: '#E2E2DF',
  muted: '#8A8D89',
  shadow: '0 8px 24px rgba(0,0,0,0.06)',
};

/** ----------   BASE COMPONENT   ---------- **/
const AuthView = () => {
  /* form state */
  const [signUp, setSignUp] = useState(false);
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [mail, setMail] = useState('');
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  
  /* username availability state */
  const [usernameStatus, setUsernameStatus] = useState({ 
    checking: false, 
    available: null, 
    error: null 
  });

  /* helpers */
  const validEmail = (e) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim().toLowerCase());
  
  const validUsername = (u) =>
    /^[a-zA-Z0-9_]{3,20}$/.test(u.trim()); // 3-20 chars, letters, numbers, underscores

  const resetAlerts = () => setMsg({ type: '', text: '' });

  /* debounced username check */
  useEffect(() => {
    if (!signUp || !username || username.length < 3) {
      setUsernameStatus({ checking: false, available: null, error: null });
      return;
    }

    if (!validUsername(username)) {
      setUsernameStatus({ checking: false, available: false, error: 'Invalid format' });
      return;
    }

    setUsernameStatus({ checking: true, available: null, error: null });

    const timeoutId = setTimeout(async () => {
      try {
        const { available, error } = await checkUsernameAvailability(username);
        setUsernameStatus({ 
          checking: false, 
          available, 
          error: error || null 
        });
      } catch (error) {
        setUsernameStatus({ 
          checking: false, 
          available: false, 
          error: 'Failed to check username' 
        });
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [username, signUp]);

  /* submit */
  const handleAuth = async (e) => {
    e.preventDefault();
    resetAlerts();

    /* minimal client checks */
    if (!validEmail(mail)) return setMsg({ type: 'error', text: 'Invalid email' });
    if (pwd.length < 6) return setMsg({ type: 'error', text: 'Password ≥ 6 chars' });
    if (signUp && name.trim().length < 2)
      return setMsg({ type: 'error', text: 'Enter full name' });
    if (signUp && !validUsername(username))
      return setMsg({ type: 'error', text: 'Username: 3-20 chars, letters/numbers/_' });
    if (signUp && usernameStatus.checking)
      return setMsg({ type: 'error', text: 'Checking username availability...' });
    if (signUp && !usernameStatus.available)
      return setMsg({ type: 'error', text: usernameStatus.error || 'Username not available' });

    setBusy(true);

    /* api */
    const email = mail.trim().toLowerCase();
    const fn = signUp ? signUpWithEmail : signInWithEmail;
    const { data, error } = signUp 
      ? await fn(email, pwd, name.trim(), username.trim())
      : await fn(email, pwd);

    if (error) setMsg({ type: 'error', text: error.message });
    else if (signUp && !data.session)
      setMsg({ type: 'success', text: 'Check email to confirm account' });
    else setMsg({ type: 'success', text: 'Signed in!' });

    setBusy(false);
  };

  /* socials */
  const oauth = async (fn) => {
    setBusy(true);
    const { error } = await fn();
    if (error) setMsg({ type: 'error', text: error.message });
    setBusy(false);
  };

  /* field styles */
  const baseInput =
    'w-full py-4 pl-12 pr-12 rounded-2xl border outline-none transition-colors';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: palette.offWhite }}
    >
      <motion.div
        className="w-full max-w-md rounded-3xl p-8"
        style={{ background: palette.card, boxShadow: palette.shadow }}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        {/* logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center mb-2"
            style={{ backgroundColor: palette.herb }}
          >
            <span className="text-white font-bold lowercase">b</span>
          </div>
          <h1 className="text-2xl tracking-tight font-medium text-gray-900">
            breadcrumbs
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {signUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        {/* alerts */}
        {msg.text && (
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`rounded-2xl p-4 mb-6 text-sm text-center ${
              msg.type === 'error'
                ? 'border border-red-200'
                : 'border border-green-200'
            }`}
            style={{
              background:
                msg.type === 'error' ? palette.redLight : palette.herbLight,
              color: msg.type === 'error' ? palette.redText : palette.herb,
            }}
          >
            {msg.text}
          </motion.div>
        )}

        {/* social */}
        <div className="space-y-3 mb-7">
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={busy}
            onClick={() => oauth(signInWithGoogle)}
            className="w-full flex items-center justify-center border border-gray-200 rounded-2xl py-3 hover:bg-gray-50"
          >
            <span className="text-gray-700 text-sm font-medium">
              Continue with Google
            </span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={busy}
            onClick={() => oauth(signInWithFacebook)}
            className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-3"
          >
            <span className="text-sm font-medium">Continue with Facebook</span>
          </motion.button>
        </div>

        {/* divider */}
        <div className="flex items-center mb-6">
          <div className="flex-grow border-t" style={{ borderColor: palette.border }}></div>
          <span className="px-3 text-xs text-gray-500">or</span>
          <div className="flex-grow border-t" style={{ borderColor: palette.border }}></div>
        </div>

        {/* form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {signUp && (
            <>
              <div className="relative">
                <User size={20} className="absolute left-4 top-3.5 text-gray-400" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  required
                  className={`${baseInput} ${
                    name.trim().length >= 2 && 'border-herb'
                  }`}
                  style={{
                    borderColor:
                      name.trim().length >= 2 ? palette.herb : palette.border,
                  }}
                />
              </div>
              
              <div className="relative mb-6">
                <span className="absolute left-4 top-3.5 text-gray-400 text-sm">@</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="username"
                  required
                  maxLength={20}
                  className={`${baseInput} pl-8 ${
                    usernameStatus.available === true && 'border-herb'
                  } ${
                    usernameStatus.available === false && 'border-red-400'
                  }`}
                  style={{
                    borderColor:
                      usernameStatus.available === true 
                        ? palette.herb 
                        : usernameStatus.available === false 
                        ? '#f87171' 
                        : palette.border,
                  }}
                />
                {username && (
                  <span className="absolute right-4 top-3.5">
                    {usernameStatus.checking ? (
                      <Loader size={18} className="animate-spin text-gray-400" />
                    ) : usernameStatus.available === true ? (
                      <Check size={18} style={{ color: palette.herb }} />
                    ) : usernameStatus.available === false ? (
                      <X size={18} className="text-red-400" />
                    ) : validUsername(username) ? (
                      <Check size={18} className="text-gray-400" />
                    ) : (
                      <X size={18} className="text-red-400" />
                    )}
                  </span>
                )}
                {/* Username status message */}
                {username.length >= 3 && usernameStatus.error && (
                  <div className="absolute top-full left-0 mt-1 text-xs text-red-500">
                    {usernameStatus.error}
                  </div>
                )}
                {username.length >= 3 && usernameStatus.available === true && (
                  <div className="absolute top-full left-0 mt-1 text-xs" style={{ color: palette.herb }}>
                    Username available!
                  </div>
                )}
              </div>
            </>
          )}

          <div className="relative">
            <Mail size={20} className="absolute left-4 top-3.5 text-gray-400" />
            <input
              type="email"
              value={mail}
              onChange={(e) => setMail(e.target.value)}
              placeholder="Email address"
              required
              className={`${baseInput}`}
              style={{
                borderColor: validEmail(mail)
                  ? palette.herb
                  : palette.border,
              }}
            />
            {mail && (
              <span className="absolute right-4 top-3.5">
                {validEmail(mail) ? (
                  <Check size={18} className="text-herb" />
                ) : (
                  <X size={18} className="text-red-400" />
                )}
              </span>
            )}
          </div>

          <div className="relative">
            <Lock size={20} className="absolute left-4 top-3.5 text-gray-400" />
            <input
              type={show ? 'text' : 'password'}
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Password"
              required
              className={`${baseInput}`}
              style={{
                borderColor: pwd.length >= 6 ? palette.herb : palette.border,
              }}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-4 top-3.5 text-gray-400"
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={busy}
            type="submit"
            className="w-full py-4 rounded-2xl text-white font-semibold flex items-center justify-center"
            style={{ backgroundColor: palette.herb }}
          >
            {busy ? (
              <Loader size={18} className="animate-spin" />
            ) : signUp ? (
              'Create account'
            ) : (
              'Sign in'
            )}
          </motion.button>
        </form>

        {/* switch */}
        <div className="text-center mt-6">
          <button
            onClick={() => {
              setSignUp(!signUp);
              resetAlerts();
              setUsernameStatus({ checking: false, available: null, error: null });
            }}
            className="text-sm font-medium"
            style={{ color: palette.muted }}
          >
            {signUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthView;