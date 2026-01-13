import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const { user, isLoading, error, devLogin, clearError } = useAuthStore();

  // Clear error when email changes
  useEffect(() => {
    if (error) clearError();
  }, [email, clearError, error]);

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isLoading) return;

    try {
      await devLogin(email);
    } catch {
      // Error is already set in store
    }
  };

  const handleCloudflareAccess = () => {
    // Redirect to the protected route - Cloudflare Access will handle auth
    // After auth, the user will be redirected back with the JWT in headers
    window.location.href = '/';
  };

  // If authenticated, show loading/redirecting
  if (user) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-white">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 mb-4">
            <span className="text-white font-bold text-2xl font-mono">cc</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">ccdev</h1>
          <p className="text-gray-400">Web Terminal with AI-powered assistance</p>
        </div>

        {/* Login card */}
        <div className="bg-dark-surface rounded-2xl border border-dark-border p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">Sign in to continue</h2>
            <p className="text-sm text-gray-400">
              Use Cloudflare Access or development login
            </p>
          </div>

          {/* Cloudflare Access Sign In */}
          <button
            onClick={handleCloudflareAccess}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-orange-500 text-white font-medium py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5088 16.8447C16.7178 16.1955 16.6383 15.4855 16.2913 14.8979C15.9443 14.3103 15.3682 13.9024 14.7024 13.7736L7.72715 12.4751C7.62487 12.4545 7.53362 12.4007 7.46771 12.3224C7.4018 12.2441 7.3651 12.146 7.36341 12.0445C7.36172 11.943 7.39515 11.8439 7.45838 11.7635C7.52162 11.6831 7.61089 11.6261 7.71246 11.6022L14.7614 9.9247C15.4288 9.76549 16.0013 9.33053 16.3384 8.72387C16.6754 8.11721 16.7483 7.39458 16.5399 6.7293L15.9949 5.00155C15.9632 4.90058 15.9012 4.81224 15.8178 4.7487C15.7344 4.68516 15.6336 4.64937 15.5289 4.6462H5.0929C4.17527 4.6462 3.29505 5.01022 2.64584 5.65943C1.99663 6.30864 1.63261 7.18886 1.63261 8.10649V15.8935C1.63261 16.8112 1.99663 17.6914 2.64584 18.3406C3.29505 18.9898 4.17527 19.3538 5.0929 19.3538H15.5303C15.6351 19.3506 15.7358 19.3148 15.8193 19.2513C15.9027 19.1877 15.9647 19.0994 15.9963 18.9984L16.5088 16.8447Z"/>
              <path d="M19.4362 16.8447C19.6452 16.1955 19.5657 15.4855 19.2187 14.8979C18.8717 14.3103 18.2956 13.9024 17.6298 13.7736L17.3169 13.7125L17.0755 14.6051C16.9206 15.1856 16.6113 15.7133 16.1805 16.1349C15.7497 16.5566 15.2126 16.8566 14.6241 16.9992L7.67503 18.6767C7.57347 18.7006 7.48419 18.7576 7.42096 18.838C7.35772 18.9184 7.32429 19.0176 7.32598 19.119C7.32767 19.2205 7.36438 19.3186 7.43028 19.3969C7.49619 19.4752 7.58745 19.529 7.68973 19.5496L17.6298 21.3736C18.2956 21.5024 18.8717 21.1103 19.2187 20.5227C19.5657 19.9351 19.6452 19.2251 19.4362 18.5759L19.4362 16.8447Z"/>
              <path d="M22.3687 8.10649C22.3687 7.18886 22.0047 6.30864 21.3555 5.65943C20.7063 5.01022 19.8261 4.6462 18.9084 4.6462H17.6313L17.8727 5.53879C18.0276 6.11924 18.337 6.64697 18.7677 7.06858C19.1985 7.4902 19.7357 7.79027 20.3242 7.93289L21.6918 8.26068C21.794 8.28464 21.8833 8.34164 21.9467 8.42197C22.01 8.5023 22.0434 8.60145 22.0417 8.70292L22.0417 15.8935C22.0403 15.995 22.0037 16.0931 21.9377 16.1714C21.8718 16.2497 21.7806 16.3035 21.6783 16.324L20.3107 16.6518C19.7222 16.7944 19.185 17.0945 18.7543 17.5161C18.3235 17.9377 18.0141 18.4654 17.8592 19.0459L17.6313 19.8774H18.9084C19.8261 19.8774 20.7063 19.5134 21.3555 18.8642C22.0047 18.215 22.3687 17.3348 22.3687 16.4171V8.10649Z"/>
            </svg>
            {isLoading ? 'Checking...' : 'Continue with Cloudflare Access'}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-dark-surface text-gray-500">or development login</span>
            </div>
          </div>

          {/* Dev Email Sign In */}
          <form onSubmit={handleDevLogin}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dev@example.com"
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium py-3 px-4 rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Continue with Dev Login'}
            </button>
          </form>

          {/* Environment info */}
          <div className="mt-6 pt-6 border-t border-dark-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Environment:</span>
              <span className="text-xs px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded">
                Development
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          By signing in, you agree to our{' '}
          <a href="#" className="text-primary-400 hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-primary-400 hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
