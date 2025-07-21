import React, { useState } from 'react';
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
  const [mail, setMail] = useState('');
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  /* helpers */
  const validEmail = (e) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim().toLowerCase());

  const resetAlerts = () => setMsg({ type: '', text: '' });

  /* submit */
  const handleAuth = async (e) => {
    e.preventDefault();
    resetAlerts();

    /* minimal client checks */
    if (!validEmail(mail)) return setMsg({ type: 'error', text: 'Invalid email' });
    if (pwd.length < 6) return setMsg({ type: 'error', text: 'Password ≥ 6 chars' });
    if (signUp && name.trim().length < 2)
      return setMsg({ type: 'error', text: 'Enter full name' });

    setBusy(true);

    /* api */
    const email = mail.trim().toLowerCase();
    const fn = signUp ? signUpWithEmail : signInWithEmail;
    const { data, error } = await fn(email, pwd, name.trim());

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
            <Facebook size={18} className="mr-2" />
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