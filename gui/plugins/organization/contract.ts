import { defineRpcContract } from "@get-bb/plugin-sdk";
import { z } from "zod";

// The website's answers (web/lib/org.ts) and the RPC between this plugin's page and its server.
export const STATE_CHANNEL = "state";
export const WEBSITE_ORG_URL = "https://cloudroom.dev/org";

export const stateSchema = z.object({
  org: z.object({ name: z.string(), role: z.enum(["admin", "member"]), repos: z.array(z.string()), instructions: z.string() }).nullable(),
  invites: z.array(z.object({ orgId: z.string(), name: z.string() })),
  mine: z.array(z.object({ thread: z.string(), shared: z.boolean() })),
  taken: z.array(z.string()),
  recheck_ms: z.number().int().positive(),
});
export type OrgState = z.infer<typeof stateSchema>;

export const messageSchema = z.object({ role: z.enum(["user", "agent"]), text: z.string() });
export type OrgMessage = z.infer<typeof messageSchema>;
export const sharedThreadSchema = z.object({
  owner: z.string(), ownerName: z.string(), thread: z.string(), title: z.string(), repo: z.string(),
  harness: z.string().nullable(), model: z.string().nullable(), at: z.string(),
});
export type SharedThread = z.infer<typeof sharedThreadSchema>;
export const handoffSchema = z.object({
  repo: z.string(), branch: z.string(), title: z.string(), harness: z.string().nullable(), model: z.string().nullable(),
  ownerName: z.string(), messages: z.array(messageSchema),
});

const view = z.object({ state: stateSchema.nullable(), error: z.string().nullable() });
const ref = z.object({ owner: z.string(), thread: z.string() }).strict();

export const orgRpcContract = defineRpcContract({
  state: { input: z.object({}).strict(), output: view },
  list: { input: z.object({}).strict(), output: z.object({ threads: z.array(sharedThreadSchema) }) },
  view: { input: ref, output: z.object({ title: z.string(), messages: z.array(messageSchema) }) },
  takeover: { input: ref, output: z.object({ threadId: z.string() }) },
  thread: { input: z.object({ threadId: z.string() }).strict(), output: z.object({ eligible: z.boolean(), shared: z.boolean() }) },
  share: { input: z.object({ threadId: z.string(), shared: z.boolean() }).strict(), output: z.object({ shared: z.boolean() }) },
  invite: { input: z.object({ orgId: z.string(), accept: z.boolean() }).strict(), output: view },
});
