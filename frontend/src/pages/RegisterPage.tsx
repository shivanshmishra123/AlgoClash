import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register as registerApi } from '../api/auth';
import { useAuth } from '../auth/AuthContext';

export const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await registerApi({ username, email, password });
      login(response.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Registration failed. Username or email may already be registered.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-mono">
      <div className="max-w-md w-full space-y-8 p-8 rounded-lg bg-slate-950 border border-cyan-900/60 shadow-[0_0_25px_rgba(0,255,204,0.08)]">
        <div>
          <div className="flex justify-center">
            <span className="w-4 h-4 bg-[#00ffcc] rounded-sm shadow-[0_0_12px_#00ffcc] animate-pulse" />
          </div>
          <h2 className="mt-4 text-center text-2xl font-bold tracking-widest text-white">
            OPERATIVE REGISTRATION
          </h2>
          <p className="mt-2 text-center text-xs text-slate-400">
            Create security clearance to join tournament rosters
          </p>
        </div>

        {error && (
          <div className="p-3 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                CODENAME (USERNAME)
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="cipher_operative"
                className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#00ffcc] focus:ring-1 focus:ring-[#00ffcc] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                SECURE EMAIL
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operative@algoclash.dev"
                className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#00ffcc] focus:ring-1 focus:ring-[#00ffcc] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                ACCESS KEY (PASSWORD)
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#00ffcc] focus:ring-1 focus:ring-[#00ffcc] text-sm"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded bg-[#00ffcc] text-black font-bold tracking-wider hover:bg-cyan-300 transition-all shadow-[0_0_15px_rgba(0,255,204,0.4)] disabled:opacity-50 text-sm flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  PROVISIONING CREDENTIALS...
                </>
              ) : (
                'COMMISSION OPERATIVE'
              )}
            </button>
          </div>

          <div className="text-center text-xs text-slate-400">
            Already commissioned?{' '}
            <Link to="/login" className="text-[#00ffcc] hover:underline">
              Access existing uplink
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
