
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { FarmerProfile, Language } from "../types";
import { CacheService } from "../utils/cacheService";

const activeRequests = new Map<string, Promise<any>>();
let globalCooldownUntil = 0;

async function executeSecureRequest<T>(fn: () => Promise<T>, cacheKey?: string): Promise<T> {
  if (cacheKey) {
    const cached = CacheService.get(cacheKey);
    if (cached) return cached;
  }

  if (cacheKey && activeRequests.has(cacheKey)) {
    return activeRequests.get(cacheKey);
  }

  const execution = (async () => {
    try {
      const result = await fn();
      if (cacheKey && result) {
        CacheService.set(cacheKey, result, 0.5); // 30 min cache for speed
      }
      return result;
    } catch (error: any) {
      console.error("Gemini Error:", error);
      throw error;
    }
  })();

  if (cacheKey) {
    activeRequests.set(cacheKey, execution);
    execution.finally(() => activeRequests.delete(cacheKey));
  }

  return execution;
}

export const generateSpeech = async (text: string, lang: Language): Promise<string> => {
  return executeSecureRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Speak this clearly for a farmer in ${lang === Language.HINDI ? 'Hindi' : 'English'}: ${text.substring(0, 500)}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: lang === Language.HINDI ? 'Kore' : 'Zephyr' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  }, `tts_${text.substring(0, 30)}_${lang}`);
};

export const resolveLocationName = async (lat: number, lng: number): Promise<{ short: string; full: string; district: string; state: string } | null> => {
  return executeSecureRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Perform precise reverse geocoding for ${lat}, ${lng} in India. Return JSON: {"short": "District Name", "full": "Village/Area, District, State", "district": "District", "state": "State"}`,
    });
    const match = response.text?.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }, `loc_${lat.toFixed(3)}_${lng.toFixed(3)}`);
};

export const getWeatherData = async (loc: { lat?: number; lng?: number; text?: string }, lang: Language): Promise<any> => {
  const query = loc.text || `${loc.lat},${loc.lng}`;
  return executeSecureRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // STRICT SEARCH PROMPT FOR ACCURACY
    const prompt = `REAL-TIME WEATHER SEARCH: Find exact current weather for ${query}, India. 
    Required data: Temperature in °C, Humidity %, Wind speed in km/h, and sky conditions. 
    Match results with Google Search One-Box or IMD. 
    Output in ${lang === Language.HINDI ? 'Hindi' : 'English'}. Include 1 short farming tip.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        tools: [{ googleSearch: {} }],
        temperature: 0.1 
      }
    });

    const text = response.text || "";
    const tempMatch = text.match(/(\d+)\s*°/);
    const humidityMatch = text.match(/(\d+)\s*%/);
    const windMatch = text.match(/(\d+)\s*km/i);

    return { 
      text,
      temp: tempMatch ? tempMatch[1] : "--",
      humidity: humidityMatch ? humidityMatch[1] : "--",
      wind: windMatch ? windMatch[1] : "--",
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri })) || [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }, `w_precise_${query}_${lang}`);
};

// ... Remaining services kept same for stability ...
export const getMandiPrices = async (locContext: string, lang: Language): Promise<{ text: string, sources: any[] }> => {
  return executeSecureRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search Today's Official Mandi Prices in ${locContext}. Brief. Lang: ${lang}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return { 
      text: response.text || "", 
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri })) || []
    };
  }, `mandi_${locContext}_${lang}`);
};

export const getFarmingAdvice = async (query: string, profile: FarmerProfile | null, lang: Language): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Query: ${query}. Context: ${profile?.district}. Latest search data. Lang: ${lang}.`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return response.text || "";
};

export const diagnoseCrop = async (imageData: string, lang: Language): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [{ inlineData: { data: imageData, mimeType: 'image/jpeg' } }, { text: `Analyze crop. JSON in ${lang}.` }]
    },
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || "{}");
};

export const parseVoiceExpense = async (voiceText: string, lang: Language): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Extract expense JSON from: ${voiceText}`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || "{}");
};

export const getSchemeAdvice = async (profile: FarmerProfile, lang: Language): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Active Govt schemes for ${profile.state} farmers. Lang: ${lang}.`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return response.text || "";
};

export const getNearbyDroneServices = async (locContext: string, lang: Language): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Search drone service centers in ${locContext}. Return JSON array.`,
    config: { tools: [{ googleSearch: {} }] }
  });
  const match = response.text?.match(/\[[\s\S]*\]/);
  return match ? JSON.parse(match[0]) : [];
};
