/**
 * Create Campaign Page Component
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useCampaigns from '@/hooks/useCampaigns';
import toast from 'react-hot-toast';

const PLATFORMS = [
  { value: 'meta', label: 'Meta (Facebook/Instagram)' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'tiktok', label: 'TikTok Ads' },
  { value: 'linkedin', label: 'LinkedIn Ads' },
];

export default function CreateCampaignPage() {
  const router = useRouter();
  const { create } = useCampaigns();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    adCopy: '',
    platforms: [],
    budget: '',
    startDate: '',
    endDate: '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: checked
          ? [...prev[name], value]
          : prev[name].filter((p) => p !== value),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const campaignData = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
      };

      await create(campaignData);
      toast.success('Campaign created successfully!');
      router.push('/dashboard');
    } catch (error) {
      toast.error(error.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">Create Campaign</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campaign Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="My Awesome Campaign"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Campaign description"
                rows={3}
              />
            </div>

            {/* Ad Copy */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ad Copy *
              </label>
              <textarea
                name="adCopy"
                value={formData.adCopy}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Your ad copy here"
                rows={4}
              />
            </div>

            {/* Platforms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Platforms *
              </label>
              <div className="space-y-2">
                {PLATFORMS.map((platform) => (
                  <label key={platform.value} className="flex items-center">
                    <input
                      type="checkbox"
                      name="platforms"
                      value={platform.value}
                      checked={formData.platforms.includes(platform.value)}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2 text-gray-700">{platform.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget ($)
              </label>
              <input
                type="number"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="100"
                min="1"
                step="0.01"
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 rounded-lg transition"
              >
                {loading ? 'Creating...' : 'Create Campaign'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-2 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
