"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AiCoachService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiCoachService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const prisma_service_1 = require("../../prisma.service");
const redis_service_1 = require("../../redis.service");
const config_1 = require("@nestjs/config");
const generative_ai_1 = require("@google/generative-ai");
const GROQ_MODEL = 'llama-3.3-70b-versatile';
let AiCoachService = AiCoachService_1 = class AiCoachService {
    prisma;
    redis;
    configService;
    logger = new common_1.Logger(AiCoachService_1.name);
    genAI = null;
    groqApiKey = '';
    disclaimer = '\n\n*Avertissement: Les informations fournies sont à titre éducatif et ne remplacent pas un avis médical.*';
    constructor(prisma, redis, configService) {
        this.prisma = prisma;
        this.redis = redis;
        this.configService = configService;
        this.groqApiKey = this.configService.get('GROQ_API_KEY', '');
        const apiKey = this.configService.get('GEMINI_API_KEY', '');
        if (apiKey) {
            this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        }
        if (!this.groqApiKey && !this.genAI) {
            this.logger.warn('Neither GROQ_API_KEY nor GEMINI_API_KEY is defined. AI Coach will operate in fallback mock mode.');
        }
    }
    async getChatHistory(userId) {
        return this.prisma.chatHistory.findMany({
            where: { userId: BigInt(userId) },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
    }
    async handleChatMessage(userId, userMessage) {
        const rateLimitKey = `rate:limit:ai:${userId}`;
        const currentCount = await this.redis.incr(rateLimitKey);
        if (currentCount !== null) {
            if (currentCount === 1) {
                await this.redis.expire(rateLimitKey, 3600);
            }
            if (currentCount > 15) {
                throw new common_1.BadRequestException('Rate limit exceeded. You can only send 15 messages per hour to the AI Coach.');
            }
        }
        const profile = await this.prisma.fitnessProfile.findUnique({
            where: { userId: BigInt(userId) },
        });
        const history = await this.prisma.chatHistory.findMany({
            where: { userId: BigInt(userId) },
            orderBy: { createdAt: 'desc' },
            take: 4,
        });
        const lowerMessage = userMessage.toLowerCase();
        let detectedLang = 'fr';
        if (lowerMessage.includes('شنوة') || lowerMessage.includes('ناخذ') || lowerMessage.includes('تعمل') || lowerMessage.includes('عيشك')) {
            detectedLang = 'ar';
        }
        else if (lowerMessage.includes('how') || lowerMessage.includes('protein') || lowerMessage.includes('need') || lowerMessage.includes('what')) {
            detectedLang = 'en';
        }
        let profileContext = 'User does not have a fitness profile set up yet.';
        if (profile) {
            profileContext = `
User Profile:
- Gender: ${profile.gender}
- Age: ${profile.age} years old
- Weight: ${profile.weight} kg
- Height: ${profile.height} cm
- Fitness Goal: ${profile.goal}
- Activity Level: ${profile.activityLevel}
- Workout Location: ${profile.trainingLocation}
- Target Calories: ${profile.dailyCalorieTarget} kcal/day
- Target Protein: ${profile.dailyProteinTarget} g/day
- Target Carbs: ${profile.dailyCarbsTarget} g/day
- Target Fats: ${profile.dailyFatTarget} g/day
- Target Water: ${profile.dailyWaterTarget} ml/day
      `;
        }
        const systemPrompt = `
You are the elite AI Fitness Coach representing Protein.tn, the leading sports nutrition and supplements store in Tunisia.
Your tone is athletic, encouraging, professional, and scientific.

${profileContext}

Instructions:
1. Detect user's language (English, French, or Tunisian Arabic) and respond in the EXACT same language and script. If they speak Tunisian Arabic (Derja in Latin characters or Arabic script), respond warmly in Derja.
2. Personalize your response based on the User Profile details provided above.
3. Suggest appropriate Protein.tn sports supplements when relevant to their question (e.g. Whey, Creatine, Gainer, Multivitamins). Explain *why* it helps their goal and direct them to purchase from Protein.tn.
4. Keep answers relatively concise and highly structured (bullet points work best).
5. Do NOT provide medical diagnoses.
`;
        let aiResponse = '';
        try {
            if (this.groqApiKey) {
                aiResponse = await this.callGroq(systemPrompt, history, userMessage);
            }
            else if (this.genAI) {
                aiResponse = await this.callGemini(systemPrompt, history, userMessage);
            }
            else {
                aiResponse = this.generateFallbackResponse(userMessage, profile, detectedLang);
            }
        }
        catch (err) {
            this.logger.error('AI provider call failed, using fallback coach response.', err);
            aiResponse = this.generateFallbackResponse(userMessage, profile, detectedLang);
        }
        aiResponse += this.disclaimer;
        await this.prisma.chatHistory.create({
            data: {
                userId: BigInt(userId),
                message: userMessage,
                response: aiResponse,
                lang: detectedLang,
            },
        });
        return {
            message: userMessage,
            response: aiResponse,
            lang: detectedLang,
        };
    }
    async callGroq(systemPrompt, history, userMessage) {
        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.reverse().flatMap((h) => [
                { role: 'user', content: h.message },
                { role: 'assistant', content: h.response },
            ]),
            { role: 'user', content: userMessage },
        ];
        const response = await axios_1.default.post('https://api.groq.com/openai/v1/chat/completions', {
            model: GROQ_MODEL,
            messages,
            temperature: 0.7,
            max_tokens: 1024,
        }, {
            headers: {
                Authorization: `Bearer ${this.groqApiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 20000,
        });
        return response.data.choices[0].message.content;
    }
    async callGemini(systemPrompt, history, userMessage) {
        const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const chatSession = model.startChat({
            history: history.reverse().flatMap((h) => [
                { role: 'user', parts: [{ text: h.message }] },
                { role: 'model', parts: [{ text: h.response }] },
            ]),
            systemInstruction: systemPrompt,
        });
        const result = await chatSession.sendMessage(userMessage);
        return result.response.text();
    }
    generateFallbackResponse(message, profile, lang) {
        const isWeightLoss = profile?.goal === 'weight_loss';
        if (lang === 'ar') {
            return `مرحباً بك! كمدربك الرياضي من Protein.tn، ننصحك بالتركيز على التغذية المتوازنة وشرب الماء.
${isWeightLoss ? 'لخسارة الوزن، ركز على بروتين كافي (Whey Protein) وعجز حراري.' : 'لزيادة العضلات، ننصحك بالواي بروتين والكرياتين (Creatine) من Protein.tn.'}
تأكد من إكمال تمارينك بانتظام ودائماً استشر طبيبك قبل البدء.`;
        }
        if (lang === 'en') {
            return `Hello! As your Protein.tn AI Coach, I suggest you stay consistent with your workout plan.
${isWeightLoss ? 'For weight loss, prioritize high protein intake (like Whey Isolate) and maintain a caloric deficit.' : 'For muscle gain, consider adding Whey Protein and Creatine from Protein.tn to support muscle growth and recovery.'}
Make sure you drink enough water and rest well.`;
        }
        return `Bonjour! En tant que coach Protein.tn, je vous conseille de rester régulier.
${isWeightLoss ? 'Pour perdre du poids, ciblez un déficit calorique et consommez suffisamment de protéines (Whey Isolate).' : 'Pour la prise de muscle, misez sur la Whey et la Créatine de Protein.tn pour optimiser la force et la récupération.'}
N'oubliez pas de bien vous hydrater et de vous reposer.`;
    }
};
exports.AiCoachService = AiCoachService;
exports.AiCoachService = AiCoachService = AiCoachService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        config_1.ConfigService])
], AiCoachService);
//# sourceMappingURL=ai-coach.service.js.map