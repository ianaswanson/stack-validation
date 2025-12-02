"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Import Google logo component
import { GoogleLogo } from "@/components/google-logo";

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [loginMode, setLoginMode] = useState<"magic-link" | "password">("magic-link");
  const [error, setError] = useState<string | null>(null);

  // Check for dev/preview environment (client-side)
  const isPreview = process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";
  const isDev = process.env.NODE_ENV === "development";
  const showBypass = isPreview || isDev;

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const result = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: "/dashboard"
      });
      if (result?.ok) {
        setEmailSent(true);
      }
    } catch (error) {
      console.error("Error signing in with email:", error);
      setError("Failed to send magic link");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard"
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error signing in with password:", error);
      setError("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md">
        {/* Logo/Brand - Replace with your actual logo */}
        <div className="flex flex-col items-center mb-12">
          <div className="w-16 h-16 bg-neutral-100 border-2 border-dashed border-neutral-300 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-h3 text-neutral-900">Sign in</h1>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg border border-neutral-200 p-8 shadow-sm">
          {emailSent ? (
            // Email sent confirmation
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-h4 text-neutral-900 mb-2">Check your email</h2>
              <p className="text-body text-neutral-600 mb-6">
                We sent a magic link to <strong>{email}</strong>
              </p>
              <p className="text-body-sm text-neutral-500 mb-4">
                Click the link in the email to sign in. The link will expire in 24 hours.
              </p>
              <button
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Mode Toggle */}
              <div className="flex gap-2 p-1 bg-neutral-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode("magic-link");
                    setError(null);
                  }}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    loginMode === "magic-link"
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  Magic Link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode("password");
                    setError(null);
                  }}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    loginMode === "password"
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  Password
                </button>
              </div>

              {/* Email Sign-In Form */}
              {loginMode === "magic-link" ? (
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-50 disabled:text-neutral-500 text-neutral-900"
                    />
                  </div>

                  {error && (
                    <div className="p-4 rounded-md bg-error-50 border border-error-200 text-error-800 text-sm">
                      <div className="flex gap-2">
                        <svg className="w-5 h-5 text-error-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !email}
                    style={{
                      width: '100%',
                      backgroundColor: (isLoading || !email) ? '#bae6fd' : '#0284c7',
                      color: 'white',
                      fontWeight: '500',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      cursor: (isLoading || !email) ? 'not-allowed' : 'pointer',
                      opacity: (isLoading || !email) ? '0.5' : '1',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading && email) {
                        e.currentTarget.style.backgroundColor = '#0369a1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading && email) {
                        e.currentTarget.style.backgroundColor = '#0284c7';
                      }
                    }}
                  >
                    {isLoading ? "Sending link..." : "Send Magic Link"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handlePasswordSignIn} className="space-y-4">
                  <div>
                    <label htmlFor="email-password" className="block text-sm font-medium text-neutral-700 mb-2">
                      Email address
                    </label>
                    <input
                      id="email-password"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-50 disabled:text-neutral-500 text-neutral-900"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginMode("magic-link");
                          setError(null);
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-50 disabled:text-neutral-500 text-neutral-900"
                    />
                    <p className="text-xs text-neutral-600 mt-1">
                      Click "Forgot password?" to receive a magic link to reset your password
                    </p>
                  </div>

                  {error && (
                    <div className="p-4 rounded-md bg-error-50 border border-error-200 text-error-800 text-sm">
                      <div className="flex gap-2">
                        <svg className="w-5 h-5 text-error-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !email || !password}
                    style={{
                      width: '100%',
                      backgroundColor: (isLoading || !email || !password) ? '#bae6fd' : '#0284c7',
                      color: 'white',
                      fontWeight: '500',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      cursor: (isLoading || !email || !password) ? 'not-allowed' : 'pointer',
                      opacity: (isLoading || !email || !password) ? '0.5' : '1',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading && email && password) {
                        e.currentTarget.style.backgroundColor = '#0369a1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading && email && password) {
                        e.currentTarget.style.backgroundColor = '#0284c7';
                      }
                    }}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </button>
                </form>
              )}

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-neutral-500">Or continue with</span>
                </div>
              </div>

              {/* Google Sign-In Button */}
              <button
                onClick={() => signIn("google")}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-neutral-50 active:bg-neutral-100 text-neutral-900 font-medium py-3 px-4 rounded-md border border-neutral-300 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2"
              >
                <GoogleLogo />
                <span>Sign in with Google</span>
              </button>

              {/* Developer Bypass (Visible only in Dev/Preview) */}
              {showBypass && (
                <div className="border-t border-neutral-200 pt-4 mt-4">
                  <p className="text-xs text-neutral-500 mb-2 text-center">
                    Development Mode
                  </p>
                  <button
                    onClick={() => signIn("mock-login")}
                    className="w-full bg-neutral-800 hover:bg-neutral-900 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
                  >
                    Developer Login Bypass
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Sign Up Note */}
          {!emailSent && (
            <div className="mt-6 text-center">
              <p className="text-body-sm text-neutral-600">
                Don't have an account? Just enter your email to create one.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-caption text-neutral-500">
            © {new Date().getFullYear()} %%PROJECT_NAME%%. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  );
}
