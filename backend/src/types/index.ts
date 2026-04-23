// Backend-specific types
import { PlatformType } from '../../../shared/types/platform';

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: any[]): Promise<any[]>;
}

export interface D1PreparedStatement {
  bind(...args: any[]): D1PreparedStatement;
  all(): Promise<D1Result>;
  first(): Promise<any>;
  run(): Promise<D1Result>;
}

export interface D1Result {
  success: boolean;
  meta: {
    duration: number;
    last_row_id?: number;
    changes?: number;
    served_by?: string;
    internal_stats?: string;
  };
  results?: any[];
}

export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: KVPutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: KVListOptions): Promise<KVListResult>;
}

export interface KVPutOptions {
  expirationTtl?: number;
  metadata?: Record<string, string>;
}

export interface KVListOptions {
  limit?: number;
  prefix?: string;
  cursor?: string;
}

export interface KVListResult {
  keys: Array<{ name: string; metadata?: Record<string, string> }>;
  list_complete: boolean;
  cursor?: string;
}

export interface R2Bucket {
  get(key: string): Promise<R2Object | null>;
  put(key: string, value: any, options?: R2PutOptions): Promise<R2Object>;
  delete(key: string): Promise<void>;
  list(options?: R2ListOptions): Promise<R2ListResult>;
}

export interface R2Object {
  key: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  httpMetadata?: R2HttpMetadata;
  customMetadata?: Record<string, string>;
}

export interface R2PutOptions {
  httpMetadata?: R2HttpMetadata;
  customMetadata?: Record<string, string>;
}

export interface R2HttpMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
}

export interface R2ListOptions {
  limit?: number;
  prefix?: string;
  cursor?: string;
}

export interface R2ListResult {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
}

export interface Queue<T = any> {
  send(message: T): Promise<void>;
  sendBatch(messages: Array<{ body: T }>): Promise<void>;
}

export interface DurableObject {
  fetch(request: Request): Promise<Response>;
  alarm?(): Promise<void>;
}

export interface DurableObjectStub {
  fetch(request: Request): Promise<Response>;
  getAlarm(): Promise<number | null>;
  setAlarm(alarmTime: number): Promise<void>;
}

export interface CloudflareContext {
  env: {
    DB: D1Database;
    CACHE: KVNamespace;
    MEDIA_BUCKET: R2Bucket;
    PUBLISH_QUEUE: Queue;
    CAMPAIGN_ORCHESTRATOR: DurableObjectNamespace;
    JWT_SECRET: string;
    OPENAI_API_KEY: string;
  };
  ctx: ExecutionContext;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export interface DurableObjectNamespace {
  get(id: string): DurableObjectStub;
  newId(): string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}
