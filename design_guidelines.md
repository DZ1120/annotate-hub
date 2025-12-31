# Design Guidelines: Interactive Image Annotation Tool

## Design Approach
**Selected System:** Material Design 3 adapted for productivity tools
**Rationale:** This is a utility-focused application requiring precision interactions, clear visual hierarchy for complex UI controls, and consistent component behavior. Drawing inspiration from Figma, Miro, and Google Maps' annotation patterns.

## Layout Architecture

**Primary Structure:**
- Full viewport canvas-based layout (100vh, 100vw)
- Fixed top toolbar (h-16) with upload, tool selection, and settings
- Left sidebar (w-64) for layers/annotations list (collapsible to w-12)
- Right properties panel (w-80) for editing selected elements (contextual visibility)
- Central canvas fills remaining space with zoom/pan controls

**Spacing System:** Use Tailwind units: 2, 4, 8, 12, 16 for consistent rhythm
- Toolbar padding: p-4
- Panel spacing: p-6 with gap-4 between elements
- Button spacing: gap-2 for groups, gap-4 between sections

## Typography Hierarchy

**Fonts:** Inter (UI) + JetBrains Mono (numbering/coordinates)
- Toolbar/Menu Items: text-sm font-medium (14px)
- Panel Headers: text-base font-semibold (16px)
- Input Labels: text-xs font-medium uppercase tracking-wide (12px)
- Point Numbers: text-xs font-bold (overlay on canvas)
- Body Text: text-sm (14px)

## Component Library

**Toolbar Components:**
1. File Upload Button: Outlined button with upload icon, accepts image/PDF
2. Tool Selector: Segmented control (Add Point | Add Text | Add Shape | Select)
3. Zoom Controls: Button group with +/- and fit-to-screen icon
4. Settings: Icon button triggering dropdown menu

**Canvas Elements:**
1. Annotation Points:
   - Circular markers with numbered labels
   - Default size: 32px diameter, adjustable 16-64px
   - Hover state: scale(1.1) with subtle shadow
   - Selected state: double ring outline
   - Click interaction: Modal/popover showing embedded image

2. Text Notes:
   - Draggable text boxes with resize handles
   - White background, subtle border, drop shadow
   - Rich text editor in properties panel when selected

3. Geometric Shapes:
   - Rectangle, Circle, Arrow, Line tools
   - Adjustable stroke width (1-8px)
   - Dashed/solid style toggle

**Side Panels:**
1. Layers Panel (Left):
   - Hierarchical list of all annotations
   - Eye icon for visibility toggle
   - Lock icon for editing prevention
   - Drag handles for z-index reordering

2. Properties Panel (Right):
   - Point Properties: Size slider (16-64px), color picker
   - Image Upload: Drop zone for point attachment
   - Text Properties: Font size, alignment, formatting
   - Shape Properties: Stroke width, style, fill opacity

**Modal/Popover:**
- Image Preview: When clicking annotation point
- Semi-transparent backdrop (backdrop-blur-sm)
- Centered modal with close button
- Image scales to fit viewport (max 80vh, 80vw)

## Interaction Patterns

**Canvas Behavior:**
- Pan: Click + drag on empty canvas area
- Zoom: Scroll wheel or pinch gesture
- Select: Click on annotation element
- Multi-select: Cmd/Ctrl + click or drag selection box

**Point Creation:**
1. Select "Add Point" tool
2. Click anywhere on image
3. Auto-increment number appears
4. Properties panel opens for customization
5. Optional: Upload image to attach

**Keyboard Shortcuts:**
- Delete: Remove selected element
- Esc: Deselect all
- Cmd/Ctrl + Z: Undo
- Space + drag: Pan canvas (when holding space)

## Visual Specifications

**Canvas Treatment:**
- Checkerboard pattern for transparent areas
- Drop shadow on uploaded image: shadow-2xl
- Canvas boundary: Subtle border distinguishing from background

**Control Elements:**
- Icon size: 20px (w-5 h-5)
- Button heights: h-10 for primary, h-8 for compact
- Border radius: rounded-lg for panels, rounded-md for buttons
- Input fields: h-10 with focus ring

**Z-Index Hierarchy:**
1. Modals/Popovers: z-50
2. Toolbars/Panels: z-30
3. Selected elements: z-20
4. Canvas elements: z-10
5. Background image: z-0

## Icons
Use Heroicons via CDN for all interface icons (outline style for toolbar, solid for active states)

## Images
**No hero images needed** - This is a tool-focused application
**User-uploaded content** is the primary visual element displayed centrally on the canvas

## Animations
Minimal, performance-focused:
- Tool transitions: transition-all duration-150
- Panel slide-in/out: transform translate with duration-200
- Point hover: scale transition duration-100
- No scroll animations or decorative effects