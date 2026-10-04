import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AeroPodsModel } from './model/AeroPodsModel.js';
import { sounds } from './audio/soundEffects.js';

class AeroPodsShowcase {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Animation & State
    this.isFloating = true;
    this.floatTime = 0;
    this.showHotspots = true;
    this.soundEnabled = true;
    this.activeHotspotId = null;

    // Camera preset targets
    this.cameraPresets = {
      hero: {
        pos: new THREE.Vector3(5.5, 4.2, 7.8),
        target: new THREE.Vector3(0, 1.6, 0)
      },
      buds: {
        pos: new THREE.Vector3(0.0, 5.8, 5.0),
        target: new THREE.Vector3(0, 2.0, 0.2)
      },
      macro: {
        pos: new THREE.Vector3(-1.8, 3.2, 2.6),
        target: new THREE.Vector3(-1.2, 2.4, 0.2)
      },
      back: {
        pos: new THREE.Vector3(0.0, 3.2, -7.5),
        target: new THREE.Vector3(0, 1.4, 0)
      },
      top: {
        pos: new THREE.Vector3(0.0, 9.5, 0.5),
        target: new THREE.Vector3(0, 1.2, 0)
      }
    };

    // Camera animation tween state
    this.isCameraAnimating = false;
    this.cameraTargetPos = new THREE.Vector3();
    this.cameraTargetLook = new THREE.Vector3();

    this.initScene();
    this.initLights();
    this.initModel();
    this.initGroundShadow();
    this.initUI();
    this.bindEvents();

    this.clock = new THREE.Clock();
    this.animate();
  }

  initScene() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0e12);
    // Subtle atmospheric fog to blend into darkness
    this.scene.fog = new THREE.FogExp2(0x0c0e12, 0.035);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(38, this.width / this.height, 0.1, 100);
    this.camera.position.copy(this.cameraPresets.hero.pos);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.copy(this.cameraPresets.hero.target);
    this.controls.minDistance = 3.5;
    this.controls.maxDistance = 16.0;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.08; // Prevent looking from below ground
    this.controls.minPolarAngle = 0.1;
  }

  initLights() {
    // Luxury 3-Point Studio Lighting

    // Ambient baseline
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    // Key Light: Warm Studio Key (Top-Right-Front)
    this.keyLight = new THREE.DirectionalLight(0xfff8f0, 2.2);
    this.keyLight.position.set(6, 9, 7);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 25;
    this.keyLight.shadow.camera.left = -6;
    this.keyLight.shadow.camera.right = 6;
    this.keyLight.shadow.camera.top = 6;
    this.keyLight.shadow.camera.bottom = -6;
    this.keyLight.shadow.bias = -0.0005;
    this.scene.add(this.keyLight);

    // Fill Light: Soft Cool Light (Left-Front)
    this.fillLight = new THREE.DirectionalLight(0xdde8f8, 1.1);
    this.fillLight.position.set(-7, 4, 5);
    this.scene.add(this.fillLight);

    // Rim / Kicker Light: Cool Cyan-Skimmed Backlight (Highlights aerodynamic chamfers & hinge)
    this.rimLight = new THREE.DirectionalLight(0x70d8ff, 1.8);
    this.rimLight.position.set(0, 5, -8);
    this.scene.add(this.rimLight);

    // Under-bounce light for subtle chassis detail
    const bounceLight = new THREE.DirectionalLight(0x303540, 0.4);
    bounceLight.position.set(0, -5, 0);
    this.scene.add(bounceLight);
  }

  initModel() {
    this.aeroPods = new AeroPodsModel();
    // Offset slightly so it rests nicely above ground
    this.modelWrapper = new THREE.Group();
    this.modelWrapper.position.set(0, 0.1, 0);
    this.modelWrapper.add(this.aeroPods.group);
    this.scene.add(this.modelWrapper);
  }

  initGroundShadow() {
    // High-resolution soft contact shadow canvas
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 512;
    shadowCanvas.height = 512;
    const sctx = shadowCanvas.getContext('2d');

    const grad = sctx.createRadialGradient(256, 256, 40, 256, 256, 240);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
    grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.45)');
    grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.12)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 512, 512);

    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeom = new THREE.PlaneGeometry(12, 10);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false
    });

    this.groundShadow = new THREE.Mesh(shadowGeom, shadowMat);
    this.groundShadow.rotation.x = -Math.PI / 2;
    this.groundShadow.position.y = 0.01;
    this.scene.add(this.groundShadow);

    // Studio Floor Grid & Reflection Plane
    const floorGeom = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0c0e12,
      roughness: 0.85,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  initUI() {
    this.lidToggleBtn = document.getElementById('btn-toggle-lid');
    this.elevateBtn = document.getElementById('btn-elevate-buds');
    this.floatToggleBtn = document.getElementById('btn-toggle-float');
    this.soundToggleBtn = document.getElementById('btn-toggle-sound');
    this.hotspotToggleBtn = document.getElementById('btn-toggle-hotspots');
    this.drawer = document.getElementById('hotspot-drawer');
    this.drawerTitle = document.getElementById('drawer-title');
    this.drawerBody = document.getElementById('drawer-body');
    this.drawerClose = document.getElementById('drawer-close');

    // Hotspot HTML elements
    this.hotspotElements = {
      anc: document.getElementById('hotspot-anc'),
      battery: document.getElementById('hotspot-battery'),
      display: document.getElementById('hotspot-display')
    };

    // Update initial button states
    this.updateLidButtonText(true);
  }

  updateLidButtonText(isOpen) {
    if (!this.lidToggleBtn) return;
    this.lidToggleBtn.innerHTML = isOpen
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg> <span>Close Case Lid</span>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg> <span>Open Case Lid</span>`;
  }

  bindEvents() {
    // Resize
    window.addEventListener('resize', () => this.onResize());

    // Lid Toggle
    this.lidToggleBtn.addEventListener('click', () => {
      const isOpen = this.aeroPods.toggleLid();
      this.updateLidButtonText(isOpen);
      if (this.soundEnabled) {
        if (isOpen) sounds.playLidOpen();
        else sounds.playLidClose();
      }
    });

    // Earbud Undock / Elevate
    this.elevateBtn.addEventListener('click', () => {
      const isElevated = this.aeroPods.toggleBudsElevated();
      this.elevateBtn.classList.toggle('active', isElevated);
      this.elevateBtn.querySelector('span').textContent = isElevated ? 'Dock Earbuds' : 'Inspect Earbuds';
      if (this.soundEnabled) sounds.playChime();
      if (isElevated) {
        this.updateLidButtonText(true);
      }
    });

    // Floating Toggle
    this.floatToggleBtn.addEventListener('click', () => {
      this.isFloating = !this.isFloating;
      this.floatToggleBtn.classList.toggle('active', this.isFloating);
      if (this.soundEnabled) sounds.playHotspotClick();
    });

    // Hotspots Visibility Toggle
    this.hotspotToggleBtn.addEventListener('click', () => {
      this.showHotspots = !this.showHotspots;
      this.hotspotToggleBtn.classList.toggle('active', this.showHotspots);
      const container = document.getElementById('hotspots-container');
      if (container) {
        container.style.opacity = this.showHotspots ? '1' : '0';
        container.style.pointerEvents = this.showHotspots ? 'auto' : 'none';
      }
      if (this.soundEnabled) sounds.playHotspotClick();
    });

    // Sound Mute Toggle
    this.soundToggleBtn.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      sounds.muted = !this.soundEnabled;
      this.soundToggleBtn.classList.toggle('muted', !this.soundEnabled);
      const icon = this.soundToggleBtn.querySelector('svg');
      if (this.soundEnabled) {
        sounds.playChime();
      }
    });

    // Camera Preset Buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const presetKey = btn.dataset.preset;
        if (this.cameraPresets[presetKey]) {
          document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.animateCameraTo(this.cameraPresets[presetKey]);
          if (this.soundEnabled) sounds.playHotspotClick();

          // Auto-adjust lid for certain camera angles
          if (presetKey === 'buds' || presetKey === 'macro') {
            this.aeroPods.targetLidAngle = 1.55;
            this.updateLidButtonText(true);
          }
        }
      });
    });

    // Colorway Switcher Buttons
    document.querySelectorAll('.colorway-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        this.aeroPods.setTheme(theme);
        document.querySelectorAll('.colorway-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.soundEnabled) sounds.playChime();

        // Update accent color in CSS variables
        const themeConfig = this.aeroPods.themes[theme];
        if (themeConfig) {
          document.documentElement.style.setProperty('--accent-color', themeConfig.accent);
        }
      });
    });

    // ANC Mode Toggle Buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this.aeroPods.setAncMode(mode);
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.soundEnabled) sounds.playChime();
      });
    });

    // Hotspot Pin Clicks
    Object.keys(this.hotspotElements).forEach(key => {
      const el = this.hotspotElements[key];
      if (el) {
        el.addEventListener('click', () => {
          this.openHotspotDetail(key);
        });
      }
    });

    // Drawer Close
    if (this.drawerClose) {
      this.drawerClose.addEventListener('click', () => {
        this.closeHotspotDetail();
      });
    }

    // Click on canvas to deselect / close drawer if clicking outside
    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      // Don't auto-close if clicking drawer itself
    });
  }

  openHotspotDetail(id) {
    this.activeHotspotId = id;
    if (this.soundEnabled) sounds.playHotspotClick();

    const info = {
      anc: {
        title: 'Adaptive Noise Cancellation (ANC)',
        badge: 'NEURAL ACOUSTIC ENGINE',
        body: `
          <p>Pasta Pods features dual feedforward & feedback micro-mesh acoustic apertures powered by a proprietary 48kHz neural DSP processor.</p>
          <div class="stat-grid">
            <div class="stat-card">
              <span class="stat-val">-48 dB</span>
              <span class="stat-lbl">Noise Floor Reduction</span>
            </div>
            <div class="stat-card">
              <span class="stat-val">38 μs</span>
              <span class="stat-lbl">Anti-Phase Latency</span>
            </div>
          </div>
          <p class="stat-desc">Aero-sculpted wind deflector chimneys eliminate micro-turbulence noise when cycling, running, or moving through wind.</p>
        `
      },
      battery: {
        title: '40-Hour Dual-Cell Architecture',
        badge: 'GRAPHENE ULTRA-CHARGE',
        body: `
          <p>The asymmetric sculpted charging case conceals dual high-density graphene-silicon battery cells engineered for ultra-fast charging and sustained endurance.</p>
          <div class="stat-grid">
            <div class="stat-card">
              <span class="stat-val">40 hrs</span>
              <span class="stat-lbl">Total Case Playback</span>
            </div>
            <div class="stat-card">
              <span class="stat-val">10 min</span>
              <span class="stat-lbl">Fast Charge = 6h Play</span>
            </div>
          </div>
          <p class="stat-desc">Integrated Qi2 certified magnetic resonant wireless charging coil + precision gold-plated pogo contact array.</p>
        `
      },
      display: {
        title: 'Smart OLED Status Pill',
        badge: 'DYNAMIC TELEMETRY PILL',
        body: `
          <p>Curved organic LED display embedded directly into the front aerodynamic chassis provides glanceable real-time feedback without looking at your smartphone.</p>
          <div class="stat-grid">
            <div class="stat-card">
              <span class="stat-val">OLED</span>
              <span class="stat-lbl">Glanceable Matrix</span>
            </div>
            <div class="stat-card">
              <span class="stat-val">96 kHz</span>
              <span class="stat-lbl">Lossless Stream Monitor</span>
            </div>
          </div>
          <p class="stat-desc">Real-time battery readouts for both individual earbuds, charging state, active noise cancellation profiles, and incoming connection chimes.</p>
        `
      }
    };

    const data = info[id];
    if (data && this.drawer) {
      this.drawerTitle.innerHTML = `<span class="drawer-badge">${data.badge}</span><h2>${data.title}</h2>`;
      this.drawerBody.innerHTML = data.body;
      this.drawer.classList.add('open');
    }

    // Highlight hotspot element
    Object.keys(this.hotspotElements).forEach(k => {
      this.hotspotElements[k].classList.toggle('focused', k === id);
    });

    // Optionally tilt camera towards hotspot
    if (id === 'anc') {
      this.animateCameraTo(this.cameraPresets.macro);
    } else if (id === 'display') {
      this.animateCameraTo(this.cameraPresets.hero);
    } else if (id === 'battery') {
      this.animateCameraTo(this.cameraPresets.buds);
    }
  }

  closeHotspotDetail() {
    this.activeHotspotId = null;
    if (this.drawer) {
      this.drawer.classList.remove('open');
    }
    Object.keys(this.hotspotElements).forEach(k => {
      this.hotspotElements[k].classList.remove('focused');
    });
    if (this.soundEnabled) sounds.playHotspotClick();
  }

  animateCameraTo(preset) {
    this.isCameraAnimating = true;
    this.cameraTargetPos.copy(preset.pos);
    this.cameraTargetLook.copy(preset.target);
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  updateHotspots() {
    if (!this.showHotspots) return;

    const tempV = new THREE.Vector3();

    // Map each hotspot
    const entries = [
      { id: 'anc', pos: this.aeroPods.hotspots.anc.position },
      { id: 'battery', pos: this.aeroPods.hotspots.battery.position },
      { id: 'display', pos: this.aeroPods.hotspots.display.position }
    ];

    entries.forEach(({ id, pos }) => {
      const el = this.hotspotElements[id];
      if (!el) return;

      // Transform world position of hotspot
      tempV.copy(pos);
      if (this.modelWrapper) {
        tempV.applyMatrix4(this.modelWrapper.matrixWorld);
      }

      // Check if behind camera
      tempV.project(this.camera);

      // Check if visible within frustum and not behind camera
      const isBehind = tempV.z > 1;
      const x = (tempV.x * 0.5 + 0.5) * this.width;
      const y = (-(tempV.y * 0.5) + 0.5) * this.height;

      if (isBehind || x < -20 || x > this.width + 20 || y < -20 || y > this.height + 20) {
        el.style.display = 'none';
      } else {
        el.style.display = 'flex';
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    this.floatTime += delta;

    // 1. Subtle idle floating animation (gentle luxury levitation)
    if (this.isFloating) {
      const floatY = Math.sin(this.floatTime * 1.5) * 0.12;
      const tiltZ = Math.cos(this.floatTime * 0.9) * 0.025;
      const tiltX = Math.sin(this.floatTime * 1.1) * 0.02;

      this.modelWrapper.position.y = 0.15 + floatY;
      this.modelWrapper.rotation.z = tiltZ;
      this.modelWrapper.rotation.x = tiltX;

      // Ground shadow expands/contracts with float
      const shadowScale = 1.0 - floatY * 0.8;
      this.groundShadow.scale.set(shadowScale, shadowScale, shadowScale);
      this.groundShadow.material.opacity = Math.max(0.2, 0.7 - floatY * 1.2);
    } else {
      this.modelWrapper.position.y = 0.1;
      this.modelWrapper.rotation.z = 0;
      this.modelWrapper.rotation.x = 0;
      this.groundShadow.scale.set(1, 1, 1);
      this.groundShadow.material.opacity = 0.7;
    }

    // 2. Camera smooth transition animation
    if (this.isCameraAnimating) {
      this.camera.position.lerp(this.cameraTargetPos, Math.min(1, delta * 4.5));
      this.controls.target.lerp(this.cameraTargetLook, Math.min(1, delta * 4.5));

      if (this.camera.position.distanceTo(this.cameraTargetPos) < 0.05) {
        this.camera.position.copy(this.cameraTargetPos);
        this.controls.target.copy(this.cameraTargetLook);
        this.isCameraAnimating = false;
      }
    }

    // 3. Update AeroPods model procedural states
    this.aeroPods.update(delta);

    // 4. Update OrbitControls
    this.controls.update();

    // 5. Update Hotspot 3D-to-2D coordinates
    this.updateHotspots();

    // 6. Render Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new AeroPodsShowcase();
});
