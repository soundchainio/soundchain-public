import React, { useEffect, useRef } from 'react'

interface FluidNameOverlayProps {
  name: string
  handle: string
  className?: string
  /**
   * 'full'       — name (large) + @handle (small) + edge-tiled trail. Original behavior.
   * 'handleOnly' — only @handle, centered + larger. No name, no edge trail, no horizontal repeat.
   *                Use when you want fluid-gl on the handle text characters only and nothing
   *                else in the frame.
   */
  mode?: 'full' | 'handleOnly'
}

const VERT_SRC = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const FRAG_SRC = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_time;
uniform float u_intensity;   // displacement strength (0..1)
uniform float u_edgeTile;    // 1.0 = enable horizontal tile/edge-pull, 0.0 = disable

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
        + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0),
                          dot(x12.xy, x12.xy),
                          dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * snoise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = v_uv;

  // Glyph alpha is sampled WITHOUT displacement so the letters stay crisp and
  // readable — the "fluid" reads as liquid COLOR flowing through the letters,
  // not warped letter shapes. (The old shader displaced the glyph UVs, which
  // smeared small text into mush.)
  float a = texture2D(u_tex, uv).a;

  // 'full' mode keeps a faint warped edge-trail flowing off the top/bottom.
  // 'handleOnly' (u_edgeTile = 0) stays perfectly crisp.
  if (u_edgeTile > 0.5) {
    float t = u_time * 0.18;
    float dx = fbm(uv * 2.2 + vec2(t, t * 0.7));
    float dy = fbm(uv * 2.2 + vec2(-t * 0.6, t * 1.1));
    vec2 disp = vec2(dx, dy) * u_intensity;
    float edgePull = pow(abs(uv.y - 0.5) * 2.0, 1.5) * 0.4;
    vec4 colEdge = texture2D(u_tex, fract((uv + disp * (1.0 + edgePull)) * vec2(2.3, 1.0)));
    a = max(a, colEdge.a * 0.45 * edgePull);
  }

  // Flowing liquid color — cyan -> blue -> violet, animated by FBM + time.
  float n  = fbm(uv * 2.6 + vec2(u_time * 0.16, u_time * 0.10));
  float n2 = fbm(uv * 4.0 + vec2(-u_time * 0.12, u_time * 0.08));
  vec3 cyan   = vec3(0.133, 0.827, 0.933); // #22d3ee
  vec3 blue   = vec3(0.231, 0.510, 0.965); // #3b82f6
  vec3 violet = vec3(0.654, 0.545, 0.980); // #a78bfa
  float m1 = 0.5 + 0.5 * sin(n * 3.14159 + uv.x * 4.0 + u_time * 0.6);
  float m2 = 0.5 + 0.5 * sin(n2 * 2.5 - u_time * 0.4);
  vec3 col = mix(cyan, blue, m1);
  col = mix(col, violet, m2 * 0.6);
  float pulse = 0.9 + 0.1 * sin(u_time * 0.9);
  gl_FragColor = vec4(col * pulse, a);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)
  if (!sh) return null
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh)
    return null
  }
  return sh
}

function buildTextTexture(name: string, handle: string, width: number, height: number, mode: 'full' | 'handleOnly') {
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  const ctx = c.getContext('2d')
  if (!ctx) return c
  ctx.clearRect(0, 0, width, height)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  const drawText = (text: string, x: number, y: number, size: number, weight: number) => {
    ctx.font = `${weight} ${size}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`
    ctx.strokeStyle = 'rgba(0,0,0,0.78)'
    ctx.lineWidth = Math.max(2, size * 0.09)
    ctx.strokeText(text, x, y)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(text, x, y)
  }
  if (mode === 'handleOnly') {
    // Only the @handle text chars get the gel — no display name, no edge trails,
    // no horizontal tile. Left-aligned + crisp so it reads cleanly under the
    // display name; the shader flows liquid color through these letters.
    const handleSize = Math.floor(height * 0.66)
    ctx.textAlign = 'left'
    drawText(`@${handle}`, Math.floor(height * 0.12), height * 0.52, handleSize, 800)
    return c
  }
  const nameSize = Math.floor(height * 0.42)
  drawText(name.toUpperCase(), width / 2, height * 0.42, nameSize, 900)
  const handleSize = Math.floor(height * 0.18)
  drawText(`@${handle}`, width / 2, height * 0.72, handleSize, 600)
  ctx.globalAlpha = 0.35
  const edgeSize = Math.floor(height * 0.12)
  const trail = `${name.toUpperCase()}   @${handle}   `
  ctx.textAlign = 'left'
  let repeat = ''
  ctx.font = `700 ${edgeSize}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`
  while (ctx.measureText(repeat).width < width * 2) repeat += trail
  drawText(repeat, 0, height * 0.08, edgeSize, 700)
  drawText(repeat, -width * 0.3, height * 0.92, edgeSize, 700)
  return c
}

export default function FluidNameOverlay({ name, handle, className, mode = 'full' }: FluidNameOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = (canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true }) ||
                canvas.getContext('experimental-webgl', { premultipliedAlpha: true, alpha: true })) as WebGLRenderingContext | null
    if (!gl) return

    const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
    if (!vs || !fs) return
    const prog = gl.createProgram()
    if (!prog) return
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uTime = gl.getUniformLocation(prog, 'u_time')
    const uTex = gl.getUniformLocation(prog, 'u_tex')

    const tex = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    // handleOnly: clamp both axes — no tiling/repeat, fluid stays on the char box.
    const wrapS = mode === 'handleOnly' ? gl.CLAMP_TO_EDGE : gl.REPEAT
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.uniform1i(uTex, 0)

    const uIntensity = gl.getUniformLocation(prog, 'u_intensity')
    const uEdgeTile = gl.getUniformLocation(prog, 'u_edgeTile')
    // handleOnly: softer warp so chars stay legible; full: original aggressive gel
    gl.uniform1f(uIntensity, mode === 'handleOnly' ? 0.085 : 0.16)
    gl.uniform1f(uEdgeTile, mode === 'handleOnly' ? 0.0 : 1.0)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    let textW = 1024
    let textH = 256
    const uploadText = () => {
      const txCanvas = buildTextTexture(name || 'User', handle || 'user', textW, textH, mode)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, txCanvas)
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      const w = Math.max(1, Math.floor(rect.width * dpr))
      const h = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
        textW = Math.min(2048, Math.max(512, w))
        textH = Math.min(512, Math.max(128, h))
        uploadText()
      }
    }
    resize()
    uploadText()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let raf = 0
    const start = performance.now()
    const tick = () => {
      const t = (performance.now() - start) / 1000
      gl.uniform1f(uTime, t)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      gl.deleteTexture(tex)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [name, handle, mode])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 15,
        opacity: 0.95,
      }}
    />
  )
}
