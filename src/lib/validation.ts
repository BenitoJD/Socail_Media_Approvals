import { z } from "zod";

const statusEnum = z.enum(["PENDING", "APPROVED", "REJECTED"]);
const agentPostingStatusEnum = z.enum(["NOT_POSTED", "CLAIMED", "POSTED", "FAILED"]);

export const createPostSchema = z.object({
  platform: z.string().trim().max(100).optional().or(z.literal("")),
  handle: z.string().trim().max(100).optional().or(z.literal("")),
  text: z.string().trim().min(1, "Text is required."),
  images: z.array(z.string().trim().min(1)).default([]),
});

export const updatePostSchema = z.object({
  status: statusEnum.optional(),
  agentPostingStatus: agentPostingStatusEnum.optional(),
  platform: z.string().trim().max(100).optional().or(z.literal("")),
  handle: z.string().trim().max(100).optional().or(z.literal("")),
  text: z.string().trim().min(1).optional(),
  images: z.array(z.string().trim().min(1)).optional(),
});

export const markPostFailedSchema = z.object({
  failureReason: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const createTopicSchema = z.object({
  platform: z.string().trim().min(1, "Platform is required.").max(100),
  handle: z.string().trim().min(1, "Handle is required.").max(100),
  topic: z.string().trim().min(1, "Topic is required.").max(300),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const updateTopicSchema = z.object({
  platform: z.string().trim().min(1).max(100).optional(),
  handle: z.string().trim().min(1).max(100).optional(),
  topic: z.string().trim().min(1).max(300).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const createTopicRefreshSchema = z.object({
  platform: z.string().trim().min(1, "Platform is required.").max(100),
  handle: z.string().trim().min(1, "Handle is required.").max(100),
  prompt: z.string().trim().min(1, "Prompt is required.").max(5000),
});

export const updateTopicRefreshSchema = z.object({
  platform: z.string().trim().min(1).max(100).optional(),
  handle: z.string().trim().min(1).max(100).optional(),
  prompt: z.string().trim().min(1).max(5000).optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type MarkPostFailedInput = z.infer<typeof markPostFailedSchema>;
export type CreateTopicInput = z.infer<typeof createTopicSchema>;
export type UpdateTopicInput = z.infer<typeof updateTopicSchema>;
export type CreateTopicRefreshInput = z.infer<typeof createTopicRefreshSchema>;
export type UpdateTopicRefreshInput = z.infer<typeof updateTopicRefreshSchema>;
