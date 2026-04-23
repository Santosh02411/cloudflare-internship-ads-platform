/**
 * Frontend usePolling Hook - Poll for status updates
 */

'use client';

import { useEffect, useState } from 'react';
import { publishAPI } from '../services/api';

export function usePolling(campaignId, interval = 5000, enabled = true) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      } catch (err) {
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
