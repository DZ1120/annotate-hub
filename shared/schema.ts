import { z } from "zod";

export const annotationPointSchema = z.object({
  id: z.string(),
  type: z.literal("point"),
  x: z.number(),
  y: z.number(),
  number: z.number(),
  label: z.string().optional(),
  size: z.number().min(16).max(64).default(32),
  color: z.string().default("#3b82f6"),
  attachedImageUrl: z.string().optional(), // Legacy: single image
  attachedImageUrls: z.array(z.string()).optional(), // New: multiple images
  rotation: z.number().default(0),
  // Map Mode Support
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const textNoteSchema = z.object({
  id: z.string(),
  type: z.literal("text"),
  x: z.number(),
  y: z.number(),
  // Map Mode Support
  lat: z.number().optional(),
  lng: z.number().optional(),
  width: z.number().default(200),
  height: z.number().default(100),
  content: z.string().default(""),
  fontSize: z.number().default(14),
  fontWeight: z.enum(["normal", "bold"]).default("normal"),
  textColor: z.string().default("#000000"),
  backgroundColor: z.string().default("#ffffff"),
  backgroundOpacity: z.number().min(0).max(1).default(1),
  borderColor: z.string().default("#e5e7eb"),
  borderWidth: z.number().min(0).max(4).default(1),
  label: z.string().optional(),
  rotation: z.number().default(0),
});

export const shapeSchema = z.object({
  id: z.string(),
  type: z.literal("shape"),
  shapeType: z.enum(["rectangle", "circle", "line", "arrow"]),
  x: z.number(),
  y: z.number(),
  // Map Mode Support
  lat: z.number().optional(),
  lng: z.number().optional(),
  width: z.number(),
  height: z.number(),
  // For lines and arrows: store actual endpoints (startX,startY) to (endX,endY)
  // These are relative to (x, y) which is the top-left of bounding box
  startX: z.number().optional(),
  startY: z.number().optional(),
  endX: z.number().optional(),
  endY: z.number().optional(),
  strokeColor: z.string().default("#3b82f6"),
  strokeWidth: z.number().min(1).max(8).default(2),
  fillColor: z.string().optional(),
  fillOpacity: z.number().min(0).max(1).default(0),
  label: z.string().optional(),
  rotation: z.number().default(0),
});

// Background image settings for editing mode
export const backgroundSettingsSchema = z.object({
  rotation: z.number().default(0),
  scale: z.number().default(1),
  offsetX: z.number().default(0),
  offsetY: z.number().default(0),
});

export const annotationSchema = z.discriminatedUnion("type", [
  annotationPointSchema,
  textNoteSchema,
  shapeSchema,
]);

export const defaultPointSettingsSchema = z.object({
  size: z.number().min(16).max(64).default(32),
  color: z.string().default("#3b82f6"),
});

export const projectSchema = z.object({
  id: z.string(),
  name: z.string().default("Untitled Project"),
  mode: z.enum(["canvas", "map"]).default("canvas"),
  backgroundImage: z.string().optional(),
  backgroundSettings: backgroundSettingsSchema.optional(),
  annotations: z.array(annotationSchema).default([]),
  zoom: z.number().default(1),
  panX: z.number().default(0),
  panY: z.number().default(0),
  // Map Mode Global Settings
  mapCenter: z.object({ lat: z.number(), lng: z.number() }).optional(),
  mapZoom: z.number().optional(),
  defaultPointSettings: defaultPointSettingsSchema.optional(),
});

export type AnnotationPoint = z.infer<typeof annotationPointSchema>;
export type TextNote = z.infer<typeof textNoteSchema>;
export type Shape = z.infer<typeof shapeSchema>;
export type Annotation = z.infer<typeof annotationSchema>;
export type DefaultPointSettings = z.infer<typeof defaultPointSettingsSchema>;
export type BackgroundSettings = z.infer<typeof backgroundSettingsSchema>;
export type Project = z.infer<typeof projectSchema>;

export const insertProjectSchema = projectSchema.omit({ id: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;

export const users = undefined;
export type User = { id: string; username: string; password: string };
export type InsertUser = { username: string; password: string };
