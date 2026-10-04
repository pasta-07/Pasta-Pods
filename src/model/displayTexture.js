/**
 * Dynamic Canvas Texture for AeroPods X Smart OLED Display
 * Renders real-time battery status, ANC mode, audio bars, and branding.
 */
export class DisplayTexture {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 128;
    this.ctx = this.canvas.getContext('2d');

    this.state = {
      batteryCase: 92,
      batteryBuds: 100,
      ancMode: 'ANC: ACTIVE', // 'ANC: ACTIVE' | 'TRANSPARENCY' | 'SPATIAL 3D'
      isCharging: false,
      accentColor: '#00e5ff',
      time: 0
    };

    this.update();
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.update();
  }

  update(delta = 0) {
    this.state.time += delta;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // OLED Deep Black Background
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, w, h);

    // Subtle inner glowing border
    ctx.strokeStyle = '#121820';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Left Column: AEROPODS X Branding & Mode
    ctx.fillStyle = '#8b9bb4';
    ctx.font = 'bold 22px "Inter", "Segoe UI", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('AEROPODS X', 32, 42);

    // ANC Mode Badge with Accent Color
    ctx.fillStyle = this.state.accentColor;
    ctx.font = '600 20px "Inter", "Segoe UI", monospace';
    ctx.fillText(`● ${this.state.ancMode}`, 32, 82);

    // Small status subtitle
    ctx.fillStyle = '#505d70';
    ctx.font = '500 15px "Inter", sans-serif';
    ctx.fillText('HI-RES LOSSLESS AUDIO • 96kHz', 32, 108);

    // Right Column: Battery & Audio Visualizer
    const rightX = 330;

    // Case Battery Bar & Text
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 22px "Inter", monospace';
    ctx.fillText(`${this.state.batteryCase}%`, rightX + 90, 44);

    ctx.fillStyle = '#4a5568';
    ctx.font = '500 16px "Inter", sans-serif';
    ctx.fillText('CASE', rightX, 42);

    // Battery pill graphic
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    ctx.strokeRect(rightX + 50, 26, 32, 18);
    ctx.fillRect(rightX + 82, 31, 3, 8); // Battery terminal

    ctx.fillStyle = this.state.batteryCase > 20 ? this.state.accentColor : '#ef4444';
    const fillW = Math.max(2, (this.state.batteryCase / 100) * 26);
    ctx.fillRect(rightX + 53, 29, fillW, 12);

    // Audio frequency bars simulation
    const barCount = 14;
    const barWidth = 6;
    const barGap = 4;
    const visualizerX = rightX;
    const visualizerY = 70;

    for (let i = 0; i < barCount; i++) {
      // Dynamic wave formula
      const wave = Math.sin(this.state.time * 4 + i * 0.5) * 0.5 + 0.5;
      const wave2 = Math.cos(this.state.time * 2.5 - i * 0.8) * 0.3 + 0.5;
      const barHeight = Math.max(4, (wave * 0.6 + wave2 * 0.4) * 36);

      const grad = ctx.createLinearGradient(0, visualizerY + 36, 0, visualizerY);
      grad.addColorStop(0, '#005577');
      grad.addColorStop(1, this.state.accentColor);
      ctx.fillStyle = grad;

      ctx.fillRect(
        visualizerX + i * (barWidth + barGap),
        visualizerY + (36 - barHeight),
        barWidth,
        barHeight
      );
    }
  }
}
