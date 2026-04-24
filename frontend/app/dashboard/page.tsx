/**
 * Dashboard Page Component
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import useCampaigns from '@/hooks/useCampaigns';
import { FiPlus, FiTrash2, FiEdit2, FiCopy } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface Campaign {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  [key: string]: any;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, loading: authLoading } = useAuth();
  const { campaigns, create, delete: deleteCampaign, duplicate, isLoading } = useCampaigns();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleCreateCampaign = () => {
    router.push('/dashboard/campaign/create');
  };

  const handleEdit = (id: string) => {
    router.push(`/dashboard/campaign/${id}`);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      try {
        await deleteCampaign(id);
        toast.success('Campaign deleted successfully');
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete campaign');
      }
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicate(id);
      toast.success('Campaign duplicated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to duplicate campaign');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/platforms')}
              className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg"
            >
              Platforms
            </button>
            <span className="text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Create Button */}
        <div className="mb-8">
          <button
            onClick={handleCreateCampaign}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            <FiPlus /> Create Campaign
          </button>
        </div>

        {/* Campaigns List */}
        {isLoading ? (
          <div className="text-center py-8">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-600 mb-4">Create your first campaign to get started.</p>
            <button
              onClick={handleCreateCampaign}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              <FiPlus /> Create Campaign
            </button>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Campaigns</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {campaigns.map((campaign: Campaign) => (
                <div key={campaign.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{campaign.name}</h3>
                    <p className="text-sm text-gray-600">
                      Status: <span className="font-medium">{campaign.status}</span> • 
                      Created: {new Date(campaign.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(campaign.id)}
                      className="flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded text-sm"
                    >
                      <FiEdit2 /> Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(campaign.id)}
                      className="flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded text-sm"
                    >
                      <FiCopy /> Duplicate
                    </button>
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-sm"
                    >
                      <FiTrash2 /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
