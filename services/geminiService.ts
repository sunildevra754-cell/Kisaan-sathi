import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { FarmerProfile, Language } from "../types";
import { CacheService } from "../utils/cacheService";

const activeRequests = new Map<string, Promise<any>>();

const getApiKey = () => {
  const key = process.env.API_KEY;
  if (!key || key.trim() === "") {
    console.warn("⚠️ KisanAI Error: API_KEY is missing. Check Vercel Environment Variables.");
    return "";
  }
  return key;
};

async function executeSecureRequest<T>(fn: () => Promise<T>, cacheKey?: string): Promise<T> {
  if (cacheKey) {
    const cached = CacheService.get(cacheKey);
    if (cached) return cached;
  }
  if (cacheKey && activeRequests.has(cacheKey)) return activeRequests.get(cacheKey);

  const execution = (async () => {
    try {
      const result = await fn();
      if (cacheKey && result) CacheService.set(cacheKey, result, 0.5);
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

export const getSchemeAdvice = async (profile: FarmerProfile, lang: Language): Promise<{text: string, sources: any[]}> => {
  const key = getApiKey();
  if (!key) return { text: "Error: API Key missing.", sources: [] };

  return executeSecureRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find state-specific agricultural schemes for a farmer in ${profile.state}, district ${profile.district}. 
      Focus on active subsidies and registration portals. Provide direct URLs for official govt websites like pmkisan.gov.in, state agri portals, etc. 
      Language: ${lang === Language.HINDI ? 'Hindi' : 'English'}.`,
      config: { 
        tools: [{ googleSearch: {} }],
        temperature: 0.2
      }
    });
    return {
      text: response.text || "",
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri })) || []
    };
  }, `scheme_v2_${profile.state}_${profile.district}_${lang}`);
};

// ... other service methods (rest of the file kept as is) ...
export const generateSpeech = async (text: string, lang: Language): Promise<string> => {
  const key = getApiKey(); if (!key) return "";
  return executeSecureRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Speak in a helpful farmer assistant voice (${lang === Language.HINDI ? 'Hindi' : 'English'}): ${text.substring(0, 400)}` }] }],
      config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: lang === Language.HINDI ? 'Kore' : 'Zephyr' } } } }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  });
};

export const resolveLocationName = async (lat: number, lng: number): Promise<{ short: string; full: string; district: string; state: string } | null> => {
  const key = getApiKey(); if (!key) return null;
  return executeSecureRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Identify location for ${lat}, ${lng} in India. Return ONLY JSON: {"short": "District", "full": "Village, District, State", "district": "District", "state": "State"}`,
    });
    const match = response.text?.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }, `geo_${lat.toFixed(3)}_${lng.toFixed(3)}`);
};

export const getWeatherData = async (loc: { lat?: number; lng?: number; text?: string }, lang: Language): Promise<any> => {
  const key = getApiKey(); if (!key) return null;
  const query = loc.text || `${loc.lat},${loc.lng}`;
  return executeSecureRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Current weather and agri-advice for ${query}, India.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    const text = response.text || "";
    const tempMatch = text.match(/(\d+)\s*°/);
    return { 
      text, 
      temp: tempMatch ? tempMatch[1] : "--",
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri })) || []
    };
  }, `weather_v3_${query}_${lang}`);
};

export const getMandiPrices = async (locContext: string, lang: Language): Promise<{ text: string, sources: any[] }> => {
  const key = getApiKey(); if (!key) return { text: "Key missing", sources: [] };
  return executeSecureRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Live Mandi prices in ${locContext}. Brief & Accurate. Lang: ${lang}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return { 
      text: response.text || "", 
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri })) || []
    };
  }, `mandi_v3_${locContext}_${lang}`);
};

export const getFarmingAdvice = async (query: string, profile: FarmerProfile | null, lang: Language): Promise<string> => {
  const key = getApiKey(); if (!key) return "Error: API Key missing.";
  const ai = new GoogleGenAI({ apiKey: key });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Farmer Question: ${query}. Context: ${profile?.district}. Agri-advice in ${lang}.`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return response.text || "";
};

export const diagnoseCrop = async (imageData: string, lang: Language): Promise<any> => {
  const key = getApiKey(); if (!key) return { error: true, diagnosis: "API Key missing" };
  const ai = new GoogleGenAI({ apiKey: key });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { data: imageData, mimeType: 'image/jpeg' } }, { text: `Diagnose crop health. JSON in ${lang}.` }] },
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || "{}");
};

export const parseVoiceExpense = async (voiceText: string, lang: Language): Promise<any> => {
  const key = getApiKey(); if (!key) return {};
  const ai = new GoogleGenAI({ apiKey: key });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Extract expense JSON (amount, category, description) from: ${voiceText}`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || "{}");
};

export const getNearbyDroneServices = async (locContext: string, lang: Language): Promise<any[]> => {
  const key = getApiKey(); if (!key) return [];
  const ai = new GoogleGenAI({ apiKey: key });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Search drone spraying services in ${locContext}. Return JSON array.`,
    config: { tools: [{ googleSearch: {} }] }
  });
  const match = response.text?.match(/\[[\s\S]*\]/);
  return match ? JSON.parse(match[0]) : [];
};