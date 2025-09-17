# Videos for New Home Page

## Video Requirements

The new home page now includes a dedicated video section. Place your video files in this directory with the following names:

### Platform Demo Video (Main Video Section)
- `platform-demo.mp4` - Main platform demonstration video (MP4 format)
- `platform-demo.webm` - Alternative format for better browser support (WebM format)

### Background Video (Optional - for future use)
- `water-irrigation-bg.mp4` - Background video file (MP4 format)
- `water-irrigation-bg.webm` - Alternative format for better browser support (WebM format)

## Video Specifications

### Recommended Video Properties:
- **Duration**: 10-30 seconds (will loop automatically)
- **Resolution**: 1920x1080 (Full HD) or higher
- **Aspect Ratio**: 16:9
- **File Size**: Keep under 10MB for optimal loading
- **Format**: MP4 (H.264) and WebM for best compatibility

### Platform Demo Video Content Suggestions:
- Screen recordings of the irrigation planning interface
- User interactions with the platform
- Before/after comparisons of irrigation efficiency
- Real farm implementations
- Data visualization and analytics
- Mobile app usage

### Background Video Content Suggestions:
- Water flowing through irrigation systems
- Sprinklers in action
- Agricultural fields with irrigation
- Water droplets or flowing water
- Green fields with irrigation equipment
- Abstract water patterns

### Video Settings:
- **Platform Demo**: Controls enabled, no autoplay
- **Background Video**: Autoplay (muted), Loop, No controls

## Fallback

If no video is provided, the page will show a beautiful gradient background:
- Blue to green gradient
- Matches the water/irrigation theme

## Performance Tips

1. **Compress the video** to reduce file size
2. **Use multiple formats** (MP4 + WebM) for better browser support
3. **Keep duration short** (10-30 seconds) since it loops
4. **Optimize for web** using tools like FFmpeg

## Example FFmpeg Commands

```bash
# Convert to MP4 (H.264)
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -c:a aac -b:a 128k water-irrigation-bg.mp4

# Convert to WebM
ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 -b:a 128k -c:a libopus water-irrigation-bg.webm
```

## Browser Support

- **MP4**: Supported by all modern browsers
- **WebM**: Better compression, supported by Chrome, Firefox, Edge
- **Fallback**: Gradient background for unsupported browsers
