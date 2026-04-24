/**
 * Frontend useCampaigns Hook - Manage campaigns
 */

'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { campaignAPI } from '../services/api';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

interface CampaignData {
  campaigns: Campaign[];
  total: number;
  [key: string]: any;
}

const fetcher = (): Promise<CampaignData> => campaignAPI.list().then((res) => res.data.data);

interface UseCampaignsReturn {
  campaigns: Campaign[];
  isLoading: boolean;
  error: any;
  create: (campaignData: any) => Promise<Campaign>;
  update: (id: string, updates: any) => Promise<Campaign>;
  delete: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<Campaign>;
  mutate: () => void;
}

export function useCampaigns(): UseCampaignsReturn {
  const { data, error, isLoading, mutate } = useSWR('/api/campaigns', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  const campaigns = data?.campaigns || [];

  const create = useCallback(
    async (campaignData: any): Promise<Campaign> => {
      try {
        const response = await campaignAPI.create(campaignData);
        mutate();
        return response.data.data;
      } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Failed to create campaign');
      }
    },
    [mutate]
  );

  const update = useCallback(
    async (id: string, updates: any): Promise<Campaign> => {
      try {
        const response = await campaignAPI.update(id, updates);
        mutate();
        return response.data.data;
      } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Failed to update campaign');
      }
    },
    [mutate]
  );

  const deleteCampaign = useCallback(
    async (id: string): Promise<void> => {
      try {
        await campaignAPI.delete(id);
        mutate();
      } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Failed to delete campaign');
      }
    },
    [mutate]
  );

  const duplicate = useCallback(
    async (id: string): Promise<Campaign> => {
      try {
        const response = await campaignAPI.duplicate(id);
        mutate();
        return response.data.data;
      } catch (error: any) {
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
