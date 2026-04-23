export interface ValidationError {
  field: string;
  message: string;
}

export class ValidationResult {
  errors: ValidationError[] = [];

  isValid(): boolean {
    return this.errors.length === 0;
  }

  addError(field: string, message: string): void {
    this.errors.push({ field, message });
  }

  getErrors(): ValidationError[] {
    return this.errors;
  }
}

export function validateEmail(email: string): ValidationResult {
  const result = new ValidationResult();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
    result.addError('email', 'Invalid email format');
  }

  return result;
}

export function validatePassword(password: string): ValidationResult {
  const result = new ValidationResult();

  if (!password || password.length < 8) {
    result.addError('password', 'Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    result.addError('password', 'Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    result.addError('password', 'Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    result.addError('password', 'Password must contain at least one number');
  }

  return result;
}

export function validateCampaignName(name: string): ValidationResult {
  const result = new ValidationResult();

  if (!name || name.trim().length === 0) {
    result.addError('name', 'Campaign name is required');
  }

  if (name.length > 255) {
    result.addError('name', 'Campaign name must not exceed 255 characters');
  }

  return result;
}

export function validateAdCopy(adCopy: string): ValidationResult {
  const result = new ValidationResult();

  if (!adCopy || adCopy.trim().length === 0) {
    result.addError('adCopy', 'Ad copy is required');
  }

  if (adCopy.length > 5000) {
    result.addError('adCopy', 'Ad copy must not exceed 5000 characters');
  }

  return result;
}

export function validateBudget(budget: number): ValidationResult {
  const result = new ValidationResult();

  if (budget < 1) {
    result.addError('budget', 'Budget must be at least 1');
  }

  if (budget > 1000000) {
    result.addError('budget', 'Budget cannot exceed 1,000,000');
  }

  return result;
}

export function validatePlatforms(platforms: string[]): ValidationResult {
  const result = new ValidationResult();
  const validPlatforms = ['meta', 'google_ads', 'tiktok', 'linkedin'];

  if (!platforms || platforms.length === 0) {
    result.addError('platforms', 'At least one platform must be selected');
  }

  for (const platform of platforms) {
    if (!validPlatforms.includes(platform)) {
      result.addError('platforms', `Invalid platform: ${platform}`);
    }
  }

  return result;
}

export function validateMediaUrl(url: string): ValidationResult {
  const result = new ValidationResult();

  try {
    new URL(url);
  } catch {
    result.addError('mediaUrl', 'Invalid media URL');
  }

  return result;
}

export function mergeValidationResults(...results: ValidationResult[]): ValidationResult {
  const merged = new ValidationResult();

  for (const result of results) {
    merged.errors.push(...result.errors);
  }

  return merged;
}
