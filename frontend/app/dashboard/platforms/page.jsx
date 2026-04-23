/**
 * Platforms Management Page
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiLink2, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuth from '@/hooks/useAuth';
import { platformAPI } from '@/services/api';

const PLATFORM_CARDS = [
  {
    key: 'instagram',
    label: 'Instagram',
    connectType: 'meta',
    connectLabel: 'Connect Instagram',
    disconnectLabel: 'Disconnect Instagram',
    helperText: 'Uses your Meta connection.',
  },
  {
    key: 'google_ads',
    label: 'Google Ads',
    connectType: 'google_ads',
    connectLabel: 'Connect Google Ads',
    disconnectLabel: 'Disconnect Google Ads',
    helperText: '',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    connectType: 'meta',
    connectLabel: 'Connect Facebook',
    disconnectLabel: 'Disconnect Facebook',
    helperText: 'Uses your Meta connection.',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn Ads',
    connectType: 'linkedin',
    connectLabel: 'Connect LinkedIn',
    disconnectLabel: 'Disconnect LinkedIn',
    helperText: '',
  },
];

export default function PlatformsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingType, setActionLoadingType] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const loadPlatforms = async () => {
    setLoading(true);
    try {
      const response = await platformAPI.list();
      setPlatforms(response.data?.data?.platforms || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load platforms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadPlatforms();
    }
  }, [isAuthenticated]);

  const platformConnectionMap = useMemo(() => {
    const map = {};
    for (const platform of platforms) {
      map[platform.platformType] = platform;
    }
    return map;
  }, [platforms]);

  const handleConnect = async (connectType, label) => {
    setActionLoadingType(connectType);
    try {
      await platformAPI.connect(
        connectType,
        `manual_connect_${Date.now()}`,
        window.location.origin + '/dashboard/platforms'
      );
      toast.success(`${label} connected successfully`);
      await loadPlatforms();
    } catch (error) {
      toast.error(error.response?.data?.error || `Failed to connect ${label}`);
    } finally {
      setActionLoadingType('');
    }
  };

  const handleDisconnect = async (connectType, label) => {
    setActionLoadingType(connectType);
    try {
      await platformAPI.disconnect(connectType);
      toast.success(`${label} disconnected successfully`);
      await loadPlatforms();
    } catch (error) {
      toast.error(error.response?.data?.error || `Failed to disconnect ${label}`);
    } finally {
      setActionLoadingType('');
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platforms</h1>
            <p className="text-sm text-gray-600">Connect ad platforms before creating campaigns.</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 text-sm text-gray-600">Signed in as {user?.email}</div>

        <div className="mb-4">
          <button
            onClick={loadPlatforms}
            disabled={loading || Boolean(actionLoadingType)}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 text-gray-800 px-4 py-2 rounded-lg"
          >
            <FiRefreshCw /> Refresh All
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {PLATFORM_CARDS.map((platformCard) => {
            const connection = platformConnectionMap[platformCard.connectType];
            const isConnected = Boolean(connection?.isActive);
            const isActionLoading = actionLoadingType === platformCard.connectType;

            return (
              <div key={platformCard.key} className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-col gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{platformCard.label}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {loading
                        ? 'Checking connection status...'
                        : isConnected
                        ? 'Connected and active'
                        : 'Not connected'}
                    </p>
                    {platformCard.helperText ? (
                      <p className="text-xs text-gray-500 mt-1">{platformCard.helperText}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isConnected ? (
                      <button
                        onClick={() => handleDisconnect(platformCard.connectType, platformCard.label)}
                        disabled={loading || isActionLoading}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
                      >
                        <FiTrash2 /> {platformCard.disconnectLabel}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(platformCard.connectType, platformCard.label)}
                        disabled={loading || isActionLoading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
                      >
                        <FiLink2 /> {platformCard.connectLabel}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
