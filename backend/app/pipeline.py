import os
import ffmpeg
from pypdf import PdfReader
import logging

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
            
            # Pattern creates names like: frame_0001.png, frame_0002.png
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