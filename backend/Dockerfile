# Use an official lightweight Python image
FROM python:3.10-slim

# Install system dependencies (FFmpeg is mandatory for our media pipeline)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /lib/apt/lists/*

# Set the workspace directory inside the container
WORKDIR /app

# Copy requirements first to leverage Docker build caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application backend code
COPY . .

# Render exposes a dynamic PORT environment variable, default to 8000 locally
ENV PORT=8000

# Start Uvicorn pointing to the dynamic port assigned by Render
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port $PORT"]