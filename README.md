# AnnotateHub

<div align="center">

**A powerful image annotation tool for adding interactive points, text notes, and geometric shapes to images and PDFs.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/DZ1120/annotate-hub)

[Live Demo](https://annotatehub.com) | [Features](#features) | [Installation](#installation) | [Usage](#usage)

</div>

## ✨ Features

- **🎨 Rich Annotation Tools**
  - Interactive numbered points with image attachments
  - Customizable text notes with styling options
  - Geometric shapes (rectangles, circles, lines, arrows)

- **📁 Layer Management**
  - Multi-layer organization with visibility controls
  - Drag-and-drop reordering
  - Batch operations (show/hide, select multiple)

- **💾 Export & Share**
  - Export as standalone HTML files
  - Re-import exported projects
  - No server required - works offline

- **🎯 Precision Controls**
  - Zoom and pan canvas (0.1x - 5x)
  - Background image editing (rotate, scale, position)
  - Keyboard shortcuts for efficiency

- **🌓 Modern UI**
  - Clean, Figma-inspired interface
  - Light and dark theme support
  - Responsive design

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/DZ1120/annotate-hub.git
cd annotate-hub

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5000`

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📖 Usage

### Basic Workflow

1. **Upload an Image or PDF**
   - Click the "Upload" button in the toolbar
   - Select your file (supports JPG, PNG, GIF, WebP, PDF)

2. **Add Annotations**
   - Select a tool from the toolbar (Point, Text, Shape)
   - Click or drag on the canvas to create annotations
   - Customize properties in the right panel

3. **Manage Layers**
   - View all annotations in the left panel
   - Toggle visibility with the eye icon
   - Reorder layers by dragging

4. **Export Your Work**
   - Click "Export" to save as HTML
   - Share the file or re-import it later

### Keyboard Shortcuts

- `Space + Drag` - Pan canvas
- `Mouse Wheel` - Zoom in/out
- `Delete` - Remove selected annotation
- `Esc` - Deselect

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript
- **UI Components**: shadcn/ui (Radix UI)
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **State Management**: Custom React hooks + Zustand pattern
- **Data Validation**: Zod schemas

## 📦 Project Structure

```
annotate-hub/
├── client/              # Frontend React application
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   ├── lib/         # Business logic
│   │   └── hooks/       # Custom React hooks
│   └── index.html
├── server/              # Backend Express server
├── shared/              # Shared types and schemas
└── package.json
```

## 🌐 Deployment

### Deploy to Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

### Deploy to Netlify

1. Connect your GitHub repository
2. Build command: `npm run build:static`
3. Publish directory: `dist/public`

### Deploy to GitHub Pages

1. Push to GitHub
2. Enable GitHub Pages in repository settings
3. Select "GitHub Actions" as source

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Yihang Zhu**

- GitHub: [@DZ1120](https://github.com/DZ1120)

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

Feel free to check the [issues page](https://github.com/DZ1120/annotate-hub/issues).

## ⭐ Show Your Support

Give a ⭐️ if this project helped you!

---

<div align="center">
Made with ❤️ by Yihang Zhu
</div>
