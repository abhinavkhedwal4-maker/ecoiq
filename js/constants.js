/**
 * @fileoverview Global constants for EcoIQ
 * @module constants
 */

'use strict';

// ---- PERFORMANCE CONSTANTS ----
export const PERFORMANCE = {
  AUTO_REFRESH_INTERVAL: 10000, // 10 seconds
  CHART_ANIMATION_DURATION: 800,
  TOAST_DURATION: 3000,
  AI_TIMEOUT: 10000, // 10 seconds
  HISTORY_PAGE_SIZE: 20,
  DEBOUNCE_DELAY: 300,
};

// ---- CHART DEFAULTS ----
export const CHART = {
  COLOR: '#e2ffe2',
  FONT_FAMILY: 'Plus Jakarta Sans',
  COLORS: {
    transport: '#3b82f6',
    food: '#22c55e',
    energy: '#eab308',
    shopping: '#a855f7',
    nature: '#14b8a6',
  },
  BORDERS: {
    transport: '#1d4ed8',
    food: '#15803d',
    energy: '#a16207',
    shopping: '#7e22ce',
    nature: '#0f766e',
  },
};

// ---- ECO LEVELS ----
export const ECO_LEVELS = [
  { points: 0, name: 'Seedling', icon: '🌱' },
  { points: 100, name: 'Sprout', icon: '🌿' },
  { points: 300, name: 'Sapling', icon: '🌳' },
  { points: 600, name: 'Tree', icon: '🌲' },
  { points: 1000, name: 'Guardian', icon: '🌍' },
];

// ---- CATEGORIES ----
export const CATEGORIES = {
  TRANSPORT: 'transport',
  FOOD: 'food',
  ENERGY: 'energy',
  SHOPPING: 'shopping',
  NATURE: 'nature',
};

// ---- API ENDPOINTS ----
export const API = {
  CHAT: '/api/chat',
};

// ---- DOM IDS ----
export const DOM_IDS = {
  // Insights
  TOTAL_REDUCED: 'totalReduced',
  BEST_CATEGORY: 'bestCategory',
  ACTIVE_DAYS: 'activeDays',
  ECO_LEVEL: 'ecoLevel',
  DONUT_CHART: 'donutChart',
  LINE_CHART: 'lineChart',
  CATEGORY_BARS: 'categoryBars',
  WEEKLY_CHART: 'weeklyChart',
  AI_ANALYSIS: 'aiAnalysis',
  LEVEL_TRACK: 'levelTrack',
  REFRESH_BTN: 'refreshBtn',
  REFRESH_TOAST: 'refreshToast',
  
  // Tracker
  HISTORY_LIST: 'historyList',
  HISTORY_EMPTY: 'historyEmpty',
  ACTIONS_GRID: 'actionsGrid',
  
  // Common
  CHAT_PANEL: 'chatPanel',
  CHAT_OVERLAY: 'chatOverlay',
  CHAT_TOGGLE_BTN: 'chatToggleBtn',
};

// ---- MESSAGES ----
export const MESSAGES = {
  DATA_REFRESHED: '✅ Data refreshed!',
  AI_ANALYZING: 'EcoAI is analyzing your progress...',
  AI_ERROR: '⚠️ Could not load AI analysis. Make sure npm start is running and try refreshing!',
  NO_ACTIONS: 'Log some actions in the Tracker first to see AI analysis! 🌱',
  NO_HISTORY: 'No actions logged yet. Start tracking above! 🌱',
};

// ---- SECURITY ----
export const SECURITY = {
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 20,
};

// ---- ACCESSIBILITY ----
export const A11Y = {
  SKIP_LINK_ID: 'skip-to-main',
  MAIN_CONTENT_ID: 'main-content',
};
