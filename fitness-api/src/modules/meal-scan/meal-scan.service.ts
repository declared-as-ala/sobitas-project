import { Injectable, BadRequestException, Logger, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis.service';

export interface MealScanResult {
  mealName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: 'low' | 'medium' | 'high';
  notes: string;
}

const VISION_SYSTEM_PROMPT = `You are a nutrition estimation expert for the Protein.tn fitness app.
Look at the meal photo and estimate its nutritional content as best you can from visual portion size cues.

Respond with ONLY a single valid JSON object, no markdown, no extra text, matching exactly this shape:
{
  "mealName": string (short name of the dish, in French),
  "calories": number (kcal, whole number),
  "protein": number (grams, whole number),
  "carbs": number (grams, whole number),
  "fat": number (grams, whole number),
  "confidence": "low" | "medium" | "high",
  "notes": string (1 short sentence in French with a tip or caveat about the estimate)
}
If the image does not clearly show food, set mealName to "Repas non identifié", all macros to 0, confidence to "low", and explain briefly in notes.`;

@Injectable()
export class MealScanService {
  private readonly logger = new Logger(MealScanService.name);
  private groqApiKey = '';
  private readonly visionModel: string;

  constructor(
    private redis: RedisService,
    private configService: ConfigService,
  ) {
    this.groqApiKey = this.configService.get<string>('GROQ_API_KEY', '');
    // "llama-3.2-*-vision-preview" models were retired by Groq; llama-4-scout is natively multimodal and current as of writing.
    this.visionModel = this.configService.get<string>(
      'GROQ_VISION_MODEL',
      'meta-llama/llama-4-scout-17b-16e-instruct',
    );

    if (!this.groqApiKey) {
      this.logger.warn('GROQ_API_KEY is not defined. Meal scanning is unavailable until it is configured.');
    }
  }

  async scanMeal(userId: number, imageBase64: string, mimeType: string, note?: string): Promise<MealScanResult> {
    // Rate limiting: max 20 scans per hour per user
    const rateLimitKey = `rate:limit:mealscan:${userId}`;
    const currentCount = await this.redis.incr(rateLimitKey);
    if (currentCount !== null) {
      if (currentCount === 1) {
        await this.redis.expire(rateLimitKey, 3600);
      }
      if (currentCount > 20) {
        throw new BadRequestException('Limite atteinte : 20 scans de repas par heure maximum.');
      }
    }

    if (!this.groqApiKey) {
      throw new ServiceUnavailableException(
        "L'analyse de repas n'est pas disponible pour le moment. Réessayez plus tard.",
      );
    }

    const userText = note?.trim()
      ? `Analyse ce repas. Contexte additionnel fourni par l'utilisateur : ${note.trim()}`
      : 'Analyse ce repas et estime ses valeurs nutritionnelles.';

    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: this.visionModel,
          messages: [
            { role: 'system', content: VISION_SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                { type: 'text', text: userText },
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
              ],
            },
          ],
          temperature: 0.3,
          max_tokens: 400,
        },
        {
          headers: {
            Authorization: `Bearer ${this.groqApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const rawContent: string = response.data.choices[0].message.content;
      return this.parseResult(rawContent);
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      const status = err?.response?.status;
      const groqMessage = err?.response?.data?.error?.message || err.message;
      this.logger.error(
        `Groq vision call failed for meal scan (model=${this.visionModel}, status=${status}): ${groqMessage}`,
      );
      throw new ServiceUnavailableException(
        "Impossible d'analyser cette photo pour le moment. Réessayez avec une autre photo.",
      );
    }
  }

  private parseResult(rawContent: string): MealScanResult {
    // Model sometimes wraps JSON in markdown fences despite instructions — strip them defensively.
    const cleaned = rawContent.replace(/```json|```/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      this.logger.error('Failed to parse meal scan JSON response.', cleaned);
      throw new ServiceUnavailableException("Réponse de l'analyse invalide. Réessayez.");
    }

    return {
      mealName: String(parsed.mealName || 'Repas non identifié'),
      calories: Math.max(0, Math.round(Number(parsed.calories) || 0)),
      protein: Math.max(0, Math.round(Number(parsed.protein) || 0)),
      carbs: Math.max(0, Math.round(Number(parsed.carbs) || 0)),
      fat: Math.max(0, Math.round(Number(parsed.fat) || 0)),
      confidence: ['low', 'medium', 'high'].includes(parsed.confidence) ? parsed.confidence : 'low',
      notes: String(parsed.notes || ''),
    };
  }
}
