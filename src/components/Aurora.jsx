import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../utils/motion'

// Шейдер рисуется в уменьшенном разрешении: картинка мягкая, а GPU почти не нагружается.
const RENDER_SCALE = 0.5

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`

// Фиолетовые ленты из fbm-шума на почти чёрном фоне; u_level (громкость трека 0…1) их разжигает.
const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_level;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  float t = u_time * 0.05;

  vec2 warp = vec2(fbm(p * 1.3 + t), fbm(p * 1.3 - t + 3.7));
  float n = fbm(p * 1.7 + warp * 1.8 + vec2(t * 1.5, -t));

  float ribbon = smoothstep(0.42, 0.0, abs(p.y - (n - 0.5) * 1.4 - 0.18));
  vec3 violet = vec3(0.33, 0.12, 0.92);
  vec3 purple = vec3(0.725, 0.0, 1.0);
  vec3 pink = vec3(1.0, 0.24, 0.78);
  vec3 tint = mix(violet, purple, smoothstep(0.3, 0.7, n));
  tint = mix(tint, pink, smoothstep(0.55, 0.85, warp.x) * 0.45);

  float glow = (0.5 + u_level * 0.7) * (ribbon * 0.9 + n * n * 0.4);
  glow *= smoothstep(1.35, 0.15, length(p * vec2(0.75, 1.0)));

  vec3 color = vec3(0.035, 0.024, 0.059) + tint * glow;
  color += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) / 255.0;
  gl_FragColor = vec4(color, 1.0);
}
`

function compile(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error('Aurora shader failed to compile: ' + log)
  }
  return shader
}

function createProgram(gl) {
  const program = gl.createProgram()
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('Aurora program failed to link: ' + gl.getProgramInfoLog(program))
  }
  return program
}

// Фон-аура на WebGL. Без WebGL канвас остаётся прозрачным и виден CSS-градиент .backdrop.
function Aurora({ levelRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
    if (!gl) {
      console.warn('WebGL недоступен, фон остаётся на CSS-градиенте.')
      return undefined
    }

    let program
    try {
      program = createProgram(gl)
    } catch (error) {
      console.error(error)
      return undefined
    }

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.useProgram(program)
    const position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    const resolution = gl.getUniformLocation(program, 'u_resolution')
    const time = gl.getUniformLocation(program, 'u_time')
    const level = gl.getUniformLocation(program, 'u_level')

    const still = prefersReducedMotion()
    const startedAt = performance.now()
    let frame = 0
    let lost = false

    function draw(now) {
      gl.uniform1f(time, still ? 12 : (now - startedAt) / 1000)
      gl.uniform1f(level, levelRef.current)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    function resize() {
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * RENDER_SCALE))
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * RENDER_SCALE))
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(resolution, canvas.width, canvas.height)
      if (still && !lost) draw(performance.now())
    }

    function loop(now) {
      draw(now)
      frame = window.requestAnimationFrame(loop)
    }

    function handleContextLost(event) {
      // Контекст потерян (например, GPU сброшен) — перестаём рисовать, CSS-фон под канвасом остаётся.
      event.preventDefault()
      lost = true
      window.cancelAnimationFrame(frame)
      canvas.hidden = true
      console.warn('WebGL-контекст фона потерян, показываю CSS-градиент.')
    }

    resize()
    window.addEventListener('resize', resize)
    canvas.addEventListener('webglcontextlost', handleContextLost)
    canvas.hidden = false
    if (!still) frame = window.requestAnimationFrame(loop)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    }
  }, [levelRef])

  return <canvas className="aurora" ref={canvasRef} hidden aria-hidden="true" />
}

export default Aurora
