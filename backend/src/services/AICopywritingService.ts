/**
 * AI Copywriting Service using Cloudflare Workers AI (Llama-3)
 * Professional Cloudflare internship standards with proper error handling
 */

// Cloudflare Environment interface
interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  MEDIA_BUCKET: R2Bucket;
  PUBLISH_QUEUE: Queue<any>;
  JWT_SECRET?: string;
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  AI: any; // Cloudflare Workers AI binding
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...args: any[]): D1PreparedStatement;
  first(): Promise<any>;
  run(): Promise<any>;
  all(): Promise<any[]>;
}

export interface CopywritingRequest {
  campaignTitle: string;
  productDescription?: string;
  targetAudience?: string;
  budget?: number;
  platform?: string;
  tone?: 'professional' | 'casual' | 'urgent' | 'friendly' | 'luxury';
  contentType: 'headline' | 'description' | 'cta' | 'all';
}

export interface CopywritingResponse {
  headlines?: string[];
  descriptions?: string[];
  ctas?: string[];
  suggestions?: string[];
  usage?: {
    model: string;
    tokensUsed: number;
    processingTime: number;
  };
}

export interface AIContent {
  id: string;
  userId: string;
  campaignId?: string;
  contentType: 'headline' | 'description' | 'cta';
  input: CopywritingRequest;
  output: CopywritingResponse;
  createdAt: Date;
}

export class AICopywritingService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Generate ad copy using Cloudflare Workers AI
   */
  async generateCopy(request: CopywritingRequest, userId: string, campaignId?: string): Promise<CopywritingResponse> {
    const startTime = Date.now();

    try {
      // Validate request
      const validation = this.validateRequest(request);
      if (!validation.isValid) {
        throw new Error(`Invalid request: ${validation.errors.join(', ')}`);
      }

      // Build prompt based on content type
      const prompt = this.buildPrompt(request);
      
      // Call Cloudflare Workers AI
      const aiResponse = await this.callWorkersAI(prompt);
      
      // Parse response based on content type
      const response = this.parseAIResponse(aiResponse, request.contentType);
      
      // Save to database
      await this.saveToDatabase(request, response, userId, campaignId);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`[AI] Generated ${request.contentType} copy in ${processingTime}ms`);
      
      return {
        ...response,
        usage: {
          model: 'llama-3-8b',
          tokensUsed: this.estimateTokens(prompt),
          processingTime,
        },
      };
    } catch (error) {
      console.error('[AI] Copy generation failed:', error);
      throw new Error(`AI copywriting failed: ${error}`);
    }
  }

  /**
   * Generate multiple variations of ad copy
   */
  async generateVariations(
    request: CopywritingRequest, 
    variations: number = 3,
    userId: string,
    campaignId?: string
  ): Promise<CopywritingResponse[]> {
    const results: CopywritingResponse[] = [];
    
    for (let i = 0; i < variations; i++) {
      const variationRequest = {
        ...request,
        // Add variation context
        productDescription: `${request.productDescription || ''} (Variation ${i + 1})`,
      };
      
      const result = await this.generateCopy(variationRequest, userId, campaignId);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Get AI-generated content history for user
   */
  async getUserHistory(userId: string, limit: number = 10): Promise<AIContent[]> {
    try {
      const results = await this.env.DB.prepare(`
        SELECT * FROM ai_generated_content 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `).bind(userId, limit).all();

      return results.map(row => ({
        id: row.id,
        userId: row.user_id,
        campaignId: row.campaign_id,
        contentType: row.content_type,
        input: JSON.parse(row.input_data),
        output: JSON.parse(row.generated_content),
        createdAt: new Date(row.created_at),
      }));
    } catch (error) {
      console.error('[AI] Failed to get user history:', error);
      return [];
    }
  }

  /**
   * Get AI usage statistics for user
   */
  async getUserUsage(userId: string, period: 'day' | 'week' | 'month' = 'month'): Promise<{
    totalRequests: number;
    totalTokens: number;
    averageTokensPerRequest: number;
  }> {
    try {
      let timeFilter = '';
      const now = new Date();
      
      switch (period) {
        case 'day':
          timeFilter = `AND created_at >= DATE('now', '-1 day')`;
          break;
        case 'week':
          timeFilter = `AND created_at >= DATE('now', '-7 days')`;
          break;
        case 'month':
          timeFilter = `AND created_at >= DATE('now', '-1 month')`;
          break;
      }

      const result = await this.env.DB.prepare(`
        SELECT 
          COUNT(*) as total_requests,
          SUM(tokens_used) as total_tokens
        FROM ai_generated_content 
        WHERE user_id = ? ${timeFilter}
      `).bind(userId).first();

      const totalRequests = result.total_requests || 0;
      const totalTokens = result.total_tokens || 0;

      return {
        totalRequests,
        totalTokens,
        averageTokensPerRequest: totalRequests > 0 ? totalTokens / totalRequests : 0,
      };
    } catch (error) {
      console.error('[AI] Failed to get user usage:', error);
      return {
        totalRequests: 0,
        totalTokens: 0,
        averageTokensPerRequest: 0,
      };
    }
  }

  /**
   * Validate copywriting request
   */
  private validateRequest(request: CopywritingRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.campaignTitle || request.campaignTitle.trim().length === 0) {
      errors.push('Campaign title is required');
    }

    if (request.campaignTitle.length > 100) {
      errors.push('Campaign title must be 100 characters or less');
    }

    if (request.productDescription && request.productDescription.length > 500) {
      errors.push('Product description must be 500 characters or less');
    }

    if (request.targetAudience && request.targetAudience.length > 200) {
      errors.push('Target audience must be 200 characters or less');
    }

    if (request.budget && (request.budget < 1 || request.budget > 100000)) {
      errors.push('Budget must be between $1 and $100,000');
    }

    if (!['headline', 'description', 'cta', 'all'].includes(request.contentType)) {
      errors.push('Content type must be headline, description, cta, or all');
    }

    if (request.tone && !['professional', 'casual', 'urgent', 'friendly', 'luxury'].includes(request.tone)) {
      errors.push('Tone must be professional, casual, urgent, friendly, or luxury');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Build AI prompt based on request
   */
  private buildPrompt(request: CopywritingRequest): string {
    const basePrompt = `You are an expert copywriter specializing in digital advertising campaigns.`;

    let contextPrompt = `
Campaign: ${request.campaignTitle}
Product: ${request.productDescription || 'Not specified'}
Target Audience: ${request.targetAudience || 'General audience'}
Budget: $${request.budget || 'Not specified'}
Platform: ${request.platform || 'Multiple platforms'}
Tone: ${request.tone || 'Professional'}
`;

    let taskPrompt = '';

    switch (request.contentType) {
      case 'headline':
        taskPrompt = `
Generate 5 compelling ad headlines for this campaign. Each headline should:
- Be under 60 characters for optimal display
- Include a clear value proposition
- Match the specified tone
- Be platform-optimized for social media

Return as a JSON array of strings: ["headline1", "headline2", ...]`;
        break;

      case 'description':
        taskPrompt = `
Generate 3 engaging ad descriptions for this campaign. Each description should:
- Be 100-150 characters for social media
- Highlight key benefits and features
- Include a clear call-to-action hint
- Match the specified tone
- Be optimized for the target audience

Return as a JSON array of strings: ["description1", "description2", ...]`;
        break;

      case 'cta':
        taskPrompt = `
Generate 4 compelling call-to-action phrases for this campaign. Each CTA should:
- Be action-oriented and urgent
- Be 2-5 words long
- Match the specified tone
- Create immediate response
- Work well with the campaign type

Return as a JSON array of strings: ["cta1", "cta2", ...]`;
        break;

      case 'all':
        taskPrompt = `
Generate complete ad copy for this campaign including:
1. 3 headlines (under 60 characters each)
2. 2 descriptions (100-150 characters each)
3. 4 call-to-action phrases (2-5 words each)

All content should:
- Match the ${request.tone || 'professional'} tone
- Target ${request.targetAudience || 'general audience'}
- Be optimized for ${request.platform || 'social media'} platforms
- Include clear value propositions

Return as JSON: {
  "headlines": ["headline1", "headline2", "headline3"],
  "descriptions": ["description1", "description2"],
  "ctas": ["cta1", "cta2", "cta3", "cta4"],
  "suggestions": ["tip1", "tip2", "tip3"]
}`;
        break;
    }

    return `${basePrompt}\n\n${contextPrompt}\n\n${taskPrompt}`;
  }

  /**
   * Call Cloudflare Workers AI API
   */
  private async callWorkersAI(prompt: string): Promise<any> {
    try {
      const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          {
            role: 'system',
            content: 'You are an expert advertising copywriter. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      return response;
    } catch (error) {
      console.error('[AI] Workers AI call failed:', error);
      throw new Error(`AI service unavailable: ${error}`);
    }
  }

  /**
   * Parse AI response based on content type
   */
  private parseAIResponse(aiResponse: any, contentType: string): CopywritingResponse {
    try {
      const content = aiResponse?.response || '';
      
      // Try to parse as JSON
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        // If JSON parsing fails, extract from text
        parsed = this.extractJSONFromText(content);
      }

      switch (contentType) {
        case 'headline':
          return {
            headlines: Array.isArray(parsed) ? parsed : [content],
          };

        case 'description':
          return {
            descriptions: Array.isArray(parsed) ? parsed : [content],
          };

        case 'cta':
          return {
            ctas: Array.isArray(parsed) ? parsed : [content],
          };

        case 'all':
          return {
            headlines: parsed.headlines || [],
            descriptions: parsed.descriptions || [],
            ctas: parsed.ctas || [],
            suggestions: parsed.suggestions || [],
          };

        default:
          return {
            suggestions: [content],
          };
      }
    } catch (error) {
      console.error('[AI] Failed to parse AI response:', error);
      return {
        suggestions: ['Failed to generate content. Please try again.'],
      };
    }
  }

  /**
   * Extract JSON from AI response text
   */
  private extractJSONFromText(text: string): any {
    // Look for JSON blocks in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Fallback: try to extract arrays
        const headlines = text.match(/"([^"]{10,60})"/g) || [];
        const descriptions = text.match(/"([^"]{100,150})"/g) || [];
        const ctas = text.match(/"([^"]{2,15})"/g) || [];
        
        return {
          headlines,
          descriptions,
          ctas,
        };
      }
    }
    
    return {};
  }

  /**
   * Estimate token count for prompt
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Save generated content to database
   */
  private async saveToDatabase(
    request: CopywritingRequest,
    response: CopywritingResponse,
    userId: string,
    campaignId?: string
  ): Promise<void> {
    try {
      await this.env.DB.prepare(`
        INSERT INTO ai_generated_content (
          id, user_id, campaign_id, content_type, input_data, 
          generated_content, model_used, tokens_used, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        crypto.randomUUID(),
        userId,
        campaignId || null,
        request.contentType,
        JSON.stringify(request),
        JSON.stringify(response),
        'llama-3-8b',
        this.estimateTokens(this.buildPrompt(request))
      ).run();

      console.log(`[AI] Saved generated content for user ${userId}`);
    } catch (error) {
      console.error('[AI] Failed to save to database:', error);
      // Don't throw - the AI content was still generated
    }
  }
}
