#!/bin/bash

set -e

############################################
# Install dependency if missing
############################################

install_ffmpeg() {

    if command -v ffmpeg >/dev/null 2>&1; then
        echo "FFmpeg already installed"
        return
    fi

    echo "Installing FFmpeg..."

    if command -v apt >/dev/null 2>&1; then
        sudo apt update
        sudo apt install -y ffmpeg

    elif command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y ffmpeg

    elif command -v pacman >/dev/null 2>&1; then
        sudo pacman -Sy ffmpeg

    else
        echo "Unsupported package manager. Install ffmpeg manually."
        exit 1
    fi
}


install_faster_whisper() {

    if command -v faster-whisper >/dev/null 2>&1; then
        echo "faster-whisper already installed"
        return
    fi

    echo "Installing faster-whisper..."

    if ! command -v pip3 >/dev/null 2>&1; then
        echo "Installing python3-pip..."
        sudo apt install -y python3-pip
    fi

    pip3 install --user faster-whisper-cli
}

############################################
# Check arguments
############################################

if [ -z "$1" ]; then
    echo "Usage:"
    echo "./transcribe_video.sh video.mp4"
    exit 1
fi

VIDEO="$1"

if [ ! -f "$VIDEO" ]; then
    echo "Video file not found!"
    exit 1
fi


############################################
# Install tools
############################################

install_ffmpeg
install_faster_whisper


############################################
# Prepare filenames
############################################

FILENAME=$(basename "${VIDEO%.*}")
AUDIO="${FILENAME}.wav"
TRANSCRIPT="${FILENAME}.txt"

echo "Video file: $VIDEO"
echo "Audio file: $AUDIO"
echo "Transcript: $TRANSCRIPT"


############################################
# Extract audio
############################################

echo "Extracting audio..."

ffmpeg -loglevel error \
-i "$VIDEO" \
-vn \
-ac 1 \
-ar 16000 \
-f wav \
"$AUDIO" \
-y


############################################
# Transcribe
############################################

echo "Running transcription..."

faster-whisper "$AUDIO" \
--device cpu \
--compute_type int8 \
--beam_size 1 \
--best_of 1 \
--no_timestamps \
-o "$TRANSCRIPT"


############################################
# Done
############################################

echo "-------------------------------------"
echo "Transcription finished"
echo "Saved to: $TRANSCRIPT"
echo "-------------------------------------"