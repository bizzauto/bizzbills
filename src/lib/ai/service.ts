import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { decrypt } from "@/lib/encryption";
import { prisma } from "@/lib/db";

type AiProvider = "openai" | "anthropic";

async function getApiKey(orgId: string): Promise<{ provider: AiProvider; key: string } | null> {
  const config = await prisma.aIConfig.findUnique({
    where: { orgId },
    select: { provider: true, apiKeyEncrypted: true, isActive: true },
  });

  if (!config || !config.isActive) return null;

  try {
    const key = decrypt(config.apiKeyEncrypted);
    return { provider: config.provider as AiProvider, key };
  } catch {
    return null;
  }
}

function createOpenAIClient(apiKey: string) {
  return new OpenAI({ apiKey });
}

function createAnthropicClient(apiKey: string) {
  return new Anthropic({ apiKey });
}

export async function llmComplete(
  orgId: string,
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number },
): Promise<string | null> {
  const config = await getApiKey(orgId);
  if (!config) return null;

  const maxTokens = options?.maxTokens ?? 1024;
  const temperature = options?.temperature ?? 0.3;

  if (config.provider === "openai") {
    const client = createOpenAIClient(config.key);
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
    });
    return response.choices[0]?.message?.content ?? null;
  }

  if (config.provider === "anthropic") {
    const client = createAnthropicClient(config.key);
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    const block = response.content[0];
    if (block?.type === "text") {
      return block.text;
    }
    return null;
  }

  return null;
}

export async function llmVision(
  orgId: string,
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string,
  imageType: string,
): Promise<string | null> {
  const config = await getApiKey(orgId);
  if (!config) return null;

  if (config.provider === "openai") {
    const client = createOpenAIClient(config.key);
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: { url: `data:${imageType};base64,${imageBase64}` },
            },
          ],
        },
      ],
      max_tokens: 2048,
      temperature: 0.2,
    });
    return response.choices[0]?.message?.content ?? null;
  }

  if (config.provider === "anthropic") {
    const client = createAnthropicClient(config.key);
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      temperature: 0.2,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageType as "image/png" | "image/jpeg" | "image/webp",
                data: imageBase64,
              },
            },
          ],
        },
      ],
    });
    const block = response.content[0];
    if (block?.type === "text") {
      return block.text;
    }
    return null;
  }

  return null;
}

export { getApiKey };
export type { AiProvider };
