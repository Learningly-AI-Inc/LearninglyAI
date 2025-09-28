# Math Visualizer Setup Guide

This guide will help you set up the Math Visualizer feature in your MERN learning platform.

## Overview

The Math Visualizer integrates 3Blue1Brown-style animations using Manim Community Edition. It provides both pre-rendered animations and dynamic scene rendering capabilities.

## Prerequisites

- Node.js 18.17.0 or higher
- Python 3.8 or higher
- Git (for cloning repositories)

## Installation Steps

### 1. Install Python Dependencies

```bash
# Install Manim Community Edition and dependencies
pip install -r requirements.txt
```

### 2. Verify Manim Installation

```bash
# Check if Manim is properly installed
manim --version
```

### 3. Set up Directory Structure

The following directories should be created (they're created automatically when needed):

```
learning/
├── manim_scenes/          # Python scene definitions
├── public/animations/     # Pre-rendered video files
├── public/images/math/    # Math-related images and thumbnails
├── temp/manim_renders/    # Temporary files (auto-created)
└── scripts/               # Setup and utility scripts
```

### 4. Pre-render Example Scenes

```bash
# Navigate to the manim_scenes directory
cd manim_scenes

# Render the parabola example
manim -ql parabola.py Parabola

# Render the circle area example  
manim -ql circle_area.py CircleArea

# Render the Fourier series example
manim -ql fourier.py FourierSeries
```

### 5. Move Rendered Videos

After rendering, move the generated MP4 files to the public/animations/ directory:

```bash
# Example: Copy rendered videos to public directory
cp media/videos/parabola/480p30/Parabola.mp4 ../public/animations/parabola.mp4
cp media/videos/circle_area/480p30/CircleArea.mp4 ../public/animations/circle-area.mp4
cp media/videos/fourier/480p30/FourierSeries.mp4 ../public/animations/fourier.mp4
```

## Usage

### Accessing the Math Visualizer

1. Start your Next.js development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/math-viz`

### Pre-rendered Animations

The Math Visualizer includes several pre-rendered animations:

- **Parabola Function**: Interactive quadratic function visualization
- **Circle Area**: Animation showing how π relates to circle area  
- **Fourier Series**: Visual breakdown of Fourier series approximation

### Dynamic Scene Creation

Users can create custom animations by:

1. Writing Manim scene code in the provided editor
2. Clicking "Render Animation" to generate the video
3. Viewing the result in the integrated video player

### Security Features

The dynamic renderer includes several security measures:

- **Code Size Limit**: Maximum 5KB per scene
- **Import Restrictions**: Only Manim core modules allowed
- **Execution Timeout**: 20-second rendering limit
- **File System Protection**: No file operations permitted
- **Automatic Cleanup**: Temporary files are automatically removed

## API Endpoints

### POST /api/render

Renders a custom Manim scene dynamically.

**Request Body:**
```json
{
  "sceneName": "CustomScene",
  "sceneCode": "from manim import *\n\nclass CustomScene(Scene):\n    def construct(self):\n        # Your scene code here\n        pass"
}
```

**Response:**
- Success: Returns MP4 video file (Content-Type: video/mp4)
- Error: Returns JSON error message

## Troubleshooting

### Common Issues

1. **Manim not found**: Ensure Python and pip are properly installed
2. **Rendering timeout**: Complex scenes may need optimization
3. **Import errors**: Only use allowed Manim imports
4. **Video not displaying**: Check file paths and permissions

### System Requirements

- **RAM**: Minimum 4GB (8GB recommended for complex scenes)
- **Storage**: At least 1GB free space for temporary files
- **Network**: Internet connection for initial Manim installation

## Adding New Pre-rendered Scenes

1. Create a new Python file in `manim_scenes/`
2. Define your scene class inheriting from `Scene`
3. Render using `manim -ql your_file.py YourSceneName`
4. Copy the output to `public/animations/`
5. Update the `preRenderedScenes` array in the React component

## Performance Optimization

- Use `-ql` flag for web-optimized quality
- Keep scenes under 30 seconds for better user experience
- Implement caching for frequently requested scenes
- Consider using WebM format for smaller file sizes

## Contributing

When adding new mathematical visualizations:

1. Follow Manim best practices
2. Include clear comments in scene code
3. Test rendering locally before deployment
4. Add appropriate error handling
5. Update documentation as needed

For more information on Manim, visit: https://docs.manim.community/