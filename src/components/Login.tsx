import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const finalEmail = email.includes('@') ? email : `${email}@migusto.com.ar`;

      if (isResetting) {
        await resetPassword(finalEmail);
        setMessage('Si el email existe, recibirás instrucciones para recuperar tu contraseña.');
      } else {
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        await signIn(finalEmail, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1115] via-[#1a1c23] to-[#0f1115] flex items-center justify-center p-4 transition-all duration-500">
      <div className="bg-white dark:bg-[#1a1c23] backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl w-full max-w-md md:max-w-lg lg:max-w-md p-10 md:p-16 transition-all duration-300">
        <div className="flex items-center justify-center mb-10">
          <img src="/fabrica/MES/logo.png" alt="Logo" className="h-20 md:h-28 lg:h-20 w-auto object-contain" />
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-4xl font-black text-center text-gray-900 dark:text-white mb-2 tracking-tight">
          Sistema MES
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-10 font-medium">
          Gestión de Producción Industrial
        </p>

        <form onSubmit={handleSubmit} action="#" method="POST" className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">
              Usuario
            </label>
            <input
              id="email"
              name="username"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 md:py-4 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 md:text-lg lg:text-base"
              placeholder="Ingrese su usuario"
              required
            />
          </div>

          {!isResetting && (
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 md:py-4 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 md:text-lg lg:text-base"
                  placeholder="Ingrese su contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all duration-300"
                >
                  {showPassword ? (
                    /* Ojo Abierto con pestañas arriba */
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-in fade-in zoom-in duration-300">
                      <path d="M2 12s4-8 10-8 10 8 10 8" />
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 4V2" />
                      <path d="M17 5l1.5-1.5" />
                      <path d="M7 5L5.5 3.5" />
                    </svg>
                  ) : (
                    /* Ojo Cerrado con pestañas abajo */
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-in fade-in zoom-in duration-300">
                      <path d="M2 10c3 5 17 5 20 0" />
                      <path d="M12 14v2" />
                      <path d="M17 13l1.5 1.5" />
                      <path d="M7 13l-1.5 1.5" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {!isResetting && (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-white/10 rounded dark:bg-black/20"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Recordar contraseña
                </label>
              </div>

              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetting(true);
                    setError('');
                    setMessage('');
                  }}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 rounded-lg text-sm bg-green-50 text-green-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 md:py-5 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed md:text-lg lg:text-base"
          >
            {loading ? 'Procesando...' : isResetting ? 'Recuperar contraseña' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-4">
          {/* Registro eliminado por petición del usuario */}

          {isResetting && (
            <button
              onClick={() => {
                setIsResetting(false);
                setError('');
                setMessage('');
              }}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm font-bold transition-colors block w-full"
            >
              Volver al inicio de sesión
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
