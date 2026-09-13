# Audio Clips Folder
Put your audio files (.mp3, .wav, .ogg, .m4a) in this directory:
/public/sounds/

Example files:
- /public/sounds/my-clip-1.mp3
- /public/sounds/laugh.mp3
- /public/sounds/squeak.wav

Then in `src/soundboardConfig.ts`, simply set:
audioSrc: "/sounds/my-clip-1.mp3"

When building for GitHub Pages or static hosting, these files are bundled directly into the distribution folder!
