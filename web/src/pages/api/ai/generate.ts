import type { NextApiRequest, NextApiResponse } from 'next'

// ComfyUI servers — use COMFYUI_FLEET_URL / COMFYUI_ROG_URL env vars for tunnel URLs,
// falls back to local network addresses for dev
const COMFYUI_SERVERS: Record<string, { url: string; name: string; unet: string; textEncoder: string }> = {
  fleet: {
    url: process.env.COMFYUI_FLEET_URL || 'http://localhost:8189',
    name: 'Fleet Commander (M1 Max, 64GB)',
    unet: 'wan2.1_t2v_1.3B_bf16.safetensors',
    textEncoder: 'umt5_xxl_fp8_e4m3fn_scaled.safetensors',
  },
  rog: {
    url: process.env.COMFYUI_ROG_URL || 'http://192.168.1.31:8188',
    name: 'ROG (GTX 1050 Ti, 4GB)',
    unet: 'wan2.1_t2v_1.3B_bf16.safetensors',
    textEncoder: 'umt5_xxl_fp8_e4m3fn_scaled.safetensors',
  },
}

function buildWorkflow(params: {
  prompt: string
  negativePrompt: string
  unet: string
  textEncoder: string
  width: number
  height: number
  steps: number
  seed: number
  cfg: number
}) {
  const { prompt, negativePrompt, unet, textEncoder, width, height, steps, seed, cfg } = params
  return {
    prompt: {
      // Load Wan UNET model
      '1': {
        class_type: 'UNETLoader',
        inputs: { unet_name: unet, weight_dtype: 'default' },
      },
      // Load Wan UMT5 text encoder
      '2': {
        class_type: 'CLIPLoader',
        inputs: { clip_name: textEncoder, type: 'wan' },
      },
      // Positive prompt
      '3': {
        class_type: 'CLIPTextEncode',
        inputs: { text: prompt, clip: ['2', 0] },
      },
      // Negative prompt
      '4': {
        class_type: 'CLIPTextEncode',
        inputs: { text: negativePrompt, clip: ['2', 0] },
      },
      // Empty latent
      '5': {
        class_type: 'EmptyLatentImage',
        inputs: { width, height, batch_size: 1 },
      },
      // Load Wan VAE separately (UNETLoader has no VAE output)
      '6': {
        class_type: 'VAELoader',
        inputs: { vae_name: 'wan_2.1_vae.safetensors' },
      },
      // KSampler
      '7': {
        class_type: 'KSampler',
        inputs: {
          model: ['1', 0],
          positive: ['3', 0],
          negative: ['4', 0],
          latent_image: ['5', 0],
          seed: seed === -1 ? Math.floor(Math.random() * 2 ** 32) : seed,
          steps,
          cfg,
          sampler_name: 'euler_ancestral',
          scheduler: 'normal',
          denoise: 1,
        },
      },
      // VAE Decode — uses separate VAELoader (node 6)
      '8': {
        class_type: 'VAEDecode',
        inputs: { samples: ['7', 0], vae: ['6', 0] },
      },
      // Save image
      '9': {
        class_type: 'SaveImage',
        inputs: { images: ['8', 0], filename_prefix: 'soundchain' },
      },
    },
  }
}

async function pollForResult(
  serverUrl: string,
  promptId: string,
  timeoutMs = 120000
): Promise<{ filename: string; subfolder: string; type: string }> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${serverUrl}/history/${promptId}`)
    if (res.ok) {
      const data = await res.json()
      const entry = data[promptId]
      if (entry?.outputs) {
        for (const nodeId of Object.keys(entry.outputs)) {
          const output = entry.outputs[nodeId]
          if (output.images && output.images.length > 0) {
            return output.images[0]
          }
        }
      }
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error('Generation timed out')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    prompt,
    negativePrompt = 'ugly, blurry, low quality, deformed, disfigured, watermark, text, bad anatomy',
    server = 'fleet',
    width = 512,
    height = 512,
    steps = 20,
    seed = -1,
    cfg = 7,
  } = req.body

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' })
  }

  const serverConfig = COMFYUI_SERVERS[server]
  if (!serverConfig) {
    return res.status(400).json({ error: `Unknown server: ${server}. Use "fleet" or "rog".` })
  }

  try {
    const workflow = buildWorkflow({
      prompt,
      negativePrompt,
      unet: serverConfig.unet,
      textEncoder: serverConfig.textEncoder,
      width: Math.min(Math.max(width, 256), 1024),
      height: Math.min(Math.max(height, 256), 1024),
      steps: Math.min(Math.max(steps, 1), 50),
      seed,
      cfg: Math.min(Math.max(cfg, 1), 20),
    })

    const queueRes = await fetch(`${serverConfig.url}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow),
    })

    if (!queueRes.ok) {
      const errText = await queueRes.text()
      return res.status(502).json({ error: `ComfyUI error: ${errText}` })
    }

    const { prompt_id } = await queueRes.json()
    if (!prompt_id) {
      return res.status(502).json({ error: 'No prompt_id returned from ComfyUI' })
    }

    const imageInfo = await pollForResult(serverConfig.url, prompt_id)

    const imageUrl = `${serverConfig.url}/view?filename=${encodeURIComponent(imageInfo.filename)}&subfolder=${encodeURIComponent(imageInfo.subfolder || '')}&type=${encodeURIComponent(imageInfo.type || 'output')}`
    const imageRes = await fetch(imageUrl)

    if (!imageRes.ok) {
      return res.status(502).json({ error: 'Failed to fetch generated image' })
    }

    const imageBuffer = Buffer.from(await imageRes.arrayBuffer())
    const base64 = imageBuffer.toString('base64')
    const contentType = imageRes.headers.get('content-type') || 'image/png'

    return res.status(200).json({
      image: `data:${contentType};base64,${base64}`,
      filename: imageInfo.filename,
      server: serverConfig.name,
      prompt,
      seed: workflow.prompt['7'].inputs.seed,
    })
  } catch (err: any) {
    console.error('AI Generate error:', err)
    const message = err.message || 'Generation failed'
    if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
      return res.status(503).json({ error: `Cannot reach ${serverConfig.name}. Is ComfyUI running?` })
    }
    return res.status(500).json({ error: message })
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
    responseLimit: '10mb',
  },
}
