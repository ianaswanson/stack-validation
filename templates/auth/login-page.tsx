"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Import Google logo component
import { GoogleLogo } from "@/components/google-logo";

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Check for dev/preview environment (client-side)
  const isPreview = process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";
  const isDev = process.env.NODE_ENV === "development";
  const showBypass = isPreview || isDev;

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

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
          <div className="space-y-6">
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

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-body-sm text-neutral-600">
              Don't have an account?{" "}
              <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign up
              </a>
            </p>
          </div>
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
