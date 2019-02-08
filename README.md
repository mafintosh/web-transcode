# web-transcode

CLI program to transcode video + captions for playback in a Browser

```sh
npm i -g web-transcode

# will create web/video.mp4, web/video.vtt, web/video.html
#
# video.mp4 is the transcoded video with video codec h264
# video.vtt is the vtt captions file
#
# video.html will contain a simple fullscreen player
# that adds the subtitles to the video

web-transcode -i video.something -o web -s subtitle.srt
```

Requires ffmpeg to be installed in your PATH.
