
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { FarmerProfile, Language } from "../types";
import { CacheService } from "../utils/cacheService";

const activeRequests = new Map<string, Promise<any>>();

// The key will be injected here by Vite's 'define' configuration
const getApiKey = () => {
  return process.env.API_KEY || "";
};

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
        CacheService.set(cacheKey, result, 0.5); 
      }
      return result;
    } catch (error: any) {
      console.error("Gemini API Error:", error);
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
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Speak in a helpful farmer assistant voice (${lang === Language.HINDI ? 'Hindi' : 'English'}): ${text.substring(0, 400)}` }] }],
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
  });
};

export const resolveLocationName = async (lat: number, lng: number): Promise<{ short: string; full: string; district: string; state: string } | null> => {
  return executeSecureRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Identify the specific location for coordinates ${lat}, ${lng} in India. Return ONLY a JSON object: {"short": "District Name", "full": "Village Name, District, State", "district": "District", "state": "State"}`,
    });
    const match = response.text?.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }, `geo_${lat.toFixed(3)}_${lng.toFixed(3)}`);
};

export const getWeatherData = async (loc: { lat?: number; lng?: number; text?: string }, lang: Language): Promise<any> => {
  const query = loc.text || `${loc.lat},${loc.lng}`;
  return executeSecureRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    
    const prompt = `SEARCH GOOGLE WEATHER: Provide exact current weather metrics for ${query}, India. 
    Find: Current Temp (°C), Humidity (%), Wind Speed (km/h), and Sky Condition. 
    Match the data shown on Google Search Weather One-Box. 
    Provide a 1-sentence agri-advice in ${lang === Language.HINDI ? 'Hindi' : 'English'}.`;

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
  }, `weather_v2_${query}_${lang}`);
};

export const getMandiPrices = async (locContext: string, lang: Language): Promise<{ text: string, sources: any[] }> => {
  return executeSecureRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Live Mandi prices in ${locContext}. Brief & Accurate. Lang: ${lang}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return { 
      text: response.text || "", 
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri })) || []
    };
  }, `mandi_v2_${locContext}_${lang}`);
};

export const getFarmingAdvice = async (query: string, profile: FarmerProfile | null, lang: Language): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Farmer Question: ${query}. Context: ${profile?.district}. Agri-advice in ${lang}.`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return response.text || "";
};

export const diagnoseCrop = async (imageData: string, lang: Language): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [{ inlineData: { data: imageData, mimeType: 'image/jpeg' } }, { text: `Diagnose crop health. JSON in ${lang}.` }]
    },
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || "{}");
};

export const parseVoiceExpense = async (voiceText: string, lang: Language): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Extract expense JSON (amount, category, description) from: ${voiceText}`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || "{}");
};

export const getSchemeAdvice = async (profile: FarmerProfile, lang: Language): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Eligible agri schemes for a farmer in ${profile.state} with ${profile.landSize} acres. Lang: ${lang}.`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return response.text || "";
};

export const getNearbyDroneServices = async (locContext: string, lang: Language): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Search drone spraying services in ${locContext}. Return JSON array of objects with name, contact, and address.`,
    config: { tools: [{ googleSearch: {} }] }
  });
  const match = response.text?.match(/\[[\s\S]*\]/);
  return match ? JSON.parse(match[0]) : [];
};
