from dotenv import load_dotenv
load_dotenv()  # Absolute top-level execution to load GEMINI_API_KEY into environment memory

import os
import shutil
from pydantic import BaseModel
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.pipeline import MeetingPipeline

class QueryRequest(BaseModel):
    question: str

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Phase: Safely initialize persistent storage directories
    settings.initialize_dirs()
    yield
    # Shutdown Phase: Clean up connections if needed

# Initialize the application instance with the unified lifespan manager
app = FastAPI(title="Meeting Intelligence Assistant Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store to keep track of background task status for the UI
processing_jobs = {}

def async_processing_worker(meeting_id: str, video_path: str, deck_path: str):
    """Background execution loop for handling heavy file decoding and AI synthesis."""
    try:
        processing_jobs[meeting_id] = "Processing: Extracting audio tracks..."
        
        # 1. Setup specific output workspace directories
        meeting_dir = os.path.join(settings.PROCESSED_DIR, meeting_id)
        frames_dir = os.path.join(meeting_dir, "frames")
        audio_output = os.path.join(meeting_dir, "meeting_audio.wav")
        os.makedirs(meeting_dir, exist_ok=True)

        # 2. Extract Audio track
        MeetingPipeline.extract_audio(video_path, audio_output)
        
        # 3. Extract 1-FPS Video Keyframes
        processing_jobs[meeting_id] = "Processing: Sampling visual frames..."
        MeetingPipeline.extract_frames(video_path, frames_dir, fps=1)
        
        # 4. Extract Presentation Text
        processing_jobs[meeting_id] = "Processing: Indexing document contents..."
        slide_data = MeetingPipeline.extract_pdf_text(deck_path)

        # 5. Run Multimodal Gemini Analytics Token Sync
        processing_jobs[meeting_id] = "Processing: Orchestrating timeline sync via Gemini API..."
        intelligence_report = MeetingPipeline.generate_intelligence_report(audio_output, slide_data)

        # 6. Pipeline completion update mapped to the UI expectations
        processing_jobs[meeting_id] = {
            "status": "completed",
            "audio_path": audio_output,
            "frames_directory": frames_dir,
            "slide_count": len(slide_data),
            "slide_index": slide_data,                      # Stored cleanly for interactive Q&A grounding
            "analytics": intelligence_report                  # Fully passes the structured timeline & action items
        }
        
    except Exception as e:
        processing_jobs[meeting_id] = f"Failed: {str(e)}"

@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "FastAPI processing cluster online"}

@app.post("/api/upload")
async def upload_meeting_files(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    deck: UploadFile = File(...)
):
    if not video.filename.lower().endswith(('.mp4', '.mkv', '.avi')):
        raise HTTPException(status_code=400, detail="Invalid video format.")
    if not deck.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Invalid document format. PDF required.")

    # Create a unique processing workspace id from filename
    meeting_id = os.path.splitext(video.filename)[0].replace(" ", "_")
    
    video_path = os.path.join(settings.UPLOAD_DIR, video.filename)
    deck_path = os.path.join(settings.UPLOAD_DIR, deck.filename)

    try:
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
        with open(deck_path, "wb") as buffer:
            shutil.copyfileobj(deck.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File save error: {str(e)}")

    # Delegate the heavy decoding pipeline to our background worker threads
    processing_jobs[meeting_id] = "Queued: Initializing file channels..."
    background_tasks.add_task(async_processing_worker, meeting_id, video_path, deck_path)

    return {
        "status": "ingested",
        "meeting_id": meeting_id,
        "message": "Files saved. Background ingestion processing started."
    }

@app.get("/api/status/{meeting_id}")
def get_processing_status(meeting_id: str):
    """Endpoint for the frontend to poll and see the pipeline's progress."""
    if meeting_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Meeting pipeline instance not found.")
    return {"meeting_id": meeting_id, "progress": processing_jobs[meeting_id]}

@app.post("/api/query/{meeting_id}")
def query_meeting_context(meeting_id: str, payload: QueryRequest):
    """Endpoint to ask custom, open-ended questions grounded in the meeting data."""
    if meeting_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Meeting profile instance not found.")

    job_data = processing_jobs[meeting_id]

    # Check if the pipeline has finished processing completely
    if isinstance(job_data, str) or job_data.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Meeting asset is still processing or failed.")

    try:
        # Pass the audio path directly so the query layer can perform raw audio extraction
        answer = MeetingPipeline.answer_meeting_query(
            question=payload.question,
            audio_path=job_data.get("audio_path"),
            slide_index=job_data.get("slide_index", [])
        )
        return {"meeting_id": meeting_id, "answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))