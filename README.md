# Multimodal Meeting Intelligence Assistant

A production-grade, temporal cross-modal analytics system built to ingest meeting video streams, extracted multi-channel audio transcripts, and presentation decks to answer grounded, context-aware user queries across all modalities simultaneously.

---

## 🚀 What It Does
This assistant solves the problem of context fragmentation in asynchronous corporate and academic workflows by merging video recordings, speech transcripts, and presentation slides into a unified temporal index. Instead of manually scanning hours of footage or reading disjointed documents, users can query the engine across data types (e.g., matching spoken words to visual slide transitions) and receive accurate, grounded answers complete with timestamp markers, speaker logs, and slide numbers.

## 🎯 Why I Built This
I chose this problem because it represents a profound distributed data alignment and compute optimization challenge rather than a simple wrapper application. Building a system that accurately references unstructured video frames, textual slide layouts, and temporal audio waveforms requires designing a strict unified timeline index. This problem allowed me to dive deep into media processing bottlenecks using FFmpeg pipelines, explore efficient GPU model allocation hosting open-source vision-language architectures, and design non-blocking asynchronous streaming engines.

---

## 🛠️ System Architecture Decisions

### 1. Asynchronous Background Workers vs. Synchronous Request Threads
* **Decision:** File ingestion and multimedia splitting tasks are offloaded to FastAPI’s `BackgroundTasks` pool, returning an immediate `200 Ingested` event tracking ID to the client.
* **Reasoning:** Processing heavy multi-gigabyte meeting video files through FFmpeg handles intensive CPU/IO block operations. Running this synchronously would freeze the ASGI server event loop, causing client request timeouts and breaking production availability.

### 2. 1-FPS Discrete Keyframe Sampling vs. Continuous Frame Buffering
* **Decision:** Videos are sampled at a strict discrete rate of exactly 1 frame per second (FPS), generating sequentially named assets (`frame_0001.png`, `frame_0002.png`).
* **Reasoning:** Buffering full video tracks or extracting at native frame rates (30+ FPS) forces massive storage inflation and overwhelms vision-language models with redundant pixel configurations. A 1-FPS sampling rate creates a clean mathematical equivalence ($T\text{ seconds} = \text{frame\_000T.png}$), allowing linear temporal lookups while slashing downstream visual processing overhead by 96%.

### 3. Native vLLM Model Serving vs. Commercial Managed APIs
* **Decision:** Deployed an open OpenAI-compatible inference server running `Qwen2-VL-7B-Instruct` locally on the Jarvis Labs GPU instance via `vLLM`.
* **Reasoning:** To achieve true infrastructure ownership and avoid data privacy constraints or erratic external rate-limits, model inference is self-hosted. Choosing `vLLM` allows the platform to exploit PagedAttention mechanisms, drastically minimizing Key-Value (KV) cache fragmentation during long multi-modal document analysis sessions.

---

## 🤖 What I Used AI For

* **Automated Elements:** I utilized AI coding assistants to generate repetitive boilerplate elements, including standard Tailwind CSS component structures, initial FastAPI CORS configuration blocks, and sample multi-part form schema validators.
* **Hand-Written Core Logic:** All underlying FFmpeg pipeline commands, structural path routing mechanisms across OS environments, and temporal synchronization array joins were written purely by hand to guarantee absolute execution control.
* **Where I Overrode AI Suggestions:** The AI assistant initially recommended loading the entire presentation PDF and visual frame collections directly into memory heaps using basic list structures to execute searches. I completely vetoed this implementation because running massive image lists concurrently would trigger Out-Of-Memory (OOM) kernel panics on the host node. I overrode the suggestion by designing a disk-backed, chunked file-stream pipeline that pulls specific 1-FPS frame images sequentially only when the timestamp validation window requires it.

---

## 📈 Cross-Modal Validation Scenario Examples

The platform handles cross-modal queries by joining the extracted audio transcript timestamps with the visual slide transition layout. Here are three core example scenarios verified by the pipeline:

1.  **"What was the final decision on the pricing change?"**
    * *How it's answered:* The engine runs semantic searches over the audio transcript to find where pricing was debated, extracts the exact timestamp window, pulls the matching video frame to see the slide displayed, and cross-references it with the PDF deck to extract the exact figures.
2.  **"Which slide was being discussed when the budget came up?"**
    * *How it's answered:* The system matches the transcript segment discussing "budget allocations" to its timestamp ($T = 03:45$), looks up the 1-FPS visual frame index at `frame_0225.png`, maps the text elements on that slide to the layout extracted from the PDF, and grounds the answer to the user as **"Slide 4"**.
3.  **"Who disagreed with the timeline and what did they propose instead?"**
    * *How it's answered:* Uses temporal transcript isolation to detect vocal disagreement patterns and extracts the alternate timeline metric written on the shared screen recording frame at that precise moment.

---

## 📦 How to Run It

### Prerequisites
Ensure you have Python 3.10+, Node.js 18+, and the system-level `ffmpeg` binary installed on your host machine.

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

The interactive backend documentation will be accessible at http://127.0.0.1:8000/docs.
```

### 2. Frontend Setup
```bash
Bash
cd frontend
npm install
npm run dev