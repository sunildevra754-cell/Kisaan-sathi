
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { FarmerProfile, Language } from "../types";
import { CacheService } from "../utils/cacheService";

const activeRequests = new Map<string, Promise<any>>();
let globalCooldownUntil = 0;

async function executeSecureRequest<T>(fn: () => Promise<T>, cacheKey?: string, maxRetries = 2): Promise<T> {
  if (cacheKey) {
    const cached = CacheService.get(cacheKey);
    if (cached) return cached;
  }

  if (cacheKey && activeRequests.has(cacheKey)) {
    return activeRequests.get(cacheKey);
  }

  if (Date.now() < globalCooldownUntil) {
    throw new Error("COOLDOWN_ACTIVE");
  }

  const execution = (async () => {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await fn();
        if (cacheKey && result) {
          CacheService.set(cacheKey, result, 4);
        }
        return result;
      } catch (error: any) {
        lastError = error;
        const msg = (error?.message || JSON.stringify(error)).toLowerCase();
        const isRateLimit = msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted');
        if (isRateLimit) {
          globalCooldownUntil = Date.now() + 60000; 
          if (i < maxRetries - 1) {
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
        }
        throw error;
      }
    }
    throw lastError;
  })();

  if (cacheKey) {
    activeRequests.set(cacheKey, execution);
    execution.finally(() => activeRequests.delete(cacheKey));
  }

  return execution;
}

/**
 * HIGH QUALITY AI VOICE (TTS)
 * Generates natural sounding audio for a given text using Gemini TTS.
 */
export const generateSpeech = async (text: string, lang: Language): Promise<string> => {
  return executeSecureRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read this weather and agriculture report naturally in ${lang === 'hi' ? 'Hindi' : 'English'}: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: lang === 'hi' ? 'Kore' : 'Puck' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  });
};

/**
 * Resolves location using Google Search grounding for higher reliability across models.
 */
export const resolveLocationName = async (lat: number, lng: number): Promise<{ short: string; full: string; district: string; state: string } | null> => {
  const cacheKey = `geo_search_v2_${lat.toFixed(4)}_${lng.toFixed(4)}`;
  return executeSecureRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Identify the specific Village, Tehsil, District, and State in India for these coordinates: ${lat}, ${lng}. 
                 Return ONLY a clean JSON object: {"short": "District Name", "full": "Village, Tehsil, District, State", "district": "District", "state": "State Name"}`,
      config: {
        tools: [{ googleSearch: {} }]
      },
    });

    const match = response.text?.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const data = JSON.parse(match[0]);
    
    CacheService.set('loc_district', data.district, 24);
    CacheService.set('loc_state', data.state, 24);
    CacheService.set('loc_full', data.full, 24);
    
    return data;
  }, cacheKey);
};

export const getWeatherData = async (loc: { lat?: number; lng?: number; text?: string }, lang: Language): Promise<any> => {
  const query = loc.text || `${loc.lat},${loc.lng}`;
  const cacheKey = `weather_live_v2_${query.substring(0, 30)}_${lang}`;
  return executeSecureRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Act as a professional Indian Agri-Meteorologist. Find LIVE local weather for ${query}, India. 
                 Use Google Search to find current temperature, humidity, and rain probability for TODAY. 
                 Then, provide a detailed agricultural advisory in ${lang === 'hi' ? 'Hindi' : 'English'}.
                 Format the output to include clear section headers for CURRENT conditions and AGRI-ADVICE.`,
      config: { 
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri }));

    // Extract basic temp if possible for UI elements
    const tempMatch = text.match(/(\d+)\s*°/);
    const temp = tempMatch ? tempMatch[1] : "--";

    return { 
      text,
      sources,
      temp,
      timestamp: new Date().toLocaleTimeString()
    };
  }, cacheKey);
};

export const getMandiPrices = async (locContext: string, lang: Language): Promise<{ text: string, sources: any[] }> => {
  const cacheKey = `mandi_live_v2_${locContext.substring(0, 30)}_${lang}`;
  return executeSecureRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find TODAY'S LIVE WHOLESALE MANDI PRICES (Bhav) for markets in or near ${locContext}, India. 
                 Search for the latest arrivals and modal prices for crops like Wheat, Mustard, Onion, and Tomato. 
                 Provide a clear bulletin in ${lang === 'hi' ? 'Hindi' : 'English'}. 
                 Ensure prices are clearly visible.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    
    const text = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri }));
    
    return { 
      text, 
      sources 
    };
  }, cacheKey);
};

export const getNearbyDroneServices = async (locContext: string, lang: Language): Promise<any[]> => {
  const cacheKey = `drone_services_${locContext.substring(0, 20)}_${lang}`;
  return executeSecureRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find Agri-Drone Spraying Service Providers and Drone CHCs near ${locContext}, India. Return as JSON array of objects with keys: name, contact, type, address.`,
      config: { 
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    });
    
    const text = response.text;
    const start = text?.indexOf('[');
    const end = text?.lastIndexOf(']') + 1;
    return (start !== -1 && end !== 0) ? JSON.parse(text.substring(start, end)) : [];
  }, cacheKey);
};

export const getFarmingAdvice = async (query: string, profile: FarmerProfile | null, lang: Language): Promise<string> => {
  return executeSecureRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Query: ${query}. Farmer Profile: ${JSON.stringify(profile)}. Language: ${lang}. 
                 Provide a detailed, practical agricultural answer. Use Google Search if you need specific crop varieties or current seasonal pests in India.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return response.text || "";
  });
};

export const diagnoseCrop = async (imageData: string, lang: Language): Promise<any> => {
  return executeSecureRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{ inlineData: { data: imageData, mimeType: 'image/jpeg' } }, { text: `Diagnose in ${lang} as JSON. Include problemName, diagnosis, solutionOrganic, solutionChemical, estimatedCostRange, preventionTips.` }]
      },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const parseVoiceExpense = async (voiceText: string, lang: Language): Promise<any> => {
  return executeSecureRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract expense from "${voiceText}" as JSON with amount, category (Seeds, Fertilizers, Pesticides, Labor, Other), and description.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const getSchemeAdvice = async (profile: FarmerProfile, lang: Language): Promise<string> => {
  return executeSecureRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Govt agricultural schemes for a farmer in ${profile.state} with ${profile.landSize} acres. Use Google Search for current active schemes in ${lang}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return response.text || "";
  });
};
