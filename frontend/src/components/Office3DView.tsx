import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { TileItem } from '../types';

interface Office3DViewProps {
  tiles: (TileItem & { status?: 'Live' | 'Down' })[];
  ramPercent: number;
  cpuPercent: number;
}

export function Office3DView({ tiles, ramPercent, cpuPercent }: Office3DViewProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 340;
    const height = 240;
    const aspect = width / height;
    const d = 4.6;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 100);
    camera.position.set(6, 6, 6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(5, 10, 4);
    dir.castShadow = false;
    scene.add(ambient, dir);

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 0.2, 5.2),
      new THREE.MeshLambertMaterial({ color: 0x181b22 })
    );
    floor.position.y = -0.1;
    floor.receiveShadow = false;
    scene.add(floor);

    const liveRings: THREE.Mesh[] = [];
    const liveWorkers: THREE.Group[] = [];

    tiles.slice(0, 6).forEach((tile, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = (col - 1) * 2.2;
      const z = (row - 0.5) * 2.1;
      const isLive = tile.status !== 'Down';

      const colorHex = parseInt((tile.color || '#0078D7').replace('#', ''), 16) || 0x0078d7;
      const desk = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.65, 0.9),
        new THREE.MeshLambertMaterial({ color: colorHex })
      );
      desk.position.set(x, 0.32, z);
      desk.castShadow = false;
      scene.add(desk);

      // Chibi Worker State Machine
      const worker = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.45, 0.3),
        new THREE.MeshLambertMaterial({ color: isLive ? 0x38bdf8 : 0x64748b })
      );
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 10),
        new THREE.MeshLambertMaterial({ color: 0xfde68a })
      );
      head.position.y = 0.36;
      worker.add(body, head);
      worker.position.set(x, isLive ? 0.85 : 0.72, z - 0.48);
      if (!isLive) {
        worker.rotation.x = 0.55; // Resting/leaning when Down
      }
      scene.add(worker);
      if (isLive) liveWorkers.push(worker);

      // Status Ring (Pulsing Green if Live, Dim Red if Down)
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.16, 0.24, 16),
        new THREE.MeshBasicMaterial({
          color: isLive ? 0x34d399 : 0xef4444,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: isLive ? 0.95 : 0.4,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 1.35, z);
      scene.add(ring);
      if (isLive) liveRings.push(ring);
    });

    let rafId = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      liveRings.forEach((r, i) => {
        const s = 1 + 0.25 * Math.sin(t * 4 + i);
        r.scale.set(s, s, 1);
      });
      liveWorkers.forEach((w, i) => {
        w.position.y = 0.85 + 0.04 * Math.sin(t * 8 + i);
      });
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      renderer.dispose();
    };
  }, [tiles]);

  return (
    <div className="bg-[#14161a] border border-white/10 rounded-2xl p-4 space-y-3 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Bumiayu Zen 2.5D Office</h2>
          <p className="text-xs text-white/50">OrthographicCamera · Zero-Shadow · Chibi State</p>
        </div>
        <span className="text-[11px] font-mono px-2 py-1 rounded bg-sky-500/20 text-sky-300">
          CPU {cpuPercent.toFixed(0)}% · RAM {ramPercent.toFixed(0)}%
        </span>
      </div>
      <div ref={mountRef} className="w-full h-[240px] rounded-xl bg-[#0b0d10] border border-white/5 overflow-hidden" />
    </div>
  );
}
