/**
 * Vision model integration for screenshot analysis
 * Supports Anthropic (Claude) and Ollama (llava, etc.)
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ModelConfig } from '../models/types'

const DEFAULT_VISION_PROMPT =
  'Describe what you see on this screen. Identify clickable elements, text fields, buttons, and their approximate positions.'

/**
 * Analyze a screenshot using a vision-capable model.
 * Supports Anthropic (Claude) with native image content blocks,
 * and Ollama via the OpenAI-compatible /v1/chat/completions endpoint.
 */
export async function analyzeScreenshot(
  base64Image: string,
  prompt: string = DEFAULT_VISION_PROMPT,
  modelConfig: ModelConfig,
): Promise<string> {
  switch (modelConfig.provider) {
    case 'anthropic':
      return analyzeWithAnthropic(base64Image, prompt, modelConfig)
    case 'ollama':
    case 'openai-compatible':
      return analyzeWithOllama(base64Image, prompt, modelConfig)
    default:
      throw new Error(`Unsupported vision provider: ${modelConfig.provider}`)
  }
}

async function analyzeWithAnthropic(
  base64Image: string,
  prompt: string,
  config: ModelConfig,
): Promise<string> {
  const client = new Anthropic({ apiKey: config.apiKey })

  const response = await client.messages.create({
    model: config.model,
    max_tokens: config.maxTokens || 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  })

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

async function analyzeWithOllama(
  base64Image: string,
  prompt: string,
  config: ModelConfig,
): Promise<string> {
  const baseUrl = config.baseUrl || 'http://localhost:11434'
  const url = `${baseUrl}/v1/chat/completions`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature,
      stream: false,
    }),
  })

  if (!response.ok) {
    throw new Error(`Vision API error ${response.status}: ${await response.text()}`)
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>
  }

  return data.choices[0]?.message?.content || ''
}
