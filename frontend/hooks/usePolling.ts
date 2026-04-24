/**
 * Frontend usePolling Hook - Poll for status updates
 */

'use client';

import { useEffect, useState } from 'react';
import { publishAPI } from '../services/api';

interface StatusData {
  summary: any;
  platforms: any[];
  campaignName: string;
  [key: string]: any;
}

interface UsePollingReturn {
  status: StatusData | null;
  loading: boolean;
  error: string | null;
}

export function usePolling(campaignId: string | null, interval: number = 5000, enabled: boolean = true): UsePollingReturn {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !campaignId) {
      return;
    }

    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await publishAPI.getStatus(campaignId);
        setStatus(response.data.data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to fetch status');
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchStatus();

    // Then poll at interval
    const pollInterval = setInterval(fetchStatus, interval);

    return () => clearInterval(pollInterval);
  }, [campaignId, interval, enabled]);

  return { status, loading, error };
}

export default usePolling;
