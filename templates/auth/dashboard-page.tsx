"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-body text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-h4 text-neutral-900">%%PROJECT_NAME%%</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => signOut()}
                className="text-body-sm text-neutral-600 hover:text-neutral-900 font-medium transition-colors"
              >
                Sign out
              </button>
              <div className="text-right">
                <p className="text-body-sm font-medium text-neutral-900">
                  {session.user?.name}
                </p>
                <p className="text-caption text-neutral-600">
                  {session.user?.email}
                </p>
              </div>
              {session.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="w-10 h-10 rounded-full border-2 border-neutral-200"
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg border border-neutral-200 p-8 shadow-sm">
          <h2 className="text-h2 text-neutral-900 mb-4">
            Welcome to your dashboard
          </h2>
          <p className="text-body text-neutral-600 mb-8">
            You're successfully authenticated. This is your protected dashboard area.
          </p>

          {/* Quick Stats / Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
              <h3 className="text-h5 text-primary-900 mb-2">Getting Started</h3>
              <p className="text-body-sm text-primary-700">
                Start building your application features here.
              </p>
            </div>
            <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-6">
              <h3 className="text-h5 text-secondary-900 mb-2">Documentation</h3>
              <p className="text-body-sm text-secondary-700">
                Check the README for setup instructions.
              </p>
            </div>
            <div className="bg-success-50 border border-success-200 rounded-lg p-6">
              <h3 className="text-h5 text-success-900 mb-2">Authentication</h3>
              <p className="text-body-sm text-success-700">
                OAuth is configured and working.
              </p>
            </div>
          </div>

          {/* User Info */}
          <div className="border-t border-neutral-200 pt-6">
            <h3 className="text-h5 text-neutral-900 mb-4">Session Information</h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-body-sm">
              <div>
                <dt className="font-medium text-neutral-700">Name</dt>
                <dd className="text-neutral-900 mt-1">{session.user?.name || "Not provided"}</dd>
              </div>
              <div>
                <dt className="font-medium text-neutral-700">Email</dt>
                <dd className="text-neutral-900 mt-1">{session.user?.email || "Not provided"}</dd>
              </div>
            </dl>
          </div>

          {/* Actions */}
          <div className="border-t border-neutral-200 pt-6 mt-6 flex gap-4">
            <button
              onClick={() => signOut()}
              className="bg-error-600 hover:bg-error-700 active:bg-error-800 text-white font-medium py-2.5 px-6 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2"
            >
              Sign out
            </button>
            <button
              onClick={() => router.push("/api/auth/session")}
              className="bg-neutral-200 hover:bg-neutral-300 active:bg-neutral-400 text-neutral-900 font-medium py-2.5 px-6 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2"
            >
              View Session JSON
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
