# ✦ ATLAS — Next-Gen Real Estate Discovery with AI Voice Agent

ATLAS is a premium, state-of-the-art real estate platform that combines modern web experiences with live, streaming AI conversational capabilities. The platform allows users to browse premium property inventories with high performance and connect with an advanced AI Voice Agent via outbound phone calls to inquire about properties and negotiate pricing.

---

## 🚀 Key Features

### 1. Live AI Voice Agent (Telephony Flow)
- **Twilio Outbound Calling**: Integrates with Twilio to initiate voice calls to prospective buyers.
- **WebSocket Streaming**: Pipes live call audio bi-directionally over a Node.js WebSocket connection.
- **Sarvam AI Integration**: Powered by Sarvam AI's low-latency streaming models (**Saarika STT** for Speech-to-Text and **Bulbul TTS** for Text-to-Speech) to listen, think, and reply to the user naturally.

### 2. Premium Admin Portal & Lead Dashboard
- **Conversational Analytics**: Evaluates caller buying intent dynamically based on user utterances.
- **Max-Heap Priority Scoring**: Automatically ranks prospective leads by conversion probability using a custom Max-Heap data structure.
- **Live Call Records & Transcripts**: Displays active and completed calls with full conversational text logs and real-time streaming transcripts.

### 3. High-Performance Searching & Recommendations
- **Binary Search Price Filter**: Implements an optimized $O(\log N)$ binary search algorithm to filter property prices instantly on both backend and frontend.
- **Cosine Similarity Recommendations**: Suggests the top 4 most similar listings based on numerical specs using cosine similarity.

### 4. Robust Security & Authentication
- **OAuth Integration**: Support for Google OAuth and Firebase credentials.
- **JWT-Based Route Protection**: Standard JSON Web Tokens protect all private user features and admin operations.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), TailwindCSS, Lucide icons, Framer Motion (animations)
- **Backend**: Node.js, Express, WebSocket (`ws`)
- **Database & Cache**: MongoDB Atlas (Mongoose), Redis Caching
- **Services**: Twilio voice webhooks, Sarvam AI streaming SDK, Groq (Whisper + LLaMA)

---

## 📂 Project Architecture

```
ATLAS/
├── backend/
│   ├── config/             # DB & Redis connection scripts
│   ├── controllers/        # Express handlers (auth, properties, enquiries)
│   ├── middleware/         # JWT verify & Twilio signature auth
│   ├── models/             # Mongoose schemas (User, Property, Enquiry, CallRecord)
│   ├── routes/             # API routing
│   ├── services/           # WebSocket media stream handler for Twilio audio
│   ├── download_dataset.py # Python script to retrieve dataset images from Kaggle
│   ├── seed.js             # Seeding script for MongoDB
│   └── server.js           # Server entry point
├── frontend/
│   ├── public/             # Static assets (images, fonts)
│   ├── src/
│   │   ├── api/            # Axios API wrappers
│   │   ├── components/     # Custom UI components (Navbar, ProtectedRoute)
│   │   ├── context/        # Auth state provider
│   │   ├── hooks/          # React hooks (useVoiceAgent)
│   │   └── pages/          # App pages (Landing, Browse, Admin Dashboard)
│   ├── tailwind.config.js
│   └── vite.config.js
├── setup.js                # One-command project configuration installer
└── requirements.txt        # Python dependency list
```

---

## 📦 Getting Started & Setup

### Prerequisites
Make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python 3](https://www.python.org/) (with `pip`)
- [MongoDB Atlas](https://www.mongodb.com/atlas) (or local MongoDB)
- [Redis Server](https://redis.io/)
- [ngrok](https://ngrok.com/) (to tunnel Twilio webhooks to your local machine)

---

### Environment Setup

Create a `.env` file in the `backend/` directory and configure the variables:

```ini
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
ADMIN_ID=admin
ADMIN_PASSWORD=admin_password

# Twilio Credentials
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE=your_twilio_phone_number

# ngrok forwarding HTTPS URL
BASE_URL=https://your-ngrok-subdomain.ngrok-free.dev

# Sarvam AI API Key
SARVAM_API_KEY=your_sarvam_api_key

# Third-Party / Webhook configurations (Optional)
GROQ_API_KEY=your_groq_api_key
N8N_WEBHOOK_URL=your_webhook_url
```

Create a `.env` file in the `frontend/` directory:

```ini
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

---

### Installation & Run

1.  **Configure local ngrok forwarding**:
    Start the ngrok tunnel on the Express port to allow Twilio webhooks to reach your machine:
    ```bash
    ngrok http 5000
    ```
    Copy the generated HTTPS URL and paste it as the `BASE_URL` in `backend/.env`.

2.  **Execute the Setup Script**:
    Run the automated installer from the project root. This installs dependencies, downloads the Kaggle property image dataset, and seeds your MongoDB database:
    ```bash
    node setup.js
    ```

3.  **Start the Backend Server**:
    ```bash
    cd backend
    npm run dev
    ```

4.  **Start the Frontend Client**:
    ```bash
    cd frontend
    npm run dev
    ```
    Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📄 License
This project is licensed under the [ISC License](LICENSE).
