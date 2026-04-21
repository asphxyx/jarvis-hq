import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

export function initGalaxy(container) {
  const W = window.innerWidth, H = window.innerHeight
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setSize(W, H)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.setClearColor(0x000005, 1)
  renderer.domElement.style.cssText = 'position:fixed;inset:0;z-index:0;'
  document.body.prepend(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 2000)
  camera.position.set(0, 80, 200)
  camera.lookAt(0, 0, 0)

  /* POST PROCESSING */
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 1.6, 0.5, 0.1)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  /* ── MILKY WAY GALAXY ── */
  const galaxyGroup = new THREE.Group()
  scene.add(galaxyGroup)

  // Galaxy parameters
  const ARMS = 5
  const STARS_PER_ARM = 8000
  const TOTAL_STARS = ARMS * STARS_PER_ARM + 15000 // extra for halo/core

  const positions = []
  const colors = []
  const sizes = []

  const c1 = new THREE.Color(), c2 = new THREE.Color()

  // SPIRAL ARMS
  for (let arm = 0; arm < ARMS; arm++) {
    const armAngle = (arm / ARMS) * Math.PI * 2
    for (let i = 0; i < STARS_PER_ARM; i++) {
      const t = i / STARS_PER_ARM
      const radius = 10 + t * 180
      const spinAngle = t * Math.PI * 6 + armAngle
      const spread = (1 - t * 0.5) * 18

      const x = Math.cos(spinAngle) * radius + (Math.random() - 0.5) * spread
      const z = Math.sin(spinAngle) * radius + (Math.random() - 0.5) * spread
      const y = (Math.random() - 0.5) * spread * 0.25 * (1 - t * 0.7)

      positions.push(x, y, z)

      // Color: blue-white hot stars near core, yellow-red outer
      const heat = 1 - t
      if (Math.random() < 0.08) {
        c1.setHSL(0.6 + Math.random() * 0.1, 1, 0.9) // bright blue-white
      } else if (heat > 0.6) {
        c1.setHSL(0.58 + Math.random() * 0.08, 0.9, 0.7 + Math.random() * 0.3)
      } else if (heat > 0.3) {
        c1.setHSL(0.55 + Math.random() * 0.1, 0.7, 0.6 + Math.random() * 0.2)
      } else {
        c1.setHSL(0.05 + Math.random() * 0.1, 0.8, 0.6 + Math.random() * 0.2)
      }
      colors.push(c1.r, c1.g, c1.b)
      sizes.push(Math.random() < 0.02 ? 3.5 + Math.random() * 2 : 0.8 + Math.random() * 1.5)
    }
  }

  // GALACTIC CORE — dense bright center
  for (let i = 0; i < 8000; i++) {
    const r = Math.pow(Math.random(), 2) * 40
    const angle = Math.random() * Math.PI * 2
    const x = Math.cos(angle) * r + (Math.random() - 0.5) * 8
    const z = Math.sin(angle) * r + (Math.random() - 0.5) * 8
    const y = (Math.random() - 0.5) * r * 0.15
    positions.push(x, y, z)
    const t2 = r / 40
    c1.setHSL(0.1 + t2 * 0.5, 0.9, 0.8 + Math.random() * 0.2)
    colors.push(c1.r, c1.g, c1.b)
    sizes.push(1 + Math.random() * 2.5)
  }

  // HALO STARS — scattered around galaxy
  for (let i = 0; i < 7000; i++) {
    const r = 100 + Math.random() * 300
    const theta = Math.random() * Math.PI * 2
    const phi = (Math.random() - 0.5) * Math.PI * 0.6
    positions.push(
      Math.cos(theta) * Math.cos(phi) * r,
      Math.sin(phi) * r * 0.4,
      Math.sin(theta) * Math.cos(phi) * r
    )
    c1.setHSL(0.6 + Math.random() * 0.2, 0.5, 0.4 + Math.random() * 0.4)
    colors.push(c1.r, c1.g, c1.b)
    sizes.push(0.5 + Math.random())
  }

  // DISTANT BACKGROUND STARS
  for (let i = 0; i < 5000; i++) {
    const r = 500 + Math.random() * 1000
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    )
    c1.setHSL(Math.random(), 0.3, 0.6 + Math.random() * 0.4)
    colors.push(c1.r, c1.g, c1.b)
    sizes.push(0.3 + Math.random() * 0.7)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uState: { value: 0 }, // 0=idle 1=thinking 2=speaking
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float uTime;
      uniform float uState;
      void main() {
        vColor = color;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        float pulse = 1.0 + sin(uTime * 2.0 + position.x * 0.1 + position.z * 0.1) * 0.15 * uState;
        gl_PointSize = size * pulse * (300.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d = length(uv);
        if (d > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.1, 0.5, d);
        gl_FragColor = vec4(vColor * (1.0 + alpha * 0.5), alpha);
      }
    `,
    transparent: true,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const stars = new THREE.Points(geo, mat)
  galaxyGroup.add(stars)
  galaxyGroup.rotation.x = -0.3

  /* ── NEBULA CLOUDS ── */
  function addNebula(x, y, z, color, size, opacity) {
    const nc = document.createElement('canvas')
    nc.width = nc.height = 256
    const nctx = nc.getContext('2d')
    const grad = nctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    grad.addColorStop(0, color.replace(')', `,${opacity})`).replace('rgb', 'rgba'))
    grad.addColorStop(0.4, color.replace(')', `,${opacity * 0.4})`).replace('rgb', 'rgba'))
    grad.addColorStop(1, color.replace(')', ',0)').replace('rgb', 'rgba'))
    nctx.fillStyle = grad
    nctx.fillRect(0, 0, 256, 256)
    const tex = new THREE.CanvasTexture(nc)
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
    )
    mesh.position.set(x, y, z)
    mesh.rotation.x = -0.3 + (Math.random() - 0.5) * 0.5
    mesh.rotation.z = Math.random() * Math.PI
    scene.add(mesh)
    return mesh
  }

  const nebulae = [
    addNebula(60, 5, 30, 'rgb(80,20,150)', 120, 0.35),
    addNebula(-80, -10, 60, 'rgb(20,80,160)', 100, 0.3),
    addNebula(30, 15, -70, 'rgb(160,40,80)', 90, 0.25),
    addNebula(-50, 5, -40, 'rgb(20,120,100)', 80, 0.28),
    addNebula(100, -5, -20, 'rgb(100,60,180)', 70, 0.22),
    addNebula(-20, 10, 100, 'rgb(60,140,200)', 110, 0.2),
    addNebula(0, 0, 0, 'rgb(255,160,60)', 60, 0.4), // core glow
  ]

  /* ── INTERACTIVE: mouse drag rotates galaxy ── */
  let isDragging = false
  let prevMouse = { x: 0, y: 0 }
  let velocity = { x: 0, y: 0 }
  let targetRot = { x: -0.3, y: 0 }
  let currentRot = { x: -0.3, y: 0 }

  window.addEventListener('mousedown', e => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; velocity = { x: 0, y: 0 } })
  window.addEventListener('touchstart', e => { isDragging = true; const t = e.touches[0]; prevMouse = { x: t.clientX, y: t.clientY } }, { passive: true })
  window.addEventListener('mouseup', () => isDragging = false)
  window.addEventListener('touchend', () => isDragging = false)
  window.addEventListener('mousemove', e => {
    if (!isDragging) return
    const dx = e.clientX - prevMouse.x, dy = e.clientY - prevMouse.y
    velocity.x = dy * 0.003; velocity.y = dx * 0.003
    targetRot.x += velocity.x; targetRot.y += velocity.y
    prevMouse = { x: e.clientX, y: e.clientY }
  })
  window.addEventListener('touchmove', e => {
    if (!isDragging) return
    const t = e.touches[0]
    const dx = t.clientX - prevMouse.x, dy = t.clientY - prevMouse.y
    targetRot.x += dy * 0.003; targetRot.y += dx * 0.003
    prevMouse = { x: t.clientX, y: t.clientY }
    e.preventDefault()
  }, { passive: false })

  /* Scroll to zoom */
  window.addEventListener('wheel', e => {
    camera.position.z = Math.max(80, Math.min(400, camera.position.z + e.deltaY * 0.3))
    camera.position.y = Math.max(20, Math.min(200, camera.position.y + e.deltaY * 0.15))
  })

  /* ANIMATE */
  const clock = new THREE.Clock()
  window._brainState = 'idle'

  function animate() {
    requestAnimationFrame(animate)
    const t = clock.getElapsedTime()
    const state = window._brainState || 'idle'
    const thinking = state === 'thinking'
    const speaking = state === 'speaking'

    // State uniform
    mat.uniforms.uTime.value = t
    mat.uniforms.uState.value = speaking ? 2 : thinking ? 1 : 0

    // Bloom reacts to state
    bloom.strength = speaking ? 2.5 : thinking ? 2.0 : 1.4
    bloom.radius = speaking ? 0.7 : thinking ? 0.55 : 0.4

    // Inertia rotation
    if (!isDragging) {
      velocity.x *= 0.95; velocity.y *= 0.95
      targetRot.y += (speaking ? 0.004 : thinking ? 0.002 : 0.0008)
    }
    targetRot.x = Math.max(-1.2, Math.min(0.4, targetRot.x))
    currentRot.x += (targetRot.x - currentRot.x) * 0.06
    currentRot.y += (targetRot.y - currentRot.y) * 0.06
    galaxyGroup.rotation.x = currentRot.x
    galaxyGroup.rotation.y = currentRot.y

    // Nebula pulse
    nebulae.forEach((n, i) => {
      const pulse = 0.8 + 0.2 * Math.sin(t * (speaking ? 3 : thinking ? 2 : 0.5) + i)
      n.material.opacity = (speaking ? 0.5 : thinking ? 0.4 : 0.25) * pulse
    })

    composer.render()
  }

  animate()

  window.addEventListener('resize', () => {
    const W2 = window.innerWidth, H2 = window.innerHeight
    renderer.setSize(W2, H2)
    composer.setSize(W2, H2)
    camera.aspect = W2 / H2
    camera.updateProjectionMatrix()
    bloom.resolution.set(W2, H2)
  })
}
