/**
 * Frontend useCampaigns Hook - Manage campaigns
 */

'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { campaignAPI } from '../services/api';

const fetcher = (url) => campaignAPI.list().then((res) => res.data.data);

export function useCampaigns() {
  const { data, error, isLoading, mutate } = useSWR('/api/campaigns', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  const campaigns = data?.campaigns || [];

  const create = useCallback(
    async (campaignData) => {
      try {
        const response = await campaignAPI.create(campaignData);
        mutate();
        return response.data.data;
      } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to create campaign');
      }
    },
    [mutate]
  );

  const update = useCallback(
    async (id, updates) => {
      try {
        const response = await campaignAPI.update(id, updates);
        mutate();
        return response.data.data;
      } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to update campaign');
      }
    },
    [mutate]
  );

  const deleteCampaign = useCallback(
    async (id) => {
      try {
        await campaignAPI.delete(id);
        mutate();
      } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to delete campaign');
      }
    },
    [mutate]
  );

  const duplicate = useCallback(
    async (id) => {
      try {
        const response = await campaignAPI.duplicate(id);
        mutate();
        return response.data.data;
      } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to duplicate campaign');
      }
    },
    [mutate]
  );

  return {
    campaigns,
    isLoading,
    error,
    create,
    update,
    delete: deleteCampaign,
    duplicate,
    mutate,
  };
}

export default useCampaigns;
