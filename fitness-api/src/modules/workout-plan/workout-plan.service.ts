import { Injectable, BadRequestException, Logger, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import { RedisService } from '../../redis.service';

export interface WorkoutPlanExercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes: string;
}

export interface WorkoutPlanDay {
  dayNumber: number;
  label: string;
  muscleFocus: string;
  exercises: WorkoutPlanExercise[];
}

export interface WeeklyProgression {
  week: number;
  focus: string;
}

export interface GeneratedWorkoutPlan {
  programName: string;
  goal: string;
  daysPerWeek: number;
  days: WorkoutPlanDay[];
  weeklyProgression: WeeklyProgression[];
}

const PLAN_SYSTEM_PROMPT = `You are an expert strength & conditioning coach for the Protein.tn fitness app.
Design a complete, safe, effective workout split for the athlete described by the user, matching their goal and the exact number of training days per week they specify.

Guidance for choosing a split:
- 3 days/week: Full Body or Push/Pull/Legs
- 4 days/week: Upper/Lower split
- 5 days/week: Body-part split (e.g. Chest, Back, Legs, Shoulders, Arms)

Respond with ONLY a single valid JSON object, no markdown, no extra text, matching exactly this shape:
{
  "programName": string (short, motivating, in French),
  "goal": string (in French),
  "daysPerWeek": number,
  "days": [
    {
      "dayNumber": number (1-based),
      "label": string (e.g. "Jour 1 - Push (Poitrine, Épaules, Triceps)", in French),
      "muscleFocus": string (in French),
      "exercises": [
        { "name": string (in French), "sets": number, "reps": string (e.g. "8-12"), "restSeconds": number, "notes": string (short tip, in French, can be empty string) }
      ]
    }
  ],
  "weeklyProgression": [
    { "week": 1, "focus": string (1 sentence in French) },
    { "week": 2, "focus": string },
    { "week": 3, "focus": string },
    { "week": 4, "focus": string },
    { "week": 5, "focus": string (should be a deload/recovery week) }
  ]
}
Each day should have 5-7 exercises. The "days" array must have exactly as many entries as daysPerWeek.`;

@Injectable()
export class WorkoutPlanService {
  private readonly logger = new Logger(WorkoutPlanService.name);
  private groqApiKey = '';
  private readonly textModel = 'llama-3.3-70b-versatile';

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private configService: ConfigService,
  ) {
    this.groqApiKey = this.configService.get<string>('GROQ_API_KEY', '');
    if (!this.groqApiKey) {
      this.logger.warn('GROQ_API_KEY is not defined. Workout plan generation is unavailable until it is configured.');
    }
  }

  async generatePlan(userId: number, daysPerWeek: number): Promise<GeneratedWorkoutPlan> {
    // Rate limiting: max 10 generations per day per user
    const rateLimitKey = `rate:limit:workoutplan:${userId}`;
    const currentCount = await this.redis.incr(rateLimitKey);
    if (currentCount !== null) {
      if (currentCount === 1) {
        await this.redis.expire(rateLimitKey, 86400);
      }
      if (currentCount > 10) {
        throw new BadRequestException('Limite atteinte : 10 générations de programme par jour maximum.');
      }
    }

    if (!this.groqApiKey) {
      throw new ServiceUnavailableException(
        "La génération de programme n'est pas disponible pour le moment. Réessayez plus tard.",
      );
    }

    const profile = await this.prisma.fitnessProfile.findUnique({
      where: { userId: BigInt(userId) },
    });

    const profileContext = profile
      ? `
Athlete profile:
- Gender: ${profile.gender}
- Age: ${profile.age} years old
- Weight: ${profile.weight} kg
- Height: ${profile.height} cm
- Goal: ${profile.goal}
- Current activity level: ${profile.activityLevel}
- Training location: ${profile.trainingLocation}
- Experience level: ${profile.experienceLevel}
`
      : 'No fitness profile on file yet — design a balanced, moderate-intensity program suitable for a general adult beginner/intermediate.';

    const userText = `${profileContext}\nGenerate a ${daysPerWeek}-day-per-week workout program for this athlete.`;

    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: this.textModel,
          messages: [
            { role: 'system', content: PLAN_SYSTEM_PROMPT },
            { role: 'user', content: userText },
          ],
          temperature: 0.5,
          max_tokens: 3000,
        },
        {
          headers: {
            Authorization: `Bearer ${this.groqApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 45000,
        },
      );

      const rawContent: string = response.data.choices[0].message.content;
      return this.parsePlan(rawContent, daysPerWeek);
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      const status = err?.response?.status;
      const groqMessage = err?.response?.data?.error?.message || err.message;
      this.logger.error(`Groq call failed for workout plan generation (status=${status}): ${groqMessage}`);
      throw new ServiceUnavailableException(
        'Impossible de générer votre programme pour le moment. Réessayez.',
      );
    }
  }

  private parsePlan(rawContent: string, daysPerWeek: number): GeneratedWorkoutPlan {
    const cleaned = rawContent.replace(/```json|```/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      this.logger.error('Failed to parse workout plan JSON response.', cleaned);
      throw new ServiceUnavailableException('Réponse de génération invalide. Réessayez.');
    }

    const days: WorkoutPlanDay[] = Array.isArray(parsed.days)
      ? parsed.days.map((d: any, idx: number) => ({
          dayNumber: Number(d.dayNumber) || idx + 1,
          label: String(d.label || `Jour ${idx + 1}`),
          muscleFocus: String(d.muscleFocus || ''),
          exercises: Array.isArray(d.exercises)
            ? d.exercises.map((ex: any) => ({
                name: String(ex.name || 'Exercice'),
                sets: Math.max(1, Math.round(Number(ex.sets) || 3)),
                reps: String(ex.reps || '8-12'),
                restSeconds: Math.max(15, Math.round(Number(ex.restSeconds) || 60)),
                notes: String(ex.notes || ''),
              }))
            : [],
        }))
      : [];

    const weeklyProgression: WeeklyProgression[] = Array.isArray(parsed.weeklyProgression)
      ? parsed.weeklyProgression.map((w: any, idx: number) => ({
          week: Number(w.week) || idx + 1,
          focus: String(w.focus || ''),
        }))
      : [];

    return {
      programName: String(parsed.programName || 'Mon Programme'),
      goal: String(parsed.goal || ''),
      daysPerWeek,
      days,
      weeklyProgression,
    };
  }
}
