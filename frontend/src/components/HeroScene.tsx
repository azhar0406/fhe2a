"use client";

import { useRef, useEffect } from "react";

export function HeroScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    import("three").then((THREE) => {
      if (cancelled || !containerRef.current) return;

      const container = containerRef.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100);
      camera.position.z = 6;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);

      // Particles
      const particleCount = 600;
      const particleGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      }
      particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const particleMat = new THREE.PointsMaterial({
        size: 0.03,
        color: 0x4361ee,
        transparent: true,
        opacity: 0.35,
        sizeAttenuation: true,
      });
      const particles = new THREE.Points(particleGeo, particleMat);
      scene.add(particles);

      // Wireframe icosahedron
      const icoGeo = new THREE.IcosahedronGeometry(1.3, 1);
      const icoMat = new THREE.MeshBasicMaterial({
        color: 0x4361ee,
        wireframe: true,
        transparent: true,
        opacity: 0.07,
      });
      const ico = new THREE.Mesh(icoGeo, icoMat);
      scene.add(ico);

      // Floating spheres
      const spheres: any[] = [];
      const sphereData = [
        { pos: [-3, 1, -2], color: 0x6684ff, speed: 0.8 },
        { pos: [3, -1, -1], color: 0x2d42d4, speed: 1.2 },
        { pos: [2, 2, -3], color: 0x93adff, speed: 0.6 },
        { pos: [-2, -1.5, -1.5], color: 0x4361ee, speed: 1.0 },
      ];
      sphereData.forEach(({ pos, color, speed }) => {
        const geo = new THREE.SphereGeometry(0.35, 24, 24);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.1 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(pos[0], pos[1], pos[2]);
        mesh.userData = { baseY: pos[1], speed };
        scene.add(mesh);
        spheres.push(mesh);
      });

      // Ambient light ring (torus)
      const torusGeo = new THREE.TorusGeometry(2.5, 0.01, 8, 80);
      const torusMat = new THREE.MeshBasicMaterial({ color: 0x4361ee, transparent: true, opacity: 0.05 });
      const torus = new THREE.Mesh(torusGeo, torusMat);
      torus.rotation.x = Math.PI / 3;
      scene.add(torus);

      // Animation loop
      let animId: number;
      function animate() {
        animId = requestAnimationFrame(animate);
        const t = performance.now() * 0.001;

        particles.rotation.y = t * 0.02;
        particles.rotation.x = Math.sin(t * 0.01) * 0.1;

        ico.rotation.y = t * 0.25;
        ico.rotation.x = Math.sin(t * 0.15) * 0.2;

        torus.rotation.z = t * 0.1;

        spheres.forEach((s) => {
          s.position.y = s.userData.baseY + Math.sin(t * s.userData.speed) * 0.4;
        });

        renderer.render(scene, camera);
      }
      animate();

      // Resize handler
      function onResize() {
        if (!container) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
      window.addEventListener("resize", onResize);

      cleanupRef.current = () => {
        cancelAnimationFrame(animId);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    });

    return () => {
      cancelled = true;
      cleanupRef.current?.();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 pointer-events-none"
      style={{ background: "transparent" }}
    />
  );
}
