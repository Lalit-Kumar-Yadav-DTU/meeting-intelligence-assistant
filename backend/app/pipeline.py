import os
import json
import ffmpeg
import logging
from pypdf import PdfReader
from google import genai
from google.genai import types

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MeetingPipeline:
    @staticmethod
    def extract_audio(video_path: str, output_audio_path: str) -> str:
        """
        Extracts a clean mono WAV audio track from the video,
        resampled to 16kHz for optimal transcription performance.
        """
        try:
            logger.info(f"Starting audio extraction for: {video_path}")
            (
                ffmpeg
                .input(video_path)
                .output(output_audio_path, acodec='pcm_s16le', ac=1, ar='16000')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            logger.info(f"Audio successfully extracted to: {output_audio_path}")
            return output_audio_path
        except ffmpeg.Error as e:
            logger.error(f"FFmpeg Audio Error: {e.stderr.decode('utf8')}")
            raise Exception(f"FFmpeg audio extraction failed: {e.stderr.decode('utf8')}")

    @staticmethod
    def extract_frames(video_path: str, output_frames_dir: str, fps: int = 1) -> str:
        """
        Samples the video at a rate of X frame(s) per second
        and saves them as sequential PNG images for visual grounding.
        """
        try:
            os.makedirs(output_frames_dir, exist_ok=True)
            logger.info(f"Starting frame extraction at {fps} FPS to: {output_frames_dir}")
            
            output_pattern = os.path.join(output_frames_dir, "frame_%04d.png")
            (
                ffmpeg
                .input(video_path)
                .output(output_pattern, vf=f'fps={fps}')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            logger.info("Visual frame sampling completed successfully.")
            return output_frames_dir
        except ffmpeg.Error as e:
            logger.error(f"FFmpeg Frame Error: {e.stderr.decode('utf8')}")
            raise Exception(f"FFmpeg frame extraction failed: {e.stderr.decode('utf8')}")

    @staticmethod
    def extract_pdf_text(pdf_path: str) -> list:
        """
        Parses the presentation deck slide-by-slide, 
        returning a text index mapped by slide/page numbers.
        """
        logger.info(f"Parsing document slides: {pdf_path}")
        slide_index = []
        
        try:
            reader = PdfReader(pdf_path)
            for page_num, page in enumerate(reader.pages, start=1):
                text_content = page.extract_text() or ""
                slide_index.append({
                    "slide_number": page_num,
                    "raw_text": text_content.strip()
                })
            logger.info(f"Successfully indexed {len(slide_index)} slides.")
            return slide_index
        except Exception as e:
            logger.error(f"PDF Parsing Error: {str(e)}")
            raise Exception(f"Failed to index slide document: {str(e)}")

    @staticmethod
    def generate_intelligence_report(audio_path: str, slide_index: list) -> dict:
        """
        Uploads the raw meeting audio track to Gemini and blends it with 
        the scraped presentation slide text to formulate a structured, 
        time-synchronized timeline analysis.
        """
        logger.info("Initializing multimodal analysis pipeline via modern GenAI SDK...")
        
        try:
            # Initialize client at execution time to ensure system environment keys are fully populated
            client = genai.Client()

            # 1. Stage the file payload using the updated files API
            logger.info("Uploading audio track to Gemini storage cluster...")
            audio_file = client.files.upload(file=audio_path)
            logger.info(f"Audio asset uploaded successfully. Remote Target URI: {audio_file.name}")

            # 2. Build the structured analysis prompt
            prompt = f"""
            You are an advanced Meeting Intelligence Orchestrator. You have been provided with the raw audio track of a recorded meeting presentation and a sequential text index of the slides displayed during the talk.

            Here is the text content from the presentation deck slide-by-slide:
            {json.dumps(slide_index, indent=2)}

            Analyze the audio track and map it against the presentation context to generate a comprehensive JSON report containing:
            1. 'executive_summary': A high-level abstract of the main meeting outcomes.
            2. 'timeline': A sequential array of chapters or key milestones. Each entry MUST include:
               - 'timestamp': The approximate time mark (MM:SS) in the audio when this topic is discussed.
               - 'topic': A short summary title of the current discussion point.
               - 'slide_reference': The precise 'slide_number' from the provided index that corresponds structurally to this part of the talk.
               - 'details': Contextual bullet points elaborating on what was explained.
            3. 'action_items': A strict array of deliverables assigning who needs to do what based on the audio conversation.

            Return your absolute final response as a clean, standard, parseable JSON object adhering strictly to this schema. Do not wrap it in markdown block tags.
            """

            # 3. Call the generation model using formal configuration types
            logger.info("Executing multimodal token sync orchestration...")
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[audio_file, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )

            # 4. Clean up the uploaded asset from remote cloud staging
            logger.info("Cleaning up cloud staging files...")
            client.files.delete(name=audio_file.name)

            return json.loads(response.text)

        except Exception as e:
            logger.error(f"Gemini Intelligence Engine Failure: {str(e)}")
            raise Exception(f"AI synchronization pipeline failed: {str(e)}")