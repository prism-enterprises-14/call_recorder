# CallVault — Enterprise Call Recording & Compliance Platform

CallVault is a production-ready, cloud-native call recording web application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL, Auth, Storage)**.

Designed for high-reliability environments and deployable on **Vercel**, CallVault captures authorized WebRTC browser audio sessions, mixes multi-stream inputs in real time, enforces strict two-party legal consent gates, and secures audio assets in private cloud buckets with time-limited signed URLs.

---

## 1. Architectural Highlights

### Multi-Stream Audio Mixing Engine
Ordinary browser recording implementations only capture the user's local microphone, ignoring remote call participants. CallVault solves this by routing both streams into a unified **Web Audio API (`AudioContext`)** mixing graph:
- **Local Track**: Captured via `navigator.mediaDevices.getUserMedia({ audio: true })` with acoustic echo cancellation and noise suppression.
- **Remote WebRTC Track**: Extracted from authorized incoming peer audio stream or telephony bridge.
- **AudioContext Destination**: Both audio source nodes connect to `AudioContext.createMediaStreamDestination()`.
- **Analyser Node**: A 64/128-bin `AnalyserNode` computes real-time frequency/amplitude data to render live waveforms.
- **MediaRecorder**: Compresses the combined stream into WebM (Opus codec at up to 256 kbps) or uncompressed WAV.

```
[Local Microphone]    ──> [MediaStreamAudioSourceNode 1] ──┐
                                                           ├──> [createMediaStreamDestination] ──> [MediaRecorder] ──> [Supabase Storage]
[Remote WebRTC Track] ──> [MediaStreamAudioSourceNode 2] ──┘                 │
                                                                             └──> [AnalyserNode] ──> [Live Waveform UI]
```

### Participant Consent Engine
- **Two-Party / All-Party Legal Enforcement**: Recording controls remain hard-locked until all participants grant explicit consent.
- **Audible Disclosure Chime**: Injects a synthesized dual-frequency sine tone (587 Hz / 880 Hz) directly into the call stream upon recording start.
- **Audit Logging**: Every consent decision is recorded with a cryptographically secure session ID, participant identifier, and timestamp in the `recording_consents` table.

### Private Cloud Storage & Signed Streaming
- Audio files are stored in a private Supabase Storage bucket named `call-recordings`.
- Path structure: `call-recordings/{user_id}/{recording_id}/recording.webm`
- Files are **never publicly exposed**. The custom audio player streams private audio using time-limited signed URLs (default 1-hour expiration) generated via server-side verification.

### WhatsApp Call Recording Architecture
Browsers operate in a sandboxed security model that cannot covertly spy on background native applications. CallVault supports WhatsApp call recording through two legitimate, production-compliant paths:
1. **WhatsApp Web / Tab Audio Capture (`getDisplayMedia`)**: Users click **"Record WhatsApp Call"**, which prompts the standard authorized browser media picker to capture the WhatsApp Web tab or WhatsApp desktop call window with audio sharing. The incoming WhatsApp audio track is isolated, synchronized with the local microphone in the Web Audio mixer, and automatically finalizes when the call hangs up.
2. **WhatsApp Business Voice API (`/api/telephony/whatsapp`)**: Webhook dispatcher supporting Meta WhatsApp Cloud Calling & Twilio for WhatsApp, automatically detecting call answered/completed events and streaming the audio.

### Call Detection Gate (Zero Noise Guarantee)
- Recording only engages when an authorized call stream is actively detected.
- If no call is connected, the studio prompts the operator to choose a call connection (WhatsApp or WebRTC) rather than recording idle background noise.
- All test oscillator beep noises and disclosure chimes have been removed for clean, noise-free audio capture.

### Telephony Provider Integration (Twilio / Telnyx)
- Dedicated webhook handler (`/api/telephony/webhooks`) with **HMAC-SHA1 signature verification**.
- In-memory and database event deduplication to safely handle retried provider webhooks.
- Call lifecycle synchronization (`initiated` -> `ringing` -> `in-progress` -> `completed`).
- Automated audio ingestion upon `recording_completed` callbacks.

---

## 2. Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4 (Custom Dark SaaS Theme)
- **Icons**: Lucide React
- **Animations**: Framer Motion & CSS Micro-Interactions
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth (Email/Password, Session Management, Password Recovery)
- **Object Storage**: Supabase Storage (`call-recordings` private bucket)
- **Audio Capture**: MediaRecorder API & Web Audio API
- **Deployment**: Vercel

---

## 3. Database Schema

The database schema is defined in [`supabase/migrations/001_initial_schema.sql`](file:///supabase/migrations/001_initial_schema.sql):

| Table | Description | RLS Policy |
| :--- | :--- | :--- |
| `profiles` | User accounts, emails, and full names | `auth.uid() = id` |
| `call_sessions` | WebRTC and telephony call sessions | `auth.uid() = user_id` |
| `recording_consents` | Participant consent audit records | Linked via `call_sessions.user_id = auth.uid()` |
| `recordings` | Finalized recording metadata & storage paths | `auth.uid() = user_id` |

---

## 4. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Populate the required keys:

```ini
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Telephony Integration (Twilio)
TELEPHONY_PROVIDER=twilio
TELEPHONY_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TELEPHONY_AUTH_TOKEN=your_auth_token_here

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Zero-Config Sandbox Mode**: When running locally without Supabase keys set, CallVault automatically runs in **Local Sandbox Mode** with IndexedDB local audio storage and pre-seeded demonstration data.

---

## 5. Local Setup & Running

```bash
# 1. Install dependencies
npm install

# 2. Apply database migrations to Supabase
# Run the SQL commands in supabase/migrations/001_initial_schema.sql
# inside your Supabase Project SQL Editor.

# 3. Start local development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Testing & Verification

Run the production build:

```bash
npm run build
```

### Verified Scenarios:
1. **User Authentication**: Login, registration, forgot password, demo mode fallback.
2. **WebRTC Dual-Stream Recording**: Real-time microphone capture mixed with simulated/remote peer audio.
3. **Consent Gating**: Controls enable only when all parties consent; instant pause upon consent revocation.
4. **Live Waveform & Audio Metering**: 32-band real-time audio amplitude visualization.
5. **Private Cloud Storage Upload**: Audio streaming to `call-recordings/{userId}/{recordingId}/recording.webm`.
6. **Custom Audio Player**: Time scrubbing, +/-10s seek, speed controls (0.5x to 2x), volume adjustment, signed URL streaming, direct download.
7. **Recording Library Management**: Instant search, sorting (date, duration, size), inline renaming, permanent deletion with cloud object cleanup, and metadata inspector.
8. **Telephony Webhook Dispatcher**: Signature validation, idempotency deduplication, and automated recording ingestion.

---

## 7. Vercel Deployment

1. Push your repository to GitHub.
2. Import the project in [Vercel Dashboard](https://vercel.com/new).
3. Set the Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TELEPHONY_ACCOUNT_SID`
   - `TELEPHONY_AUTH_TOKEN`
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel production domain, e.g. `https://callvault.vercel.app`)
4. Deploy! Next.js App Router and serverless routes will be optimized automatically with the configured `vercel.json` security headers.

---

## 8. License

MIT License. Designed and engineered for production deployment.
