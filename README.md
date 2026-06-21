# 🌱 EcoIQ — AI Carbon Footprint Tracker

> **Google Prompt War 2026 — Challenge 3.**
> A web app that helps individuals **understand, track, and reduce** their personal carbon footprint through personalized AI insights, gamified action tracking, and interactive data visualizations.

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://ecoiq.vercel.app)
[![CI](https://github.com/abhinavkhedwal4-maker/ecoiq/actions/workflows/ci.yml/badge.svg)](https://github.com/abhinavkhedwal4-maker/ecoiq/actions)
[![License](https://img.shields.io/badge/License-MIT-green)]()

---

## 1. Chosen Vertical

**Carbon Footprint Awareness Platform** — a tool for everyday individuals who want to know where their emissions come from and what to do about them. Organized around the three verbs in the brief:

| Pillar | In the product |
|--------|----------------|
| **Understand** | 4-step carbon calculator across transport, food, energy, and shopping — results compared to global average |
| **Track** | Daily eco-action logging with streaks, points, and CO₂ savings — synced to Firebase |
| **Reduce** | Personalized AI tips from Groq LLaMA 3.3 70B targeting each user's highest emission categories |

---

## 2. Architecture

```
Browser (HTML5 + Vanilla JS ES Modules)
  ├── index.html          Landing + particle animation
  ├── pages/calculator    4-step footprint wizard → AI tips
  ├── pages/tracker       Daily action logging + gamification
  ├── pages/insights      Chart.js visualizations + AI analysis
  └── pages/quiz          15-question timed eco quiz
         │
         │  POST /api/chat  (input-validated, rate-limited proxy)
         ▼
  Vercel Serverless Function (api/chat.js)
         │
         ▼
  Groq API — LLaMA 3.3 70B Versatile
         │
  Firebase Auth + Firestore (Google Services)
         └── Google Sign-In → cross-device data sync
```

**Why Vanilla JS over React?** Eliminates framework overhead, reduces bundle size, demonstrates pure JavaScript proficiency, and loads faster on mobile.

**Why Groq over OpenAI?** LLaMA 3.3 70B offers faster inference, generous free tier, and is ideal for real-time chat responses.

**Why server-side proxy?** API keys never exposed to the browser. All AI requests route through `/api/chat`.

---

## 3. Emission Model

All carbon factors use published data cited inline in `js/carbon.js`:

| Category | Factor | Source |
|----------|--------|--------|
| Petrol car | 0.21 kg CO₂/km | UK DEFRA 2023 |
| Diesel car | 0.17 kg CO₂/km | UK DEFRA 2023 |
| Electric car | 0.05 kg CO₂/km | India grid-adjusted |
| Flight | 0.9 t CO₂/flight | IPCC AR6 |
| Vegan diet base | 1.5 t CO₂/year | Our World in Data |
| Mixed diet base | 2.5 t CO₂/year | Our World in Data |
| India grid | 0.82 kg CO₂/kWh | CEA 2023 |

Every constant cites its source — no magic numbers. See [`js/carbon.js`](js/carbon.js).

---

## 4. Project Structure

```
ecoiq/
├── index.html                  # Landing page
├── style.css                   # Global design system (CSS variables)
├── main.js                     # App init + particle canvas + auth
├── server.js                   # Secure Node.js dev server (rate limiting, CSP)
├── .env.example                # Environment variable template
├── vercel.json                 # Vercel deployment config
├── .github/
│   └── workflows/ci.yml        # CI: runs tests on every push to main
├── api/
│   └── chat.js                 # Vercel serverless Groq proxy (validated)
├── js/
│   ├── shared.js               # Shared utilities (sanitize, format, toggleChat)
│   ├── carbon.js               # Pure carbon calculation functions + cited factors
│   ├── calculator.js           # Multi-step calculator UI + Firestore save
│   ├── tracker.js              # Action logging + streak/points engine
│   ├── insights.js             # Chart.js donut + line chart + AI analysis
│   ├── quiz.js                 # Timed quiz engine with difficulty levels
│   ├── chatbot.js              # Groq AI chat (rate-limited, sanitized)
│   ├── auth.js                 # Firebase Google Auth
│   └── firebase.js             # Firebase configuration
├── pages/
│   ├── calculator.html
│   ├── tracker.html
│   ├── insights.html
│   └── quiz.html
├── css/                        # Page-specific stylesheets
└── tests/
    └── app.test.js             # Comprehensive test suite (zero dependencies)
```

---

## 5. Security

| Measure | Implementation |
|---------|----------------|
| API key isolation | Groq key stored in `.env`, never committed; proxied via serverless function |
| Input sanitization | XSS prevention on all user inputs (`shared.js → sanitizeString`) |
| Server rate limiting | 30 requests/minute per IP (`server.js → checkRateLimit`) |
| Client rate limiting | 10 messages/minute in browser (`chatbot.js`) |
| Body size limit | 50 KB max request body |
| Security headers | `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy` |
| Path traversal prevention | `path.resolve()` + `startsWith(cwd)` check in static file server |
| `.gitignore` | `.env`, `node_modules`, build artifacts excluded |

---

## 6. Accessibility (WCAG 2.1 AA)

| Feature | Implementation |
|---------|----------------|
| Skip link | `<a href="#main-content" class="skip-link">` on all 5 pages |
| ARIA labels | All interactive elements labelled |
| ARIA roles | `navigation`, `main`, `dialog`, `list`, `listitem`, `progressbar`, `timer` |
| Live regions | `aria-live="polite"` for dynamic updates; `aria-live="assertive"` for timer |
| Keyboard navigation | Enter/Space on custom controls; focus trap in chat modal |
| Focus management | Chat panel auto-focuses textarea on open |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` respected |
| Color contrast | 4.5:1+ on all text against dark background |
| Screen reader | `aria-hidden="true"` on decorative emoji/icons |

---

## 7. Testing

```bash
npm test
```

Run with zero external dependencies, in plain Node.js. The suite covers:

| Suite | Covers |
|-------|--------|
| Transport Calculations | Emission factors, public transport reduction, edge cases |
| Food Calculations | Diet types, beef frequency, food waste scaling |
| Energy Calculations | Grid factor, renewable reduction, HVAC impact |
| Shopping Calculations | Clothes/electronics frequency, repair bonus |
| Total Footprint | Sum accuracy, always-positive, high vs low lifestyle |
| Quiz Grade System | All grade boundaries |
| Eco Level System | All level boundaries (0/100/300/600/1000 pts) |
| String Sanitization | XSS escaping, ampersands, quotes, length truncation |
| Message Formatting | Bold, italic, code, paragraphs, null input |
| Message Validation | Role validation, malformed objects, rate limits |
| Date Utilities | Date key format, active day deduplication |
| Edge Cases & Robustness | Undefined inputs, extreme values, type safety |

CI runs the full suite on every push to `main` via GitHub Actions — see the badge at the top of this README for current status.

---

## 8. Setup & Run

### Prerequisites
- Node.js 18+
- Groq API key — [console.groq.com](https://console.groq.com)
- Firebase project — [console.firebase.google.com](https://console.firebase.google.com)

### Installation

```bash
# Clone
git clone https://github.com/abhinavkhedwal4-maker/ecoiq.git
cd ecoiq

# Install
npm install

# Configure
cp .env.example .env
# Add GROQ_API_KEY and GROQ_MODEL to .env

# Test
npm test

# Run
npm start
# → http://localhost:3000
```

### Environment Variables

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
PORT=3000
```

---

## 9. Deployment

Deployed on **Vercel** with automatic GitHub integration:

```bash
git add .
git commit -m "feat: deploy EcoIQ"
git push origin main
# Vercel auto-deploys on push
```

Set `GROQ_API_KEY` and `GROQ_MODEL` in Vercel → Settings → Environment Variables.

---

## 10. How This Maps to the Evaluation Rubric

| Criterion | Where to Look |
|-----------|---------------|
| **Code Quality** | Pure functions in `js/carbon.js`; JSDoc on every function; named constants with cited sources; `js/shared.js` centralizes shared logic (sanitization, formatting, date utilities) to eliminate duplication across modules; consistent `'use strict'`; defensive null checks throughout |
| **Security** | `api/chat.js` + `server.js` — validated proxy, rate limiting, XSS sanitization, security headers, body size limits, path traversal prevention, `.env` isolation (never committed) |
| **Efficiency** | `DocumentFragment` for batch DOM updates in tracker rendering; Chart.js instances destroyed before recreation to prevent memory leaks; `Map`-based rate limit store with periodic auto-cleanup |
| **Testing** | `tests/app.test.js` — zero-dependency test suite covering calculations, validation, security, formatting, and edge cases; `.github/workflows/ci.yml` runs the suite on every push |
| **Accessibility** | Skip links on all 5 pages; ARIA landmark/role/live-region coverage; keyboard navigation on custom controls; focus management in the chat modal; reduced-motion support; 4.5:1 contrast ratio |
| **Problem Statement Alignment** | Understand (calculator) → Track (tracker + Firestore) → Reduce (AI tips + chatbot) loop; Indian context (₹ electricity billing, India grid emission factor, local produce); gamification (streaks, points, eco levels) drives habit formation |

---

## 11. Impact

The average Indian produces ~2.5 tonnes CO₂/year vs the sustainable target of 2.0 tonnes. EcoIQ helps users:

- **Identify** highest emission categories in minutes
- **Act** with 27 trackable daily eco-actions
- **Measure** progress with CO₂ saved, streak counts, and eco levels
- **Learn** through a 15-question quiz with source-cited explanations

---

## 12. Assumptions

- Emission factors are representative public averages for awareness and education, not certified carbon accounting.
- Home energy estimates derive from monthly electricity bill amount, using an approximate ₹/kWh conversion for urban India.
- Flights are entered as an annual count and converted using a representative average per-trip emission figure.
- No formal login is required to use the Calculator, Tracker, or Quiz; Google Sign-In is optional and enables cross-device sync via Firestore.

---

*Built for Google Prompt War 2026 — Challenge 3*
