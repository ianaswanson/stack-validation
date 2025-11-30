'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { api } from '~/trpc/react';
import { TermsModal } from './TermsModal';

interface TermsGateProps {
  children: React.ReactNode;
}

/**
 * Gate component that enforces terms acceptance before allowing access to content
 * Usage: Wrap any protected content with this component
 *
 * Example:
 * ```tsx
 * <TermsGate>
 *   <Dashboard />
 * </TermsGate>
 * ```
 */
export function TermsGate({ children }: TermsGateProps) {
  const router = useRouter();
  const { data: termsStatus, isLoading, error } = api.terms.getCurrentTermsStatus.useQuery();

  const handleAccepted = () => {
    // Refresh the page to update the session and re-check terms status
    router.refresh();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm">
          <div className="mb-4 text-red-600">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">
            Unable to Load Terms
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            {error.message || 'An error occurred while loading the terms of service.'}
          </p>
          <button
            onClick={() => router.refresh()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show terms modal if user needs to accept
  if (termsStatus?.needsAcceptance && termsStatus.currentTerms) {
    return (
      <TermsModal
        terms={termsStatus.currentTerms}
        onAccepted={handleAccepted}
      />
    );
  }

  // User has accepted terms, render children
  return <>{children}</>;
}
