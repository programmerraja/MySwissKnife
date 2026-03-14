ffmpeg -i video.mp4 -vn -acodec copy output-audio.aac
faster-whisper ./output-audio.aac  --device cpu --compute_type int8 -o  cnn.txt