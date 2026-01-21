
import React from 'react';
import { Sprout, ShoppingCart, Activity, Plane, Users, Wallet, Info, Camera, Landmark, Cpu, Trophy, Calendar, UserCircle, Map as MapIcon, CloudSun, TrendingUp } from 'lucide-react';

export const CATEGORIES = [
  { id: 'dashboard', label: 'Dashboard', icon: <Activity className="w-6 h-6" /> },
  { id: 'weather', label: 'Weather Tracker', icon: <CloudSun className="w-6 h-6" /> },
  { id: 'map', label: 'Farm Map', icon: <MapIcon className="w-6 h-6" /> },
  { id: 'crop-doctor', label: 'Crop Doctor', icon: <Sprout className="w-6 h-6" /> },
  { id: 'mandi', label: 'Mandi Bhav', icon: <ShoppingCart className="w-6 h-6" /> },
  { id: 'yojna', label: 'Kisan Yojna', icon: <Landmark className="w-6 h-6" /> },
  { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-6 h-6" /> },
  { id: 'expenses', label: 'Expenses', icon: <Wallet className="w-6 h-6" /> },
  { id: 'profit', label: 'Profit Prediction', icon: <TrendingUp className="w-6 h-6" /> },
  { id: 'iot', label: 'Smart IoT', icon: <Cpu className="w-6 h-6" /> },
  { id: 'assistant', label: 'Kissan Sathi', icon: <Info className="w-6 h-6" /> },
  { id: 'community', label: 'Kisan Feed', icon: <Users className="w-6 h-6" /> },
  { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="w-6 h-6" /> },
  { id: 'drone', label: 'Drone Hub', icon: <Plane className="w-6 h-6" /> },
  { id: 'profile', label: 'My Profile', icon: <UserCircle className="w-6 h-6" /> },
];

export const STATES = [
  "Uttar Pradesh", "Maharashtra", "Punjab", "Haryana", "Karnataka", "Madhya Pradesh", "Rajasthan", "Gujarat", "Andhra Pradesh"
];

export const CROPS = [
  "Wheat", "Rice", "Cotton", "Sugarcane", "Soybean", "Maize", "Tomato", "Potato", "Onion"
];

export const UI_STRINGS: any = {
  en: {
    welcome: "Welcome to KisanAI",
    dashboard: "Dashboard",
    assistant: "Kissan Sathi",
    "iot": "Smart IoT",
    "crop-doctor": "Crop Doctor",
    mandi: "Mandi Bhav",
    expenses: "Expenses",
    drone: "Drone Hub",
    community: "Kisan Feed",
    leaderboard: "Leaderboard",
    calendar: "Crop Calendar",
    profile: "My Profile",
    map: "Farm Map",
    weather: "Live Weather",
    yojna: "Govt Schemes",
    profit: "Profit Tracker",
    scan: "Scan",
    predict: "Predict Profit",
  },
  hi: {
    welcome: "किसानAI में स्वागत है",
    dashboard: "डैशबोर्ड",
    assistant: "किसान साथी",
    "iot": "स्मार्ट IoT",
    "crop-doctor": "फसल डॉक्टर",
    mandi: "मंडी भाव",
    expenses: "खर्च",
    drone: "ड्रोन हब",
    community: "किसान फीड",
    leaderboard: "लीडरबोर्ड",
    calendar: "फसल कैलेंडर",
    profile: "मेरी प्रोफाइल",
    map: "खेत का नक्शा",
    weather: "लाइव मौसम",
    yojna: "सरकारी योजनाएं",
    profit: "मुनाफा गणना",
    scan: "स्कैन",
    predict: "मुनाफा",
  }
};
