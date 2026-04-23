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

  const handleEdit = (id) => {
    router.push(`/dashboard/campaign/${id}`);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      try {
        await deleteCampaign(id);
        toast.success('Campaign deleted successfully');
      } catch (error) {
        toast.error(error.message || 'Failed to delete campaign');
      }
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await duplicate(id);
      toast.success('Campaign duplicated successfully');
    } catch (error) {
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

        {/* Campaigns Grid */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-900">Your Campaigns</h2>

          {isLoading ? (
            <div className="text-center py-12">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-600 mb-4">No campaigns yet</p>
              <button
                onClick={handleCreateCampaign}
                className="text-blue-600 hover:underline"
              >
                Create your first campaign
              </button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {campaign.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {campaign.description || campaign.adCopy}
                  </p>

                  <div className="mb-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        campaign.status === 'running'
                          ? 'bg-green-100 text-green-800'
                          : campaign.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(campaign.id)}
                      className="flex-1 flex items-center justify-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded transition"
                    >
                      <FiEdit2 size={16} /> Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(campaign.id)}
                      className="flex-1 flex items-center justify-center gap-1 bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded transition"
                    >
                      <FiCopy size={16} /> Duplicate
                    </button>
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="flex-1 flex items-center justify-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded transition"
                    >
                      <FiTrash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
