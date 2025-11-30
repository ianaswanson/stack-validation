'use client';

import { useState, useEffect } from 'react';

interface TermsData {
  id: string;
  version: string;
  content: string;
  effectiveDate: Date;
}

interface TermsStatusResponse {
  needsAcceptance: boolean;
  currentTerms: TermsData;
}

export function useTermsStatus() {
  const [data, setData] = useState<TermsStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch('/api/terms/status')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch terms status');
        }
        return res.json();
      })
      .then((data) => {
        setData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setIsLoading(false);
      });
  }, []);

  const refetch = () => {
    setIsLoading(true);
    fetch('/api/terms/status')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch terms status');
        }
        return res.json();
      })
      .then((data) => {
        setData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setIsLoading(false);
      });
  };

  return { data, isLoading, error, refetch };
}

export function useAcceptTerms() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (
    { termsId }: { termsId: string },
    { onSuccess }: { onSuccess?: () => void } = {}
  ) => {
    setIsPending(true);
    setError(null);

    try {
      const res = await fetch('/api/terms/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ termsId }),
      });

      if (!res.ok) {
        throw new Error('Failed to accept terms');
      }

      const data = await res.json();

      if (data.success && onSuccess) {
        onSuccess();
      }

      setIsPending(false);
    } catch (err) {
      setError(err as Error);
      setIsPending(false);
      throw err;
    }
  };

  return { mutate, isPending, error };
}
