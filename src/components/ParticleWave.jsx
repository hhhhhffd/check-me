import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../utils/motion'

// Фон из personal-portfolio-website-v3: сетка точек, по которой бежит синусоидальная волна.
// Там она на three.js CanvasRenderer, здесь — тот же расчёт на чистом 2D-canvas.
const SEPARATION = 50
const AMOUNT = 60
const CAMERA_Z = 750
const FOCAL_FACTOR = 0.785 // 1 / (2 * tan(65° / 2)): фокус в долях высоты экрана при угле обзора 65°
const MAX_DPR = 1.5

function ParticleWave({ levelRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const still = prefersReducedMotion()
    const camera = { x: 0, y: 0, z: CAMERA_Z }
    let targetX = 0
    let width = 0
    let height = 0
    let dpr = 1
    let phase = 0
    let frame = 0

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
    }

    function onPointerMove(event) {
      targetX = (event.clientX - width / 2) * 1.5
    }

    function render() {
      camera.x += (targetX - camera.x) * 0.05
      camera.y += (height * 0.3 - camera.y) * 0.03

      // Камера смотрит в центр сетки: строим её базис.
      const length = Math.hypot(camera.x, camera.y, camera.z)
      const fx = -camera.x / length
      const fy = -camera.y / length
      const fz = -camera.z / length
      const rightLength = Math.hypot(fz, fx)
      const rx = -fz / rightLength
      const rz = fx / rightLength
      const ux = -fy * rz
      const uy = rz * fx - rx * fz
      const uz = fy * rx
      const focal = height * FOCAL_FACTOR
      const lift = 1 + levelRef.current * 0.6

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = 'rgb(160 32 240 / 0.85)'
      ctx.beginPath()

      for (let ix = 0; ix < AMOUNT; ix += 1) {
        const waveX = Math.sin((ix + phase) * 0.25)
        for (let iy = 0; iy < AMOUNT; iy += 1) {
          const waveY = Math.sin((iy + phase) * 0.5)
          const px = ix * SEPARATION - (AMOUNT * SEPARATION) / 2 - camera.x
          const py = (waveX + waveY) * 100 * lift - camera.y
          const pz = iy * SEPARATION - (AMOUNT * SEPARATION) / 2 - camera.z

          const depth = px * fx + py * fy + pz * fz
          if (depth < 10) continue
          const screenX = width / 2 + ((px * rx + pz * rz) * focal) / depth
          const screenY = height / 2 - ((px * ux + py * uy + pz * uz) * focal) / depth
          const radius = Math.max(0.5, ((waveX + waveY + 2) * 4 * 0.3 * focal) / depth)
          if (screenX < -radius || screenX > width + radius || screenY < -radius || screenY > height + radius) continue

          ctx.moveTo(screenX + radius, screenY)
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2)
        }
      }

      ctx.fill()
      phase += 0.05
      if (!still) frame = window.requestAnimationFrame(render)
    }

    resize()
    render()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointerMove)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, [levelRef])

  return <canvas className="wave" ref={canvasRef} aria-hidden="true" />
}

export default ParticleWave
