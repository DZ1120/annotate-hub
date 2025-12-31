import { z } from "zod";

export const annotationPointSchema = z.object({
  id: z.string(),
  type: z.literal("point"),
  x: z.number(),
  y: z.number(),
  number: z.number(),
  size: z.number().min(16).max(64).default(32),
  color: z.string().default("#3b82f6"),
  attachedImageUrl: z.string().optional(),
});

export const textNoteSchema = z.object({
  id: z.string(),
  type: z.literal("text"),
  x: z.number(),
  y: z.number(),
  width: z.number().default(200),
  height: z.number().default(100),
  content: z.string().default(""),
  fontSize: z.number().default(14),
});

export const shapeSchema = z.object({
  id: z.string(),
  type: z.literal("shape"),
  shapeType: z.enum(["rectangle", "circle", "line", "arrow"]),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  strokeColor: z.string().default("#3b82f6"),
  strokeWidth: z.number().min(1).max(8).default(2),
  fillColor: z.string().optional(),
  fillOpacity: z.number().min(0).max(1).default(0),
});

export const annotationSchema = z.discriminatedUnion("type", [
  annotationPointSchema,
  textNoteSchema,
  shapeSchema,
]);

export const projectSchema = z.object({
  id: z.string(),
  name: z.string().default("Untitled Project"),
  backgroundImage: z.string().optional(),
  annotations: z.array(annotationSchema).default([]),
  zoom: z.number().default(1),
  panX: z.number().default(0),
  panY: z.number().default(0),
});

export type AnnotationPoint = z.infer<typeof annotationPointSchema>;
export type TextNote = z.infer<typeof textNoteSchema>;
export type Shape = z.infer<typeof shapeSchema>;
export type Annotation = z.infer<typeof annotationSchema>;
export type Project = z.infer<typeof projectSchema>;

export const insertProjectSchema = projectSchema.omit({ id: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;

export const users = undefined;
export type User = { id: string; username: string; password: string };
export type InsertUser = { username: string; password: string };
