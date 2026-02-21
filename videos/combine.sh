# combine all mp4 files in the current directory into a single file called combined.mp4
find . -type f -name "*.mp4" | sort | sed "s/^/file '/; s/$/'/" > list.txt && ffmpeg -f concat -safe 0 -i list.txt -c copy combined.mp4
