/**
 * MiniSphere — tiny Three.js 3D sphere for the nav logo
 * Renders a real 3D sphere with the SoundChain color gradient,
 * matching the OGUN Radio 4D sphere style but at icon size.
 */

import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface MiniSphereProps {
  size?: number
  className?: string
}

export function MiniSphere({ size = 28, className = '' }: MiniSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const w = size * 2  // Render at 2x for retina
    const h = size * 2

    // Scene
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.z = 2.8

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(1)
    renderer.setClearColor(0x000000, 0)
    container.innerHTML = ''
    container.appendChild(renderer.domElement)
    renderer.domElement.style.width = size + 'px'
    renderer.domElement.style.height = size + 'px'
    rendererRef.current = renderer

    // Sphere with SoundChain gradient material
    const geometry = new THREE.SphereGeometry(1, 32, 32)

    // Custom shader for multi-color gradient (matches SoundChain logo colors)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          // SoundChain colors: purple, cyan, pink, green, yellow, orange
          vec3 purple = vec3(0.63, 0.32, 0.99);
          vec3 cyan = vec3(0.0, 0.82, 0.87);
          vec3 pink = vec3(0.95, 0.25, 0.62);
          vec3 green = vec3(0.24, 0.87, 0.54);
          vec3 yellow = vec3(0.98, 0.84, 0.15);
          vec3 orange = vec3(1.0, 0.42, 0.22);

          // Rotate the color mapping with time
          float angle = atan(vPosition.y, vPosition.x) + uTime * 0.5;
          float t = (sin(angle * 2.0) * 0.5 + 0.5);
          float t2 = (cos(angle * 3.0 + 1.0) * 0.5 + 0.5);

          // Mix colors based on position + time
          vec3 color;
          if (t < 0.2) color = mix(purple, cyan, t * 5.0);
          else if (t < 0.4) color = mix(cyan, green, (t - 0.2) * 5.0);
          else if (t < 0.6) color = mix(green, yellow, (t - 0.4) * 5.0);
          else if (t < 0.8) color = mix(yellow, orange, (t - 0.6) * 5.0);
          else color = mix(orange, pink, (t - 0.8) * 5.0);

          // Add secondary color layer
          color = mix(color, mix(pink, purple, t2), 0.3);

          // Lighting — hemisphere light effect
          float diffuse = max(dot(vNormal, normalize(vec3(0.5, 0.8, 1.0))), 0.0);
          float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
          rim = pow(rim, 2.5) * 0.6;

          // Specular highlight
          vec3 viewDir = vec3(0.0, 0.0, 1.0);
          vec3 lightDir = normalize(vec3(0.3, 0.5, 1.0));
          vec3 halfDir = normalize(lightDir + viewDir);
          float spec = pow(max(dot(vNormal, halfDir), 0.0), 32.0) * 0.5;

          vec3 finalColor = color * (0.3 + diffuse * 0.7) + vec3(rim) * purple + vec3(spec);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    })

    const sphere = new THREE.Mesh(geometry, material)
    scene.add(sphere)

    // Subtle ambient glow
    const glowGeo = new THREE.SphereGeometry(1.15, 16, 16)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x8844ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
    })
    scene.add(new THREE.Mesh(glowGeo, glowMat))

    // Animation
    let animId = 0
    const animate = () => {
      animId = requestAnimationFrame(animate)
      const t = Date.now() / 1000
      sphere.rotation.y = t * 0.4
      sphere.rotation.x = Math.sin(t * 0.2) * 0.15
      material.uniforms.uTime.value = t
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
    }
  }, [size])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden' }}
    />
  )
}
