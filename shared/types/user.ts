// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  expiresIn: number;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}
