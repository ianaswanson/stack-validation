'use client';

import React, { useState, useRef, useEffect } from 'react';
import { api } from '~/trpc/react';
import { TermsDisplay } from './TermsDisplay';

interface TermsModalProps {
  terms: {
    id: string;
    version: string;
    content: string;
    effectiveDate: Date;
  };
  onAccepted: () => void;
}

/**
 * Modal component for displaying and accepting terms of service
 * Features:
 * - Scroll detection to ensure user reads terms
 * - Explicit checkbox acknowledgment
 * - Loading states during acceptance
 * - Non-dismissible until accepted
 */
export function TermsModal({ terms, onAccepted }: TermsModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const acceptTermsMutation = api.terms.acceptTerms.useMutation({
    onSuccess: () => {
      onAccepted();
    },
    onError: (error) => {
      console.error('Failed to accept terms:', error);
      alert('Failed to accept terms. Please try again.');
    },
  });

  // Check if user has scrolled to bottom
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrolledToBottom =
      Math.abs(container.scrollHeight - container.scrollTop - container.clientHeight) < 10;

    if (scrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  // Check if content is short enough that scrolling isn't needed
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // If content fits without scrolling, auto-enable scroll requirement
    if (container.scrollHeight <= container.clientHeight) {
      setHasScrolledToBottom(true);
    }
  }, []);

  const handleAccept = () => {
    acceptTermsMutation.mutate({ termsId: terms.id });
  };

  const canAccept = hasScrolledToBottom && hasAcknowledged;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-2xl font-bold text-gray-900">Terms of Service</h2>
          <p className="mt-1 text-sm text-gray-600">
            Please read and accept our terms to continue
          </p>
        </div>

        {/* Scrollable Content */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-4"
        >
          <TermsDisplay
            content={terms.content}
            version={terms.version}
            effectiveDate={terms.effectiveDate}
          />
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          {!hasScrolledToBottom && (
            <p className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              ⬇ Please scroll to the bottom to continue
            </p>
          )}

          <div className="mb-4 flex items-start">
            <input
              type="checkbox"
              id="acknowledge"
              checked={hasAcknowledged}
              onChange={(e) => setHasAcknowledged(e.target.checked)}
              disabled={!hasScrolledToBottom}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <label
              htmlFor="acknowledge"
              className={`ml-3 text-sm ${
                !hasScrolledToBottom
                  ? 'cursor-not-allowed text-gray-400'
                  : 'cursor-pointer text-gray-700'
              }`}
            >
              I have read and agree to the Terms of Service
            </label>
          </div>

          <button
            onClick={handleAccept}
            disabled={!canAccept || acceptTermsMutation.isPending}
            className={`w-full rounded-lg px-4 py-2.5 font-medium transition-colors ${
              canAccept && !acceptTermsMutation.isPending
                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                : 'cursor-not-allowed bg-gray-300 text-gray-500'
            }`}
          >
            {acceptTermsMutation.isPending ? (
              <span className="flex items-center justify-center">
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Accepting...
              </span>
            ) : (
              'Accept Terms'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
