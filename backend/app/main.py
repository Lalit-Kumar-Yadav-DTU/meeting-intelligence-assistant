from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.pipeline import MeetingPipeline
import os
import shutil

app = FastAPI(title="Meeting Intelligence Assistant Backend")

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
    """Background execution loop for handling heavy file decoding."""
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

        # 5. Pipeline completion update
        processing_jobs[meeting_id] = {
            "status": "completed",
            "audio_path": audio_output,
            "frames_directory": frames_dir,
            "slide_count": len(slide_data),
            "slide_index": slide_data
        }
    except Exception as e:
        processing_jobs[meeting_id] = f"Failed: {str(e)}"

@app.on_event("startup")
def startup_event():
    settings.initialize_dirs()

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