import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { TileItem } from '../types';

interface Office3DViewProps {
  tiles: TileItem[];
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
    const d = 4.5;

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

    // Lightweight lighting (no heavy shadows for 60fps mobile)
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(5, 10, 4);
    dir.castShadow = false;
    scene.add(ambient, dir);

    // Isometric floor
    const floorGeo = new THREE.BoxGeometry(7, 0.2, 5);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x181b22 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.1;
    scene.add(floor);

    // App server/desk meshes + pulsing green live indicators
    const indicators: THREE.Mesh[] = [];
    const nodeTiles = tiles.slice(0, 6);
    nodeTiles.forEach((tile, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = (col - 1) * 2.1;
      const z = (row - 0.5) * 2.0;

      const deskGeo = new THREE.BoxGeometry(1.2, 0.9, 1.0);
      const colorHex = parseInt((tile.color || '#0078D7').replace('#', ''), 16) || 0x0078d7;
      const deskMat = new THREE.MeshLambertMaterial({ color: colorHex });
      const desk = new THREE.Mesh(deskGeo, deskMat);
      desk.position.set(x, 0.45, z);
      scene.add(desk);

      const dotGeo = new THREE.SphereGeometry(0.14, 12, 12);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.set(x, 1.2, z);
      scene.add(dot);
      indicators.push(dot);
    });

    let rafId = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      indicators.forEach((dot, i) => {
        const s = 1 + 0.25 * Math.sin(t * 4 + i);
        dot.scale.set(s, s, s);
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
          <h2 className="text-base font-semibold">Kantor Server 3D (Isometrik)</h2>
          <p className="text-xs text-white/50">Three.js OrthographicCamera · 60fps Mobile</p>
        </div>
        <span className="text-[11px] font-mono px-2 py-1 rounded bg-sky-500/20 text-sky-300">
          CPU {cpuPercent.toFixed(0)}% · RAM {ramPercent.toFixed(0)}%
        </span>
      </div>
      <div ref={mountRef} className="w-full h-[240px] rounded-xl bg-[#0b0d10] border border-white/5 overflow-hidden" />
    </div>
  );
}
