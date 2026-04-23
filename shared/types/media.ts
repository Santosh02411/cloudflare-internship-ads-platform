// Media types
export type MediaType = 'image' | 'video';

export interface Media {
  id: string;
  userId: string;
  filename: string;
  fileUrl: string;
  fileType: MediaType;
  fileSize: number;
  width?: number;
  height?: number;
  r2Key: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface MediaUploadResponse {
  id: string;
  fileUrl: string;
  filename: string;
  fileType: MediaType;
  fileSize: number;
}
