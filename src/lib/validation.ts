import { z } from "zod";

const statusEnum = z.enum(["PENDING", "APPROVED", "REJECTED"]);
const agentPostingStatusEnum = z.enum(["NOT_POSTED", "POSTED"]);

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

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
