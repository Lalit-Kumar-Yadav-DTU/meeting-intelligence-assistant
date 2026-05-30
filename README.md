# 🧠 Meeting Intelligence Assistant

> Unify fragmented meeting streams — video, slides, and audio — into a single queryable intelligence layer.

LIVE: https://meeting-intelligence-client.onrender.com/

---

## What It Does

The **Meeting Intelligence Assistant** solves the critical issue of **context fragmentation** in professional and academic workflows. It ingests three distinct multimodal inputs simultaneously:

- 🎥 A multiplexed screen recording / video
- 📄 Raw presentation slides (PDF)
- 🎙️ Extracted meeting audio tracks

Low-level binary manipulation maps all three to a **unified timeline**. Users then interact with a conversational interface to receive grounded, cross-modal answers that trace information across visual, textual, and spoken modalities — instantly.

---

---
<img width="1598" height="967" alt="image" src="https://github.com/user-attachments/assets/0cf5ea9d-67e1-44e5-87cd-1273cc950584" />

<img width="1565" height="958" alt="image" src="https://github.com/user-attachments/assets/dcee9009-5a8b-4721-a42e-ae52a67a6090" />

---

## Why It Was Built

Professional and technical teams lose countless hours bouncing between video playback, slide decks, and disconnected transcripts just to pinpoint key architectural conclusions or action items.

This system addresses that pain by combining:

- Low-level multimedia processing (FFmpeg stream parsing)
- Non-blocking async network architecture
- Native multimodal reasoning models on cloud GPU nodes

...to synthesize fragmented, time-series data streams into a clean, queryable interface.

---

## Prerequisites

Ensure your environment has **FFmpeg** installed and is running **Python 3.10+**:

```bash
sudo apt-get update && sudo apt-get install -y ffmpeg
```

---

## Getting Started

### 1. Clone & Set Up the Backend

```bash
cd /home/meeting-intelligence-assistant/backend
pip install fastapi uvicorn python-dotenv pypdf ffmpeg-python google-genai pydantic
```

Create a `.env` file inside the `backend/` directory:

```plaintext
GEMINI_API_KEY="your_actual_gemini_api_key_here"
```

Launch the processing server:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Set Up the Frontend

Open a second terminal, navigate to the frontend directory, and start the app:

```bash
cd /home/meeting-intelligence-assistant/frontend
npm install
npm run dev
```

Open your browser and visit: **http://localhost:5173**

---

## Architecture Decisions

### ⚙️ Decoupled Asynchronous Background Workers (FastAPI + BackgroundTasks)

Processing large video and document data (de-multiplexing streams, frame extraction, PDF parsing) takes considerable time. A synchronous architecture would block network worker processes, causing request timeouts and a frozen UI.

**Solution:** An asynchronous execution pool using FastAPI background workers with an in-memory job state tracker. Processing states update dynamically while the client polls freely without locking resources.

---

### 🎞️ 1-FPS Keyframe Video Frame Sampling

Streaming raw multi-gigabyte video files into an AI context window creates extreme token overhead, slows response times, and inflates API compute costs.

**Solution:** FFmpeg isolates and samples sequential keyframes at exactly **1 frame/second**. This preserves spatial artifacts and visual grounding cues while reducing data density by over **90%**.

---

### 🔌 Lazy-Loaded Client Strategy for Environment Context

Declaring cloud API endpoints globally causes immediate crashes during server boot if environment paths load even a millisecond late.

**Solution:** `genai.Client()` is initialized inside individual functional execution hooks (not at the global import layer), guaranteeing clean server launches and smooth connection initialization when a job starts.

---

## What AI Was Used For

| Component | Approach |
|---|---|
| Baseline UI layout styles | AI-assisted |
| Pydantic type validation definitions | AI-assisted |
| FastAPI CORS middleware setup | AI-assisted |
| Core filesystem ingestion directories | Hand-written |
| FFmpeg audio-resampling parameters (16kHz mono WAV) | Hand-written |
| Frontend state memory polling loop | Hand-written |
| `.env` context loading flow | Hand-written |
| Modern `google-genai` SDK integration | Manually overridden (rejected legacy suggestions) |
| Single multi-stream contextual payload architecture | Custom-designed (rejected multi-stage chaining) |

---

## Sample Queries & Cross-Modal Grounding

Here are three example scenarios demonstrating true cross-modal reasoning where the assistant synthesizes visual timelines, document text, and vocal audio simultaneously:

### 🔹 Query 1 — Cross-Modal Rhetoric Parsing
* **User Query:** *"What competitive rhetoric from Satya Nadella was discussed, at what timestamp did it occur, and which slide covers it?"*
* **Cross-Modal Resolution:** The engine scans the audio track to pinpoint the "making them dance" quote at timestamp **00:29**, automatically matching the visual slide index to display **Slide 4** for complete contextual grounding.

### 🔹 Query 2 — Core Strategic Takeaways
* **User Query:** *"What is the core message of the conversation regarding strategic autonomy, and what is the final slide recommendation?"*
* **Cross-Modal Resolution:** The model synthesizes the final conversational audio block with the text array of the document to explain the "playing our own music" strategy, anchoring the conclusion natively to **Slide 5** (`00:58`).

### 🔹 Query 3 — Investment Context Mapping
* **User Query:** *"Why did Microsoft make significant investments in OpenAI according to the meeting timeline?"*
* **Cross-Modal Resolution:** The system maps the opening acoustic tokens directly to **Slide 2** at timestamp **00:00**, extracting the underlying market anxiety regarding catching up to Google's footprint.

---

## Roadmap (Given 4 More Weeks)

- **Production Task Management** — Replace in-memory state with **Redis + Celery** for horizontal scaling across heavy media uploads.
- **Native GPU Engine Layer** — Host model weights directly in JarvisLabs GPU container VRAM using `faster-whisper` for audio and a self-hosted **Qwen-Omni** for local, secure inference.
- **Interactive Video Synchronization** — Integrate an HTML5 video component where clicking a timestamp badge in the dashboard automatically seeks the video to that exact second and renders the matching slide side-by-side.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | FastAPI |
| Media processing | FFmpeg |
| AI / Multimodal model | Google Gemini (`google-genai` SDK) |
| PDF parsing | pypdf |
| Data validation | Pydantic |
| Frontend | Vite (Node.js) |
| Environment config | python-dotenv |
