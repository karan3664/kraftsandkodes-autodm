import { z } from "zod";
import { normalizeKeyword } from "../matching";

export const emailSchema = z.string().trim().email().max(320);

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password is too long");

export const signupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const matchTypeSchema = z.preprocess(
  (value) => (value === "any" ? "all_comments" : value),
  z.enum(["exact", "contains", "all_comments"]),
);

export const automationActionTypeSchema = z.enum([
  "private_reply",
  "comment_reply",
]);

export const automationFieldsSchema = z.object({
  name: z.string().trim().min(1).max(80),
  keywords: z.array(z.string().trim().min(1).max(80)).max(25),
  matchType: matchTypeSchema,
  caseSensitive: z.boolean(),
  actionType: automationActionTypeSchema,
  privateReplyMessage: z.string().trim().max(1000),
  requireFollow: z.boolean(),
  followPromptMessage: z.string().trim().min(1).max(1000),
  notFollowingMessage: z.string().trim().min(1).max(1000),
  commentReplyMessage: z.string().trim().max(500),
  ignoreOwnComments: z.boolean(),
  enabled: z.boolean(),
  instagramAccountId: z.string().min(1),
  mediaId: z.string().min(1),
});

export const automationInputSchema = automationFieldsSchema.superRefine(
  (value, context) => {
    if (value.matchType !== "all_comments" && value.keywords.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least one keyword",
        path: ["keywords"],
      });
    }
    if (value.actionType === "private_reply" && !value.privateReplyMessage) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Write the private reply",
        path: ["privateReplyMessage"],
      });
    }
    if (value.actionType === "comment_reply" && !value.commentReplyMessage) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Write the public comment reply",
        path: ["commentReplyMessage"],
      });
    }
    const seen = new Set<string>();
    value.keywords.forEach((keyword, index) => {
      const normalized = normalizeKeyword(keyword, value.caseSensitive);
      if (!normalized) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Keyword is empty",
          path: ["keywords", index],
        });
        return;
      }
      if (seen.has(normalized)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate keyword",
          path: ["keywords", index],
        });
      }
      seen.add(normalized);
    });
  },
);

export const automationPatchSchema = automationFieldsSchema.partial();

export const simulateCommentSchema = z.object({
  instagramAccountId: z.string().min(1),
  instagramMediaId: z.string().min(1).max(128),
  commentId: z.string().min(1).max(128),
  username: z.string().min(1).max(80),
  text: z.string().min(1).max(2200),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AutomationInput = z.infer<typeof automationInputSchema>;
export type SimulateCommentInput = z.infer<typeof simulateCommentSchema>;
