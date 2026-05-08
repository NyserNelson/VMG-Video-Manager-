# VMG (Video Manager)
This application is a lightweight desktop video editing tool which is dedicated to helping you trim multiple clips faster.

# Core Features
- Select a folder to automatically list all video files, supporting quick switching.
- During export, support selection of quality 4K→480p, frame rate 120→24fps, and encoding speed from ultrafast to slow.
- Tasks run independently in the background queue, allowing the user to trim other videos while waiting for the video to export. It also allows multiple exports.
- Deleted videos are moved to the system **recycle bin**, allowing for easy recovery and preventing accidental deletion.
- Supports direct renaming of video file names within the application (without leaving the program) and automatically resolves conflicts caused by file usage.
- Built-in Simplified Chinese, Traditional Chinese, and English, which can be switched at any time.

# Development
- Relies on FFmpeg for video processing, but installation is extremely simple: just place `ffmpeg.exe` in the `ffmpeg` folder in the program directory; no system environment variable configuration required.
- Uses Electron + JavaScript, ready to use out of the box, no runtime installation required.

If Windows shows **“Windows protected your PC”**, it is because the application is not digitally signed yet.

To continue running the program:

1. Click **“More info”**
2. Click **“Run anyway”**

After that, the application will start normally.
