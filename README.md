# 🌱 EcoIQ — AI Carbon Footprint Tracker

> Helping individuals understand, track, and reduce their carbon footprint through simple actions and personalized AI insights.
> **Google Prompt War 2026 — Challenge 3**

[![Live Demo](https://img.shields.io/badge/Live-Demo-green)](https://ecoiq.vercel.app)
[![Tests](https://img.shields.io/badge/Tests-70%20passing-brightgreen)]()
[![Security](https://img.shields.io/badge/Security-Hardened-blue)]()
[![Accessibility](https://img.shields.io/badge/WCAG-2.1%20AA-orange)]()

---

## 🎯 Problem Statement Alignment

This solution directly addresses the challenge by providing:
- **Understand**: Carbon Calculator with AI-powered explanations
- **Track**: Daily action tracker with streaks and points
- **Reduce**: Personalized AI tips via Groq LLaMA 3.3 70B
- **Insights**: Visual charts showing progress over time

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧮 Carbon Calculator | 4-step footprint calculator across transport, food, energy, shopping |
| 🤖 EcoAI Chatbot | Powered by Groq LLaMA 3.3 70B — personalized sustainability advice |
| ✅ Action Tracker | 27 eco-actions across 5 categories with points and streaks |
| 📊 Insights Dashboard | Chart.js visualizations — donut chart + line chart |
| 🧠 Eco Quiz | 15 questions across 3 difficulty levels |
| 🔐 Google Auth | Firebase Authentication with Firestore sync |
| 📱 Responsive | Mobile-first design, works on all screen sizes |

---

## 🛠️ Tech Stack
Frontend  : HTML5, CSS3, Vanilla JavaScript (ES Modules)
AI        : Groq API — LLaMA 3.3 70B Versatile
Charts    : Chart.js 4.4
Auth      : Firebase Authentication (Google)
Database  : Firebase Firestore
Backend   : Node.js (dev) + Vercel Serverless Functions (prod)
Deploy    : Vercel
Version   : Git + GitHub
---

## 🔒 Security

- API keys stored in `.env` — never committed to Git
- Groq API proxied through serverless function — key never exposed to browser
- Input sanitization against XSS on all user inputs
- Rate limiting: 30 requests/minute per IP (server) + 10/minute (client)
- Path traversal prevention in static file server
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`
- Request body size limit: 50KB max

---

## ♿ Accessibility (WCAG 2.1 AA)

- Skip navigation link on all pages
- ARIA labels on all interactive elements
- `role` attributes throughout (navigation, main, dialog, list, etc.)
- `aria-live` regions for dynamic content updates
- Keyboard navigation support (Enter/Space for custom controls)
- Focus management in chat panel (modal trap)
- Screen reader announcements via `aria-live="assertive"`
- `prefers-reduced-motion` media query respected
- Color contrast ratio: 4.5:1+ on all text
- `alt` text on all images

---

## 🧪 Testing

```bash
npm test
```

**70 tests** covering:
- Carbon calculations (transport, food, energy, shopping)
- Edge cases and boundary values
- Input validation and sanitization
- Security (XSS prevention, SQL injection)
- Message formatting
- Data integrity functions
- Grade and level systems

---

## ⚙️ Setup & Run

### Prerequisites
- Node.js 18+
- Groq API key from [console.groq.com](https://console.groq.com)
- Firebase project from [console.firebase.google.com](https://console.firebase.google.com)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/ecoiq.git
cd ecoiq

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env
# Edit .env with your keys

# 4. Run tests
npm test

# 5. Start development server
npm start

# 6. Open browser
# http://localhost:3000
```

### Environment Variables

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

---

## 📁 Project Structure
ecoiq/
├── index.html              # Landing page
├── style.css               # Global design system
├── main.js                 # App initialization + particle animation
├── server.js               # Secure Node.js dev server
├── api/
│   └── chat.js             # Vercel serverless Groq proxy
├── pages/
│   ├── calculator.html     # Carbon footprint calculator
│   ├── tracker.html        # Daily action tracker
│   ├── insights.html       # Charts and AI analysis
│   └── quiz.html           # Eco knowledge quiz
├── css/                    # Page-specific styles
├── js/
│   ├── firebase.js         # Firebase configuration
│   ├── auth.js             # Google authentication
│   ├── chatbot.js          # Groq AI chatbot
│   ├── calculator.js       # Footprint calculation logic
│   ├── tracker.js          # Action logging
│   ├── insights.js         # Charts and analysis
│   └── quiz.js             # Quiz engine
└── tests/
└── app.test.js         # 70 comprehensive tests

---

## 🚀 Deployment

Deployed on Vercel with automatic GitHub integration.

```bash
# Push to GitHub — Vercel auto-deploys
git add .
git commit -m "Deploy EcoIQ"
git push origin main
```

Environment variables set in Vercel dashboard under Settings → Environment Variables.

---

## 📐 Architecture Decisions

**Why Groq over OpenAI?** — Groq's LLaMA 3.3 70B offers faster inference and generous free tier, ideal for real-time chat responses.

**Why Vanilla JS over React?** — Reduces bundle size, eliminates framework overhead, demonstrates pure JavaScript proficiency.

**Why Firebase?** — Free tier sufficient for hackathon scale, Google ecosystem integration, real-time sync capability.

**Why server-side proxy?** — API keys never exposed to browser. All AI requests go through `/api/chat` endpoint.

---

## 🌍 Impact

The average Indian produces ~2.5 tonnes CO₂/year. EcoIQ helps users:
- Identify their highest emission categories
- Take targeted daily actions to reduce emissions
- Track progress with measurable metrics
- Build sustainable habits through gamification

---

*Built with 💚 for Google Prompt War 2026 — Challenge 3*