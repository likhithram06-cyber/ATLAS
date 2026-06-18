# ✦ ATLAS — Next-Gen Real Estate Discovery with AI Voice Agent

ATLAS is a premium, state-of-the-art real estate discovery platform that combines high-performance property searches with a live, real-time conversational voice agent. The platform allows users to browse premium listings and immediately place outbound phone calls to interact with a warm, natural AI agent to ask questions, negotiate prices, and receive recommendations.

---

## 🚀 Key Features

### 1. Live AI Voice Agent (Real-Time WebSocket Stream)
*   **Outbound Twilio Pipeline**: Triggers outbound calls directly from the property page using Twilio's telephony API, pointing to a secure `/voice-stream` endpoint.
*   **Bi-directional Audio Streaming**: Hands off call audio via a `<Connect><Stream>` TwiML command to a Node.js WebSocket handler (`wss://`), achieving zero-turn latency.
*   **Flagship STT (Speech-to-Text)**: Powered by Sarvam AI's flagship **`saaras:v3`** streaming model to transcribe user speech in real-time. Audio packets are transmitted using the official JSON-wrapped base64 `transcribe` API to guarantee delivery.
*   **Groq LLM Streaming**: Leverages Groq's ultra-fast **`llama-3.1-8b-instant`** model to generate human-like, conversational, and direct property answers with a strict token cap (80 tokens) for short, natural phone turns.
*   **Barge-In (Interruption) Support**: Leverages Voice Activity Detection (VAD) signals (`START_SPEECH` / `END_SPEECH`) from Sarvam to instantly mute the agent's playback when the caller speaks.
*   **Dynamic Language Switch**: Auto-detects caller language (Telugu, Hindi, English) and dynamically updates the TTS engine parameters during the call.
*   **Flagship TTS (Text-to-Speech)**: Streams synthesized Indian English and Indic language voice replies back to Twilio using Sarvam's streaming `bulbul:v3` model.

### 2. Premium Admin Portal & Analytical Dashboard
*   **Enquiry Intent Scoring**: Employs LLaMA-based intent extraction to rate caller buying interest from 0% to 100% and break down bargaining metrics.
*   **Dynamic Response Latency Graph**: Calculates the exact response time (delay in seconds) from the end of the user's speech to the delivery of the agent's reply. This turn-by-turn latency metric is visualized on the admin portal using a **custom glow-effect SVG Line Chart** under both Call Records and User Leads.
*   **Max-Heap Priority Ranking**: Automatically ranks enquiries by intent scores in real-time using an optimized binary Max-Heap structure for high-priority lead follow-ups.

### 3. Optimized Algorithms & Security
*   **Binary Search Price Filter**: Implements an $O(\log N)$ binary search to filter properties instantly by price ranges.
*   **Cosine Similarity Recommendations**: Dynamically builds vectors mapping price, BHK, and location to surface the top 4 similar listings using cosine similarity.
*   **Secure Authentication**: JWT protected API routes, secure password hashing, and Google OAuth integration with token signature verification.

---

## 🛠️ Technology Stack

*   **Frontend**: React (Vite), TailwindCSS, Framer Motion, Lucide icons
*   **Backend**: Node.js, Express, WebSocket (`ws`)
*   **Database & Cache**: MongoDB Atlas (Mongoose), Redis Caching
*   **Third-Party APIs**: Twilio Voice, Sarvam AI, Groq (LLaMA 3.1)

---

## 📂 Project Architecture

```
ATLAS/
├── backend/
│   ├── config/             # DB (MongoDB) & Caching (Redis) configuration
│   ├── controllers/        # Handlers (agent, admin, properties, calls)
│   ├── middleware/         # Auth verification & Twilio signature protection
│   ├── models/             # Mongoose schemas (User, Property, Enquiry, CallRecord)
│   ├── routes/             # API endpoints
│   ├── services/           # WebSocket media stream handler for real-time STT/LLM/TTS
│   ├── utils/              # Helper utilities (binarySearch, cosineSimilarity, maxHeap)
│   └── server.js           # Server entry point
├── frontend/
│   ├── src/
│   │   ├── api/            # API service calls
│   │   ├── components/     # Reusable React components (Navbar, protected routing)
│   │   └── pages/          # Admin dashboard, Login, Landing pages
│   ├── tailwind.config.js
│   └── vite.config.js
```

---

## 📦 Getting Started & Setup

### Prerequisites
*   Node.js (v18 or higher)
*   MongoDB Instance (or Atlas URI)
*   Redis Server
*   Twilio Account (SID, Auth Token, Phone Number)
*   Sarvam AI and Groq API keys

---

### Environment Setup

Create a `.env` file in the `backend/` directory:
```ini
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
ADMIN_ID=admin
ADMIN_PASSWORD=admin_password

# Twilio Telephony Credentials
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE=your_twilio_phone_number

# Public HTTPS deployment URL (Render)
BASE_URL=https://your-service.onrender.com

# AI Keys
SARVAM_API_KEY=your_sarvam_api_key
GROQ_API_KEY=your_groq_api_key
N8N_WEBHOOK_URL=your_n8n_telegram_webhook_url
```

Create a `.env` file in the `frontend/` directory:
```ini
VITE_API_URL=https://your-service.onrender.com
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

---

### Installation & Run

1.  **Run the automated setup script**:
    Installs packages, downloads Kaggle housing dataset images, and seeds MongoDB:
    ```bash
    node setup.js
    ```
2.  **Start the Backend Express & WebSocket server**:
    ```bash
    cd backend
    npm run dev
    ```
3.  **Start the Frontend Vite client**:
    ```bash
    cd frontend
    npm run dev
    ```
    Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📄 License
This project is licensed under the ISC License.
