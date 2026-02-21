#!/usr/bin/env python3
"""
Simple YouTube Playlist Downloader and Merger
============================================
A streamlined version for quick playlist processing.

Usage: python simple_playlist_merger.py <playlist_url>
"""

import sys
from pathlib import Path
from moviepy import VideoFileClip, concatenate_videoclips
import yt_dlp


def download_and_merge_playlist(playlist_url, output_name="merged_playlist.mp4"):
    """Download playlist and merge into single video"""

    # Create temp directory
    temp_dir = Path("temp_playlist_videos")
    temp_dir.mkdir(exist_ok=True)

    print(f"🎬 Processing playlist: {playlist_url}")

    # Download playlist with yt-dlp
    ydl_opts = {
        "format": "best[ext=mp4]/best",
        "outtmpl": str(temp_dir / "%(playlist_index)02d_%(title)s.%(ext)s"),
        "ignoreerrors": True,
    }

    print("📥 Downloading videos...")
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([playlist_url])

    # Get downloaded files in order
    video_files = sorted(
        [
            f
            for f in temp_dir.iterdir()
            if f.suffix.lower() in [".mp4", ".mkv", ".avi", ".mov", ".webm"]
        ]
    )

    if not video_files:
        print("❌ No videos downloaded!")
        return False

    print(f"📹 Found {len(video_files)} videos, merging...")

    # Load and concatenate videos
    clips = [VideoFileClip(str(f)) for f in video_files]
    final_clip = concatenate_videoclips(clips, method="compose")

    # Write merged video
    print(f"💾 Saving merged video as: {output_name}")
    final_clip.write_videofile(output_name, codec="libx264", audio_codec="aac")

    # Cleanup
    for clip in clips:
        clip.close()
    final_clip.close()

    # Remove temp files
    for f in video_files:
        f.unlink()
    temp_dir.rmdir()

    print(f"✅ Success! Merged video saved as: {output_name}")
    return True


# if len(sys.argv) < 2:
#     playlist_url = input("Enter YouTube playlist URL: ").strip()
# else:
#     playlist_url = sys.argv[1]

# if not playlist_url:
#     print("❌ No URL provided!")
#     sys.exit(1)

playlist_url = "https://youtube.com/playlist?list=PLv1vL1XEZ1OS2ajs1BCE2_M88ybeSJmX0&si=h_l76B1SK5NLHLLr"

output_name = (
    input("Output filename (default: merged_playlist.mp4): ").strip() or "nlpandrew.mp4"
)
if not output_name.endswith(".mp4"):
    output_name += ".mp4"

download_and_merge_playlist(playlist_url, output_name)


# ffmpeg -f concat -safe 0 -i file_list.txt -c copy merged_course.mp4
# ls -1 *.mp4 | sort > file_list.txt
