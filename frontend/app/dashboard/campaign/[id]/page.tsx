export const dynamic = 'force-static';
'use client';

import { useParams } from 'next/navigation';
import usePolling from '@/hooks/usePolling';
import { publishAPI } from '@/services/api';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { FiRefreshCw, FiXCircle } from 'react-icons/fi';

const PLATFORM_COLORS: Record<string, string> = {
  meta: 'bg-blue-50 border-blue-200',
  google_ads: 'bg-yellow-50 border-yellow-200',
  tiktok: 'bg-black/5 border-black/10',
  linkedin: 'bg-blue-50 border-blue-200',
};

const STATUS_COLORS: Record<string, string> = {
  success: 'text-green-600',
  failed: 'text-red-600',
  pending: 'text-yellow-600',
  retrying: 'text-orange-600',
};

export default function CampaignStatusPage() {
  const params = useParams();
  const id = params?.id as string;
  
  const { status, loading } = usePolling(id, 3000, true);
  const [retrying, setRetrying] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleRetry = async () => {
    if (!id) return;
    setRetrying(true);
    try {
      await publishAPI.publish(id);
      toast.success('Retry initiated');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to retry');
    } finally {
      setRetrying(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      toast.success('Campaign publishing cancelled');
    } catch (error) {
      toast.error('Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin mb-4 text-blue-600 flex justify-center">
            <FiRefreshCw size={32} />
          </div>
          <p>Loading campaign status...</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>No status data available</p>
      </div>
    );
  }

  const { summary, platforms, campaignName } = status;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">{campaignName}</h1>

          <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <h2 className="text-lg font-bold mb-4">Overall Progress</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span>{summary.overallProgress}% Complete</span>
                  <span className="text-sm text-gray-600">
                    {summary.success + summary.failed} / {summary.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${summary.overallProgress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="bg-white p-4 rounded">
                  <p className="text-2xl font-bold text-green-600">{summary.success}</p>
                  <p className="text-sm text-gray-600">Success</p>
                </div>
                <div className="bg-white p-4 rounded">
                  <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
                  <p className="text-sm text-gray-600">Failed</p>
                </div>
                <div className="bg-white p-4 rounded">
                  <p className="text-2xl font-bold text-yellow-600">{summary.pending}</p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
                <div className="bg-white p-4 rounded">
                  <p className="text-2xl font-bold text-blue-600">{summary.total}</p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
              </div>
            </div>
          </div>

          <h2 className="text-lg font-bold mb-4">Platform Status</h2>
          <div className="space-y-3">
            {platforms.map((platform: any) => (
              <div 
                key={platform.campaignPlatformId} 
                className={`border rounded-lg p-4 ${PLATFORM_COLORS[platform.platformType] || 'bg-gray-50 border-gray-200'}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-900 capitalize">
                      {platform.platformType.replace('_', ' ')}
                    </h3>
                    {platform.errorMessage && (
                      <p className="text-sm text-red-600 mt-1">{platform.errorMessage}</p>
                    )}
                  </div>
                  <span className={`font-bold ${STATUS_COLORS[platform.status] || 'text-gray-600'}`}>
                    {platform.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 mt-8">
            {summary.failed > 0 && (
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg"
              >
                <FiRefreshCw className={retrying ? 'animate-spin' : ''} /> 
                {retrying ? 'Retrying...' : 'Retry Failed'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}