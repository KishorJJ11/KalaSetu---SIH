# KalaSetu (कला सेतु) / CraftBridge

**AI-Driven Market Linkage & Smart Cataloging Mobile Application for Marginalized Artisans**
Built for Smart India Hackathon — SIH26090 — Ministry of Social Justice & Empowerment (MoSJE)

Digitize a rural artisan's physical product catalog in under 60 seconds with zero typing:
AI removes cluttered workshop backgrounds and composites a clean studio photo, while a
transparent dynamic-pricing engine protects artisans from middleman underpricing.

---

## Architecture

```
kalasetu/
├── ai_engine/     Python FastAPI — image enhancement (rembg + Pillow) + pricing engine
├── server/        Node.js/Express + MongoDB — artisan/product API, orchestrates ai_engine
└── client/        React Native (Expo, pure .jsx) — mobile app
```

Request flow for cataloging a product:
`StudioCameraScreen (client)` → `POST /api/products/catalog (server)` → `POST /api/ai/enhance-image` + `POST /api/ai/suggest-price` (ai_engine) → studio image + price saved to MongoDB → shown in `CatalogScreen` and the public `BuyerCatalogPreview` / `/api/marketplace/products` feed.

---

## Prerequisites

- Node.js ≥ 18
- Python ≥ 3.10
- MongoDB running locally (or an Atlas connection string)
- Expo Go app on your phone (or an Android/iOS simulator)
- All three services must be reachable from your phone/emulator on the same network

---

## Phase 1 — Python AI Microservice (`ai_engine/`)

```bash
cd ai_engine
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

First run downloads the `u2net` background-removal model (~176MB), cached by `rembg`.

Verify: `curl http://localhost:8000/health`

Endpoints:
- `POST /api/ai/enhance-image` — multipart `file` upload → studio-composited PNG
- `POST /api/ai/suggest-price` — JSON `{category, rawMaterialCost, hoursSpent, skillLevel, weightOrSize}` → price breakdown

---

## Phase 2 — Node.js Backend (`server/`)

```bash
cd server
cp .env.example .env
# edit .env if your MongoDB URI or AI_SERVICE_URL differ from defaults
npm install
npm run seed      # optional: creates a demo artisan (phone 9876543210)
npm run dev        # nodemon, auto-restarts on changes
# or: npm start
```

Verify: `curl http://localhost:5000/health`

Key routes:
- `POST /api/artisans/register`
- `GET  /api/artisans/:artisanId/dashboard`
- `POST /api/products/catalog` (multipart `image` + form fields — orchestrates AI enhancement + pricing)
- `POST /api/products/price-check` (live pricing preview, no image/persistence)
- `GET  /api/products/artisan/:artisanId`
- `GET  /api/marketplace/products` (public buyer feed)

Uploaded originals and AI studio images are stored under `server/uploads/` and served at `http://localhost:5000/uploads/...`.

---

## Phase 3 — React Native Mobile App (`client/`)

```bash
cd client
npm install
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

**Important — connecting to your backend:**
`client/utils/api.js` points at `http://localhost:5000` (`10.0.2.2:5000` on the Android emulator automatically). If you're testing on a **physical phone**, replace `DEV_HOST` in `client/utils/api.js` with your computer's LAN IP address (e.g. `192.168.1.42`) so the phone can reach your machine. The AI microservice URL is derived from the same host on port `8000` in `StudioCameraScreen.jsx`.

Both your phone and your computer must be on the same Wi-Fi network.

---

## Screens

| Screen | Purpose |
|---|---|
| `OnboardingScreen` | 3-step, icon-driven artisan registration (name/phone → craft & skill → state) |
| `HomeScreen` | Dashboard: live/draft counts, earnings, MoSJE scheme banner, quick actions |
| `StudioCameraScreen` | Live camera with framing guide; before/after AI studio preview toggle |
| `SmartPricingScreen` | Slider inputs for material cost/hours/size; live AI price breakdown card |
| `CatalogScreen` | Grid of the artisan's own products; one-tap WhatsApp share + simulated ONDC export |
| `BuyerCatalogPreview` | Public buyer-facing marketplace feed with search + category filters |

## Design Tokens (`client/theme/theme.js`)

| Token | Value |
|---|---|
| Primary | `#E65100` (Deep Artisan Orange) |
| Secondary | `#F57C00` / `#FF9800` (Warm Amber) |
| Background | `#FFFFFF` / `#FAFAFA` |
| Border | `#FFE0B2` |
| Text | `#212121` primary / `#757575` muted |

All touch targets are ≥48dp per the accessibility requirement for low-literacy, voice-first use.

---

## Smart Pricing Engine Logic (`ai_engine/pricing_engine.py`)

```
Fair Wage      = hours × ₹55/hr × skill-tier multiplier
Base Cost      = (raw material cost + fair wage) × size/weight overhead factor
Margin Band    = 25%–40%, scaled by craft-category complexity
Minimum Price  = Base Cost × 1.25            (never sell below this)
Market Price   = Base Cost × (1 + margin)     (recommended)
Festival Price = Market Price × 1.18          (Diwali / wedding-season uplift)
```

Every price point ships with a plain-language rationale so artisans understand — and can defend — their pricing to middlemen and buyers.
