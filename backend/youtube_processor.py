import yt_dlp
import os
import tempfile
import imageio_ffmpeg
import subprocess
import time
import socket


# Configure socket defaults for better connection handling
socket.setdefaulttimeout(30)


def _get_ffmpeg_exe():
    """Return bundled FFmpeg executable path from imageio-ffmpeg."""
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    if not ffmpeg_exe or not os.path.exists(ffmpeg_exe):
        raise Exception("Bundled FFmpeg binary not found")
    return ffmpeg_exe


def _convert_to_wav(input_path, output_path):
    """Convert arbitrary audio/video file to mono 16k WAV using ffmpeg."""
    ffmpeg_exe = _get_ffmpeg_exe()

    cmd = [
        ffmpeg_exe,
        "-y",
        "-i",
        input_path,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 or not os.path.exists(output_path):
        stderr = (result.stderr or "").strip()
        if stderr:
            raise Exception(f"ffmpeg conversion failed: {stderr}")
        raise Exception("ffmpeg conversion failed")


def _download_youtube_audio_with_retry(youtube_url, max_retries=3):
    """Download YouTube audio with exponential backoff retry logic."""
    
    temp_dir = tempfile.gettempdir()
    temp_audio_path = os.path.join(temp_dir, "youtube_audio_temp")
    os.makedirs(temp_audio_path, exist_ok=True)
    
    last_error = None
    
    for attempt in range(max_retries):
        try:
            # yt_dlp options with connection improvements
            ydl_opts = {
                'format': 'bestaudio',
                'outtmpl': os.path.join(temp_audio_path, '%(title)s.%(ext)s'),
                'quiet': False,
                'no_warnings': False,
                'extract_flat': False,
                'socket_timeout': 30,
                'http_chunk_size': 1048576,  # 1MB chunks to avoid incomplete reads
                'retries': 5,
                'skip_unavailable_fragments': True,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(youtube_url, download=True)
                base_filename = ydl.prepare_filename(info)
                
                if not os.path.exists(base_filename):
                    # Search for the downloaded file
                    downloaded_file = None
                    for file in os.listdir(temp_audio_path):
                        if file.startswith(os.path.basename(base_filename).split('.')[0]):
                            downloaded_file = os.path.join(temp_audio_path, file)
                            break
                    
                    if not downloaded_file:
                        raise Exception("Failed to locate downloaded audio file")
                    base_filename = downloaded_file
            
            return base_filename
        
        except Exception as e:
            last_error = e
            error_msg = str(e).lower()
            
            # Only retry on network-related errors
            if any(phrase in error_msg for phrase in ['incompleteread', 'connection', 'timeout', 'econnreset', 'broken pipe']):
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) + 1  # Exponential backoff: 1s, 2s, 4s
                    print(f"Download attempt {attempt + 1} failed: {e}. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
            
            # For non-network errors, fail immediately
            raise
    
    raise Exception(f"Failed to download YouTube audio after {max_retries} attempts: {last_error}")


def download_youtube_audio(youtube_url):
    """
    Download audio from YouTube URL and convert it to WAV format.
    Returns the path to the audio file.
    Uses a bundled FFmpeg binary via imageio-ffmpeg (no system FFmpeg install needed).
    """
    
    try:
        # Download with retry logic
        base_filename = _download_youtube_audio_with_retry(youtube_url, max_retries=3)
        
        # Convert to WAV using bundled FFmpeg directly.
        audio_file_wav = os.path.splitext(base_filename)[0] + '.wav'
        
        try:
            _convert_to_wav(base_filename, audio_file_wav)

            # Delete the original downloaded file
            if os.path.exists(base_filename) and base_filename != audio_file_wav:
                os.remove(base_filename)
            
            return audio_file_wav
        
        except Exception as e:
            raise Exception(f"Failed to convert audio: {str(e)}")
    
    except Exception as e:
        # Clean up on error
        temp_dir = tempfile.gettempdir()
        temp_audio_path = os.path.join(temp_dir, "youtube_audio_temp")
        if os.path.exists(temp_audio_path):
            try:
                import shutil
                shutil.rmtree(temp_audio_path)
            except:
                pass
        raise Exception(f"Failed to download YouTube audio: {str(e)}")


def get_video_title(youtube_url):
    """
    Get the title of the YouTube video.
    Useful for naming the note.
    """
    
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
            return info.get('title', 'YouTube Note')
    
    except Exception as e:
        return 'YouTube Note'


def validate_youtube_url(url):
    """
    Validate if the provided URL is a valid YouTube URL.
    """
    
    youtube_patterns = [
        'youtube.com/watch',
        'youtube.com/playlist',
        'youtu.be/',
        'youtube.com/embed'
    ]
    
    return any(pattern in url for pattern in youtube_patterns)
