import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

export function initGlobe(container) {
  const canvas = document.getElementById('globe-canvas')
  let W = container.offsetWidth, H = container.offsetHeight

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setSize(W, H)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100)
  camera.position.set(0, 0, 4.2)

  /* POST PROCESSING - THE MAGIC */
  const composer = new EffectComposer(renderer)
  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(W, H),
    1.4,   // strength - how intense the bloom is
    0.4,   // radius - how far it spreads
    0.1    // threshold - what brightness triggers bloom
  )
  composer.addPass(bloomPass)

  const outputPass = new OutputPass()
  composer.addPass(outputPass)

  /* DRAG */
  let drag = false, prev = { x: 0, y: 0 }
  let rotT = { x: .15, y: 0 }, rotC = { x: .15, y: 0 }

  container.addEventListener('mousedown', e => { drag = true; prev = { x: e.clientX, y: e.clientY } })
  container.addEventListener('touchstart', e => { drag = true; const t = e.touches[0]; prev = { x: t.clientX, y: t.clientY } }, { passive: true })
  window.addEventListener('mouseup', () => drag = false)
  window.addEventListener('touchend', () => drag = false)
  window.addEventListener('mousemove', e => {
    if (!drag) return
    rotT.y += (e.clientX - prev.x) * .008
    rotT.x += (e.clientY - prev.y) * .006
    prev = { x: e.clientX, y: e.clientY }
  })
  container.addEventListener('touchmove', e => {
    if (!drag) return
    const t = e.touches[0]
    rotT.y += (t.clientX - prev.x) * .008
    rotT.x += (t.clientY - prev.y) * .006
    prev = { x: t.clientX, y: t.clientY }
    e.preventDefault()
  }, { passive: false })

  const globe = new THREE.Group()
  scene.add(globe)

  /* SPHERE POINT HELPER */
  function spherePt(lat, lng, r) {
    const phi = (90 - lat) * Math.PI / 180
    const theta = (lng + 180) * Math.PI / 180
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
       r * Math.cos(phi),
       r * Math.sin(phi) * Math.sin(theta)
    )
  }

  /* LAT/LNG GRID LINES */
  for (let lat = -80; lat <= 80; lat += 20) {
    const pts = []
    for (let lng = -180; lng <= 180; lng += 3) pts.push(spherePt(lat, lng, 1))
    const mat = new THREE.LineBasicMaterial({ color: lat === 0 ? 0x00aaff : 0x0066cc, transparent: true, opacity: lat === 0 ? .5 : .18 })
    globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))
  }
  for (let lng = -180; lng < 180; lng += 20) {
    const pts = []
    for (let lat = -90; lat <= 90; lat += 3) pts.push(spherePt(lat, lng, 1))
    globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x004488, transparent: true, opacity: .18 })))
  }

  /* NODES */
  const nGeo = new THREE.SphereGeometry(.022, 8, 8)
  const nodes = []
  for (let la = -80; la <= 80; la += 20) {
    for (let lo = -180; lo < 180; lo += 20) {
      if (Math.random() < .75) {
        const pos = spherePt(la, lo, 1)
        const colors = [0x00ffff, 0x00aaff, 0x44ddff, 0x0088ff, 0xffffff]
        const m = new THREE.Mesh(nGeo, new THREE.MeshBasicMaterial({ color: colors[Math.floor(Math.random() * colors.length)], transparent: true, opacity: .9 }))
        m.position.copy(pos)
        m.userData = { pulse: Math.random() * Math.PI * 2, speed: .5 + Math.random() * 2 }
        globe.add(m)
        nodes.push(m)
      }
    }
  }

  /* SIGNAL PULSES */
  const pulses = []
  const pGeo = new THREE.SphereGeometry(.03, 6, 6)

  function firePulse() {
    if (pulses.length > 35) return
    const isLat = Math.random() > .5
    const pts = []
    if (isLat) {
      const la = (Math.floor(Math.random() * 9) - 4) * 20
      for (let l = -180; l <= 180; l += 4) pts.push(spherePt(la, l, 1))
    } else {
      const lo = (Math.floor(Math.random() * 18) - 9) * 20
      for (let l = -90; l <= 90; l += 4) pts.push(spherePt(l, lo, 1))
    }
    const cols = [0x00ffff, 0x00ccff, 0x44eeff, 0xffffff, 0x00ffaa]
    const pm = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ color: cols[Math.floor(Math.random() * cols.length)], transparent: true, opacity: 1 }))
    pm.userData = { pts, t: Math.floor(Math.random() * (pts.length - 10)), speed: .5 + Math.random() * .7 }
    globe.add(pm)
    pulses.push(pm)
  }

  /* ORBITAL RINGS */
  const orbits = []
  const ringDefs = [
    { r: 1.18, tube: .006, col: 0x0088ff, op: .6, rx: Math.PI / 2, ry: 0, rz: 0 },
    { r: 1.23, tube: .004, col: 0x00aaff, op: .45, rx: .3, ry: 0, rz: Math.PI / 6 },
    { r: 1.30, tube: .004, col: 0x0066cc, op: .3, rx: Math.PI / 3, ry: .5, rz: 0 },
    { r: 1.14, tube: .007, col: 0x44ccff, op: .55, rx: 0, ry: 0, rz: Math.PI / 4 },
  ]
  ringDefs.forEach(d => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(d.r, d.tube, 8, 120),
      new THREE.MeshBasicMaterial({ color: d.col, transparent: true, opacity: d.op })
    )
    m.rotation.set(d.rx, d.ry, d.rz)
    m.userData = { baseOp: d.op, rx: (Math.random() - .5) * .003, ry: (Math.random() - .5) * .005 }
    globe.add(m)
    orbits.push(m)
  })

  /* INNER CORE */
  const coreMat = new THREE.MeshBasicMaterial({ color: 0x00eeff, transparent: true, opacity: .9 })
  const core = new THREE.Mesh(new THREE.SphereGeometry(.18, 16, 16), coreMat)
  globe.add(core)

  /* CORE GLOW RINGS */
  for (let i = 0; i < 3; i++) {
    const gr = new THREE.Mesh(
      new THREE.TorusGeometry(.25 + i * .12, .003, 8, 60),
      new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: .4 - i * .1 })
    )
    gr.rotation.x = Math.random() * Math.PI
    gr.rotation.y = Math.random() * Math.PI
    core.add(gr)
  }

  /* ATMOSPHERE */
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(1.08, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x002244, transparent: true, opacity: .08, side: THREE.BackSide })
  ))

  /* OUTER GLOW PLANE */
  const glowCanvas = document.createElement('canvas')
  glowCanvas.width = glowCanvas.height = 512
  const gc = glowCanvas.getContext('2d')
  const grad = gc.createRadialGradient(256, 256, 0, 256, 256, 256)
  grad.addColorStop(0, 'rgba(0,180,255,.35)')
  grad.addColorStop(.3, 'rgba(0,120,200,.18)')
  grad.addColorStop(.6, 'rgba(0,80,150,.08)')
  grad.addColorStop(1, 'rgba(0,40,100,0)')
  gc.fillStyle = grad
  gc.fillRect(0, 0, 512, 512)
  const glowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 5),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glowCanvas), transparent: true, opacity: 1, depthWrite: false })
  )
  glowMesh.position.z = -.5
  scene.add(glowMesh)

  /* STARS */
  const sv = []
  for (let i = 0; i < 800; i++) {
    const r = 5 + Math.random() * 5
    const th = Math.random() * Math.PI * 2
    const ph = Math.acos(2 * Math.random() - 1)
    sv.push(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph))
  }
  const sGeo = new THREE.BufferGeometry()
  sGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sv), 3))
  const starField = new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0x88aaff, size: .018, transparent: true, opacity: .6 }))
  scene.add(starField)

  /* ANIMATE */
  const clock = new THREE.Clock()
  let pulseT = 0

  function animate() {
    requestAnimationFrame(animate)
    const t = clock.getElapsedTime()
    const state = window._brainState || 'idle'
    const thinking = state === 'thinking'
    const speaking = state === 'speaking'
    const active = thinking || speaking

    /* Bloom reacts to state */
    bloomPass.strength = speaking ? 2.2 : thinking ? 1.8 : 1.2
    bloomPass.radius = speaking ? .6 : thinking ? .5 : .35

    /* Rotation */
    rotC.x += (rotT.x - rotC.x) * .07
    rotC.y += (rotT.y - rotC.y) * .07
    globe.rotation.x = rotC.x
    globe.rotation.y = rotC.y
    if (!drag) rotT.y += speaking ? .014 : thinking ? .008 : .003

    /* Nodes */
    nodes.forEach(n => {
      const spd = speaking ? 7 : thinking ? 4 : 1
      const p = .5 + .5 * Math.sin(t * n.userData.speed * spd + n.userData.pulse)
      n.material.opacity = active ? Math.min(.5 + p * .9, 1) : .35 + p * .5
      n.scale.setScalar(speaking ? 1 + p * 1.0 : thinking ? 1 + p * .6 : 1 + p * .25)
    })

    /* Core */
    const cp = .5 + .5 * Math.sin(t * (speaking ? 10 : thinking ? 5 : 2))
    coreMat.opacity = speaking ? .9 + cp * .1 : thinking ? .6 + cp * .3 : .3 + cp * .2
    core.scale.setScalar(speaking ? 1 + cp : thinking ? 1 + cp * .5 : 1 + cp * .12)
    core.children.forEach((gr, i) => {
      gr.rotation.x += (.002 + i * .001) * (active ? 4 : 1)
      gr.rotation.y += (.003 + i * .001) * (active ? 4 : 1)
    })

    /* Orbits */
    orbits.forEach((o, i) => {
      const spd2 = speaking ? 5 : thinking ? 3 : 1
      o.rotation.x += o.userData.rx * spd2
      o.rotation.y += o.userData.ry * spd2
      o.material.opacity = active ? Math.min(o.userData.baseOp * 3, 1) : o.userData.baseOp * (.7 + .3 * Math.sin(t + i))
    })

    /* Grid brightness */
    globe.children.forEach(c => {
      if (c.isLine && c.material) {
        const base = c.material.opacity > .3 ? .5 : .18
        c.material.opacity = active ? Math.min(base * 3, .95) : base * (.7 + .3 * Math.sin(t * .8))
      }
    })

    /* Glow */
    const gp = .5 + .5 * Math.sin(t * 1.5)
    glowMesh.material.opacity = speaking ? 1 : thinking ? .8 : .55 + gp * .2
    glowMesh.lookAt(camera.position)

    /* Stars */
    starField.material.opacity = .4 + .2 * Math.sin(t * .4)

    /* Pulses */
    pulseT += speaking ? .18 : thinking ? .1 : .03
    if (pulseT > 1) { pulseT = 0; firePulse(); if (active) firePulse(); if (speaking) firePulse() }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const pu = pulses[i]
      pu.userData.t += pu.userData.speed * (speaking ? 4 : thinking ? 2.5 : 1)
      const idx = Math.floor(pu.userData.t)
      if (idx >= pu.userData.pts.length - 1) { globe.remove(pu); pulses.splice(i, 1); continue }
      pu.position.lerpVectors(pu.userData.pts[idx], pu.userData.pts[Math.min(idx + 1, pu.userData.pts.length - 1)], pu.userData.t - idx)
      pu.material.opacity = Math.sin((pu.userData.t / pu.userData.pts.length) * Math.PI)
    }

    composer.render()
  }

  animate()

  window.addEventListener('resize', () => {
    W = container.offsetWidth
    H = container.offsetHeight
    renderer.setSize(W, H)
    composer.setSize(W, H)
    camera.aspect = W / H
    camera.updateProjectionMatrix()
    bloomPass.resolution.set(W, H)
  })
}
