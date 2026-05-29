import os

class Settings:
    # Points to the root meeting-intelligence-assistant directory
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # Maps directly to the root storage paths
    UPLOAD_DIR = os.path.join(BASE_DIR, "storage", "uploads")
    PROCESSED_DIR = os.path.join(BASE_DIR, "storage", "processed")
    
    @classmethod
    def initialize_dirs(cls):
        """Creates basic processing folders if they don't exist yet."""
        for path in [cls.UPLOAD_DIR, cls.PROCESSED_DIR]:
            os.makedirs(path, exist_ok=True)

settings = Settings()