import * as THREE from 'three';
import { DisplayTexture } from './displayTexture.js';

/**
 * AeroPods X — 3D Procedural Model Generator
 * 
 * Hierarchy:
 * AeroPodsCase (Root Group)
 * ├── CaseBody (Lower chassis, interior molded docking bay, USB-C, pairing button)
 * ├── CaseLid (Articulated upper shell rotating around precision hinge pivot)
 * ├── Hinge (Titanium dual-knuckle mechanical barrel)
 * ├── StatusDisplay (Curved front OLED pill with dynamic canvas texture)
 * ├── LeftEarbud (Acoustic head, silicone tip, aerodynamic blade stem, ANC mic)
 * ├── RightEarbud (Mirrored aerodynamic earbud with charging contacts & touch sensor)
 * ├── ChargingContacts (Gold pogo pins in dock & stems)
 * └── AccentDetails (Status lightguides, laser markings, micro grilles)
 */
export class AeroPodsModel {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'AeroPodsCase';

    // State
    this.lidAngle = 0; // 0 (closed) to 1.7 (open ~97 deg)
    this.targetLidAngle = 1.35; // Default slightly open for maximum visual appeal!
    this.budsElevated = false;
    this.budsElevation = 0;
    this.targetBudsElevation = 0;

    // Hotspot 3D anchors (world coordinates will be calculated)
    this.hotspots = {
      anc: { position: new THREE.Vector3(), label: 'Adaptive Noise Cancellation', description: 'Dual feedforward acoustic micro-mesh with 48kHz anti-phase wave inversion.' },
      battery: { position: new THREE.Vector3(), label: '40-Hour Dual-Cell Battery', description: 'Graphene-enhanced split power cells with 65W Qi2 wireless ultra-charge.' },
      display: { position: new THREE.Vector3(), label: 'Smart OLED Status Pill', description: 'Real-time battery telemetry, ANC profile status, and pairing monitor.' }
    };

    // Colorway themes
    this.themes = {
      obsidian: {
        name: 'Obsidian Stealth',
        primary: 0x121417,
        secondary: 0x1d2127,
        metal: 0x484d56,
        accent: '#00e5ff',
        accentHex: 0x00e5ff,
        silicone: 0x1e2229
      },
      titanium: {
        name: 'Titanium Nebula',
        primary: 0x767c87,
        secondary: 0x2b3342,
        metal: 0xa0a8b4,
        accent: '#ff9f1c',
        accentHex: 0xff9f1c,
        silicone: 0x333b47
      },
      cyber: {
        name: 'Cyber Carbon',
        primary: 0x151918,
        secondary: 0x1c2b24,
        metal: 0x2e4a3b,
        accent: '#00f59b',
        accentHex: 0x00f59b,
        silicone: 0x1c2420
      }
    };
    this.currentThemeKey = 'obsidian';

    // Initialize display canvas
    this.displayTextureManager = new DisplayTexture();
    this.displayTexture = new THREE.CanvasTexture(this.displayTextureManager.canvas);
    this.displayTexture.colorSpace = THREE.SRGBColorSpace;

    // Materials
    this.createMaterials();

    // Build the 3D hierarchy
    this.buildModel();
  }

  createMaterials() {
    const theme = this.themes[this.currentThemeKey];

    // 1. Main Case Body: Luxury Matte Nanocoat
    this.matBody = new THREE.MeshStandardMaterial({
      color: theme.primary,
      roughness: 0.52,
      metalness: 0.15,
      name: 'Mat_CaseBody'
    });

    // 2. Interior / Secondary Shell: Satin Obsidian Finish
    this.matInterior = new THREE.MeshStandardMaterial({
      color: theme.secondary,
      roughness: 0.35,
      metalness: 0.28,
      name: 'Mat_Interior'
    });

    // 3. Metal: Brushed Aerospace Titanium / Gunmetal
    this.matMetal = new THREE.MeshStandardMaterial({
      color: theme.metal,
      roughness: 0.26,
      metalness: 0.88,
      name: 'Mat_Titanium'
    });

    // 4. Gold Contacts: Polished Gold Pogo Pins
    this.matGold = new THREE.MeshStandardMaterial({
      color: 0xffcb47,
      roughness: 0.15,
      metalness: 0.95,
      name: 'Mat_Gold'
    });

    // 5. Earbud Shell: High-Precision Aerodynamic Satin
    this.matEarbudBody = new THREE.MeshStandardMaterial({
      color: theme.primary,
      roughness: 0.38,
      metalness: 0.25,
      name: 'Mat_EarbudBody'
    });

    // 6. Silicone Ear Tips: Soft Matte Acoustic Silicone
    this.matSilicone = new THREE.MeshStandardMaterial({
      color: theme.silicone,
      roughness: 0.82,
      metalness: 0.05,
      name: 'Mat_Silicone'
    });

    // 7. Emissive Accent (Status Indicator / Trim)
    this.matAccent = new THREE.MeshStandardMaterial({
      color: theme.accentHex,
      emissive: theme.accentHex,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.1,
      name: 'Mat_Accent'
    });

    // 8. OLED Display Material
    this.matDisplay = new THREE.MeshBasicMaterial({
      map: this.displayTexture,
      name: 'Mat_OLED_Display'
    });

    // 9. Acoustic Micro Mesh (Grille)
    this.matAcousticMesh = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.65,
      metalness: 0.75,
      wireframe: false,
      name: 'Mat_AcousticMesh'
    });
  }

  setTheme(themeKey) {
    if (!this.themes[themeKey]) return;
    this.currentThemeKey = themeKey;
    const theme = this.themes[themeKey];

    this.matBody.color.setHex(theme.primary);
    this.matInterior.color.setHex(theme.secondary);
    this.matMetal.color.setHex(theme.metal);
    this.matEarbudBody.color.setHex(theme.primary);
    this.matSilicone.color.setHex(theme.silicone);
    this.matAccent.color.setHex(theme.accentHex);
    this.matAccent.emissive.setHex(theme.accentHex);

    this.displayTextureManager.setState({ accentColor: theme.accent });
    this.displayTexture.needsUpdate = true;
  }

  buildModel() {
    // Reference Dimensions (in Three.js world units, scaled to ~6.4cm wide)
    // Width X = 5.2, Depth Z = 3.8, Total Height Y = 3.6
    const caseWidth = 5.2;
    const caseDepth = 3.8;
    const lowerHeight = 2.1;
    const upperHeight = 1.4;
    const hingeZ = -1.82;
    const hingeY = 1.05;

    // ========================================================
    // 1. LOWER CASE CHASSIS (CaseBody)
    // ========================================================
    this.caseBody = new THREE.Group();
    this.caseBody.name = 'CaseBody';

    // 1A. Outer Sculpted Shell: Aerodynamic Lozenge Profile
    const lowerOuterShape = this.createAerodynamicShape(caseWidth, caseDepth, 0.95);
    const extrudeLowerSettings = {
      steps: 3,
      depth: lowerHeight - 0.4,
      bevelEnabled: true,
      bevelThickness: 0.38,
      bevelSize: 0.35,
      bevelSegments: 8
    };

    const geomLowerOuter = new THREE.ExtrudeGeometry(lowerOuterShape, extrudeLowerSettings);
    geomLowerOuter.rotateX(-Math.PI / 2);
    geomLowerOuter.translate(0, 0.38, 0);

    const meshLowerOuter = new THREE.Mesh(geomLowerOuter, this.matBody);
    meshLowerOuter.castShadow = true;
    meshLowerOuter.receiveShadow = true;
    this.caseBody.add(meshLowerOuter);

    // 1B. Aerodynamic Sculpted Chamfer Bands (Lateral Flutes)
    const fluteShape = new THREE.BoxGeometry(0.12, 1.2, caseDepth * 0.65);
    const leftFlute = new THREE.Mesh(fluteShape, this.matMetal);
    leftFlute.position.set(-caseWidth * 0.48, 0.95, 0);
    leftFlute.rotation.z = 0.08;
    this.caseBody.add(leftFlute);

    const rightFlute = new THREE.Mesh(fluteShape, this.matMetal);
    rightFlute.position.set(caseWidth * 0.48, 0.95, 0);
    rightFlute.rotation.z = -0.08;
    this.caseBody.add(rightFlute);

    // 1C. Interior Molded Docking Cradle (Interior Liner)
    const innerTopShape = this.createAerodynamicShape(caseWidth * 0.91, caseDepth * 0.91, 0.85);
    const geomInnerDeck = new THREE.ExtrudeGeometry(innerTopShape, {
      steps: 1,
      depth: 0.25,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      bevelSegments: 4
    });
    geomInnerDeck.rotateX(-Math.PI / 2);
    geomInnerDeck.translate(0, lowerHeight - 0.12, 0);
    const meshInnerDeck = new THREE.Mesh(geomInnerDeck, this.matInterior);
    this.caseBody.add(meshInnerDeck);

    // 1D. Twin Sculpted Earbud Docking Wells (Cavities)
    const wellGeom = new THREE.CylinderGeometry(0.78, 0.65, 0.8, 24);
    const leftWellRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.04, 12, 32),
      this.matMetal
    );
    leftWellRing.rotation.x = Math.PI / 2;
    leftWellRing.position.set(-1.3, lowerHeight - 0.02, 0.15);
    this.caseBody.add(leftWellRing);

    const rightWellRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.04, 12, 32),
      this.matMetal
    );
    rightWellRing.rotation.x = Math.PI / 2;
    rightWellRing.position.set(1.3, lowerHeight - 0.02, 0.15);
    this.caseBody.add(rightWellRing);

    // 1E. Gold Pogo Charging Pins in Docking Wells
    this.chargingContacts = new THREE.Group();
    this.chargingContacts.name = 'ChargingContacts';

    const pinGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 12);
    // Left well contacts
    const p1 = new THREE.Mesh(pinGeom, this.matGold);
    p1.position.set(-1.42, lowerHeight - 0.35, 0.15);
    const p2 = new THREE.Mesh(pinGeom, this.matGold);
    p2.position.set(-1.18, lowerHeight - 0.35, 0.15);
    // Right well contacts
    const p3 = new THREE.Mesh(pinGeom, this.matGold);
    p3.position.set(1.18, lowerHeight - 0.35, 0.15);
    const p4 = new THREE.Mesh(pinGeom, this.matGold);
    p4.position.set(1.42, lowerHeight - 0.35, 0.15);

    this.chargingContacts.add(p1, p2, p3, p4);
    this.caseBody.add(this.chargingContacts);

    // 1F. Front Curved Smart OLED Display Pill
    const displayW = 2.4;
    const displayH = 0.65;
    const displayGeom = new THREE.PlaneGeometry(displayW, displayH, 16, 8);
    // Subtle cylindrical curve to conform to front aerodynamic hull
    const pos = displayGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const curveZ = Math.cos((x / displayW) * 1.2) * 0.08 - 0.08;
      pos.setZ(i, curveZ);
    }
    displayGeom.computeVertexNormals();

    this.displayMesh = new THREE.Mesh(displayGeom, this.matDisplay);
    this.displayMesh.name = 'StatusDisplay';
    this.displayMesh.position.set(0, 0.95, caseDepth * 0.495 + 0.02);
    this.caseBody.add(this.displayMesh);

    // Metallic frame around display pill
    const displayFrameGeom = new THREE.RingGeometry(0.3, 0.35, 32);
    const framePillGeom = new THREE.BoxGeometry(displayW + 0.12, displayH + 0.1, 0.02);
    const displayFrame = new THREE.Mesh(framePillGeom, this.matMetal);
    displayFrame.position.set(0, 0.95, caseDepth * 0.492);
    this.caseBody.add(displayFrame);

    // Hotspot 3 anchor position: Smart OLED Display
    this.hotspots.display.position.set(0, 1.0, caseDepth * 0.52);

    // 1G. Bottom USB-C Fast-Charging Port
    const usbcPort = new THREE.Group();
    usbcPort.name = 'USBC_Port';
    const usbcOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.72, 16),
      this.matMetal
    );
    usbcOuter.rotation.z = Math.PI / 2;
    usbcOuter.scale.set(1, 0.45, 1);
    const usbcInner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.58, 16),
      new THREE.MeshBasicMaterial({ color: 0x050505 })
    );
    usbcInner.rotation.z = Math.PI / 2;
    usbcInner.scale.set(1, 0.35, 1);
    const usbcPin = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.04, 0.12),
      this.matGold
    );
    usbcPort.add(usbcOuter, usbcInner, usbcPin);
    usbcPort.position.set(0, 0.02, 0);
    this.caseBody.add(usbcPort);

    // 1H. Rear Tactile Pairing Button
    const rearButton = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.06, 32),
      this.matMetal
    );
    rearButton.rotation.x = Math.PI / 2;
    rearButton.position.set(0, 0.85, -caseDepth * 0.49);
    this.caseBody.add(rearButton);

    // Hotspot 2 anchor position: Battery / Charging Core
    this.hotspots.battery.position.set(0, 0.55, 0.2);

    this.group.add(this.caseBody);

    // ========================================================
    // 2. PRECISION MECHANICAL HINGE (Hinge)
    // ========================================================
    this.hingeGroup = new THREE.Group();
    this.hingeGroup.name = 'Hinge';

    const hingeLength = 2.4;
    const hingeRadius = 0.18;
    const hingeGeom = new THREE.CylinderGeometry(hingeRadius, hingeRadius, hingeLength, 24);
    hingeGeom.rotateZ(Math.PI / 2);

    const hingePin = new THREE.Mesh(hingeGeom, this.matMetal);
    hingePin.position.set(0, hingeY, hingeZ);
    this.hingeGroup.add(hingePin);

    // Left and Right Knuckle caps
    const knuckleCapGeom = new THREE.SphereGeometry(hingeRadius, 16, 16);
    const leftKnuckle = new THREE.Mesh(knuckleCapGeom, this.matMetal);
    leftKnuckle.position.set(-hingeLength * 0.5, hingeY, hingeZ);
    const rightKnuckle = new THREE.Mesh(knuckleCapGeom, this.matMetal);
    rightKnuckle.position.set(hingeLength * 0.5, hingeY, hingeZ);
    this.hingeGroup.add(leftKnuckle, rightKnuckle);

    this.group.add(this.hingeGroup);

    // ========================================================
    // 3. ARTICULATED CASE LID (CaseLid)
    // ========================================================
    // The lid rotates around the hinge axle at (0, hingeY, hingeZ)
    this.lidPivot = new THREE.Group();
    this.lidPivot.name = 'CaseLid_Pivot';
    this.lidPivot.position.set(0, hingeY, hingeZ);

    this.caseLid = new THREE.Group();
    this.caseLid.name = 'CaseLid';

    // Outer Sculpted Aerodynamic Lid Shell
    const lidOuterShape = this.createAerodynamicShape(caseWidth, caseDepth, 0.95);
    const extrudeLidSettings = {
      steps: 3,
      depth: upperHeight - 0.25,
      bevelEnabled: true,
      bevelThickness: 0.35,
      bevelSize: 0.32,
      bevelSegments: 8
    };

    const geomLidOuter = new THREE.ExtrudeGeometry(lidOuterShape, extrudeLidSettings);
    geomLidOuter.rotateX(-Math.PI / 2);
    // Position lid relative to pivot
    geomLidOuter.translate(0, 0, -hingeZ);

    const meshLidOuter = new THREE.Mesh(geomLidOuter, this.matBody);
    meshLidOuter.castShadow = true;
    this.caseLid.add(meshLidOuter);

    // Ergonomic Front Acoustic Thumb Scoop on Lid Lip
    const scoopGeom = new THREE.CylinderGeometry(0.65, 0.65, 0.15, 24);
    scoopGeom.rotateX(Math.PI / 2);
    const scoopMesh = new THREE.Mesh(scoopGeom, this.matInterior);
    scoopMesh.position.set(0, 0.08, caseDepth * 0.495);
    this.caseLid.add(scoopMesh);

    // Interior Lid Acoustic Lining
    const lidLiningShape = this.createAerodynamicShape(caseWidth * 0.88, caseDepth * 0.88, 0.8);
    const geomLidLining = new THREE.ExtrudeGeometry(lidLiningShape, {
      steps: 1,
      depth: 0.1,
      bevelEnabled: false
    });
    geomLidLining.rotateX(-Math.PI / 2);
    geomLidLining.translate(0, 0.05, -hingeZ);
    const meshLidLining = new THREE.Mesh(geomLidLining, this.matInterior);
    this.caseLid.add(meshLidLining);

    // Subtle AeroPods X Debossed Ridge on top of lid
    const ridgeGeom = new THREE.BoxGeometry(caseWidth * 0.45, 0.04, 0.06);
    const ridgeMesh = new THREE.Mesh(ridgeGeom, this.matAccent);
    ridgeMesh.position.set(0, upperHeight + 0.1, -hingeZ);
    this.caseLid.add(ridgeMesh);

    // Offset caseLid to align with the pivot point
    this.caseLid.position.set(0, 0, 0);
    this.lidPivot.add(this.caseLid);
    this.group.add(this.lidPivot);

    // ========================================================
    // 4. AERODYNAMIC WIRELESS EARBUDS (LeftEarbud & RightEarbud)
    // ========================================================
    this.earbudGroup = new THREE.Group();
    this.earbudGroup.name = 'EarbudsContainer';

    this.leftEarbud = this.createEarbud('L');
    this.leftEarbud.name = 'LeftEarbud';
    this.leftEarbud.position.set(-1.3, lowerHeight - 0.1, 0.15);

    this.rightEarbud = this.createEarbud('R');
    this.rightEarbud.name = 'RightEarbud';
    this.rightEarbud.position.set(1.3, lowerHeight - 0.1, 0.15);

    this.earbudGroup.add(this.leftEarbud, this.rightEarbud);
    this.group.add(this.earbudGroup);

    // Hotspot 1 anchor position: Left Earbud ANC Sensor
    this.hotspots.anc.targetMesh = this.leftEarbud;

    // Apply initial lid angle
    this.setLidAngle(this.targetLidAngle);
  }

  /**
   * Generates a custom sculpted aerodynamic lozenge 2D shape.
   * Features ergonomic rounded chamfers and subtle front curvature.
   */
  createAerodynamicShape(width, depth, curvatureFactor = 1.0) {
    const shape = new THREE.Shape();
    const w = width / 2;
    const d = depth / 2;
    const r = Math.min(w, d) * 0.55 * curvatureFactor;

    // Draw aerodynamic contoured perimeter with smooth beziers
    shape.moveTo(-w + r, -d);
    // Bottom edge (rear) with subtle concave tuck
    shape.quadraticCurveTo(0, -d + 0.08, w - r, -d);
    // Bottom-right corner
    shape.quadraticCurveTo(w, -d, w, -d + r);
    // Right aerodynamic flank
    shape.lineTo(w, d - r);
    // Top-right corner
    shape.quadraticCurveTo(w, d, w - r, d);
    // Top edge (front) with ergonomic convex forward arc
    shape.quadraticCurveTo(0, d + 0.15, -w + r, d);
    // Top-left corner
    shape.quadraticCurveTo(-w, d, -w, d - r);
    // Left aerodynamic flank
    shape.lineTo(-w, -d + r);
    // Bottom-left corner
    shape.quadraticCurveTo(-w, -d, -w + r, -d);

    return shape;
  }

  /**
   * Constructs an individual aerodynamic earbud.
   * Completely unique silhouette:
   * - Sculpted organic acoustic head (concha chamber)
   * - Soft silicone dual-flange ear tip with sound port
   * - Aerodynamic swept blade stem (airfoil profile)
   * - Capacitive touch sensor ribbon with brushed titanium inlay
   * - Feedforward ANC acoustic mesh vent (Hotspot 1)
   * - Dual gold micro charging contacts at stem tip
   * - Debossed "L" / "R" channel badge
   */
  createEarbud(side = 'L') {
    const bud = new THREE.Group();
    const isLeft = side === 'L';
    const mirrorSign = isLeft ? -1 : 1;

    // 4A. Acoustic Sound Chamber (Ergonomic Concha Head)
    const headGeom = new THREE.SphereGeometry(0.48, 24, 20);
    headGeom.scale(1.15, 0.95, 0.92);
    const meshHead = new THREE.Mesh(headGeom, this.matEarbudBody);
    meshHead.castShadow = true;
    bud.add(meshHead);

    // 4B. Angled Acoustic Nozzle with Soft Silicone Ear Tip
    const nozzleGroup = new THREE.Group();
    nozzleGroup.position.set(mirrorSign * 0.28, 0.15, 0.22);
    nozzleGroup.rotation.y = mirrorSign * 0.45;
    nozzleGroup.rotation.x = 0.3;

    // Titanium sound nozzle barrel
    const nozzleBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.25, 20),
      this.matMetal
    );
    nozzleBarrel.rotation.x = Math.PI / 2;
    nozzleGroup.add(nozzleBarrel);

    // Acoustic sound mesh inside nozzle
    const meshAcousticFilter = new THREE.Mesh(
      new THREE.CircleGeometry(0.17, 16),
      this.matAcousticMesh
    );
    meshAcousticFilter.position.set(0, 0, 0.13);
    nozzleGroup.add(meshAcousticFilter);

    // Soft Silicone Ear Tip (Contoured bell curve via LatheGeometry)
    const tipPoints = [];
    tipPoints.push(new THREE.Vector2(0.17, 0.0));
    tipPoints.push(new THREE.Vector2(0.32, 0.1));
    tipPoints.push(new THREE.Vector2(0.38, 0.22));
    tipPoints.push(new THREE.Vector2(0.36, 0.35));
    tipPoints.push(new THREE.Vector2(0.24, 0.42));
    tipPoints.push(new THREE.Vector2(0.16, 0.4));

    const geomTip = new THREE.LatheGeometry(tipPoints, 24);
    geomTip.rotateX(Math.PI / 2);
    const meshTip = new THREE.Mesh(geomTip, this.matSilicone);
    meshTip.position.set(0, 0, 0.05);
    nozzleGroup.add(meshTip);

    bud.add(nozzleGroup);

    // 4C. Aerodynamic Swept Blade Stem (Distinctive Airfoil Silhouette)
    const stemLength = 1.35;
    const stemShape = new THREE.Shape();
    // Swept blade aerodynamic profile
    stemShape.moveTo(0, -0.15);
    stemShape.quadraticCurveTo(0.22, -0.1, 0.24, 0.0);
    stemShape.quadraticCurveTo(0.18, 0.15, 0, 0.18);
    stemShape.quadraticCurveTo(-0.16, 0.12, -0.2, 0.0);
    stemShape.quadraticCurveTo(-0.15, -0.12, 0, -0.15);

    const geomStem = new THREE.ExtrudeGeometry(stemShape, {
      steps: 4,
      depth: stemLength,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: 6
    });
    geomStem.rotateX(Math.PI / 2);
    // Slight forward ergonomic sweep angle (14 degrees)
    geomStem.rotateZ(mirrorSign * -0.06);

    const meshStem = new THREE.Mesh(geomStem, this.matEarbudBody);
    meshStem.position.set(mirrorSign * -0.08, -0.2, -0.08);
    meshStem.castShadow = true;
    bud.add(meshStem);

    // 4D. Outer Capacitive Touch Sensor Ribbon (Brushed Titanium Strip)
    const ribbonGeom = new THREE.BoxGeometry(0.1, stemLength * 0.75, 0.02);
    const meshRibbon = new THREE.Mesh(ribbonGeom, this.matMetal);
    meshRibbon.position.set(mirrorSign * -0.26, -0.75, -0.08);
    meshRibbon.rotation.y = mirrorSign * Math.PI / 2;
    bud.add(meshRibbon);

    // Micro LED indicator dot on touch ribbon
    const ledGeom = new THREE.SphereGeometry(0.025, 12, 12);
    const meshLed = new THREE.Mesh(ledGeom, this.matAccent);
    meshLed.position.set(mirrorSign * -0.28, -0.45, -0.08);
    bud.add(meshLed);

    // 4E. Feedforward ANC Acoustic Vent (Top Active Noise Cancelling Mic Grille)
    const ancVentGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16);
    ancVentGeom.rotateX(Math.PI / 2);
    const meshAncVent = new THREE.Mesh(ancVentGeom, this.matMetal);
    meshAncVent.position.set(0, 0.46, 0.05);

    const ancMeshGrille = new THREE.Mesh(
      new THREE.CircleGeometry(0.09, 16),
      this.matAcousticMesh
    );
    ancMeshGrille.position.set(0, 0.48, 0.05);
    ancMeshGrille.rotation.x = -Math.PI / 2;
    bud.add(meshAncVent, ancMeshGrille);

    // 4F. Bottom Beamforming Microphone Slot
    const micSlotGeom = new THREE.BoxGeometry(0.06, 0.02, 0.08);
    const micSlotMesh = new THREE.Mesh(micSlotGeom, this.matAcousticMesh);
    micSlotMesh.position.set(mirrorSign * -0.08, -stemLength - 0.2, -0.08);
    bud.add(micSlotMesh);

    // 4G. Dual Gold Charging Contact Pads at Stem Tip
    const contactPadGeom = new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12);
    const pad1 = new THREE.Mesh(contactPadGeom, this.matGold);
    pad1.position.set(mirrorSign * -0.08, -stemLength - 0.22, -0.14);
    const pad2 = new THREE.Mesh(contactPadGeom, this.matGold);
    pad2.position.set(mirrorSign * -0.08, -stemLength - 0.22, -0.02);
    bud.add(pad1, pad2);

    // 4H. Laser-Debossed Channel Identifier ('L' or 'R')
    const badgeGeom = new THREE.PlaneGeometry(0.12, 0.12);
    const badgeMesh = new THREE.Mesh(badgeGeom, this.matMetal);
    badgeMesh.position.set(mirrorSign * 0.15, -0.3, -0.08);
    badgeMesh.rotation.y = mirrorSign * -Math.PI / 2;
    bud.add(badgeMesh);

    // Store reference to ANC sensor for Hotspot 1
    bud.ancSensorPosition = new THREE.Vector3(0, 0.48, 0.05);

    return bud;
  }

  setLidAngle(angle) {
    this.lidAngle = Math.max(0, Math.min(1.7, angle));
    if (this.lidPivot) {
      // Rotating backwards around hinge X axis
      this.lidPivot.rotation.x = -this.lidAngle;
    }
  }

  toggleLid() {
    this.targetLidAngle = this.targetLidAngle > 0.4 ? 0 : 1.55;
    return this.targetLidAngle > 0.4;
  }

  toggleBudsElevated() {
    this.budsElevated = !this.budsElevated;
    this.targetBudsElevation = this.budsElevated ? 1.4 : 0;
    // If undocking, ensure lid is opened
    if (this.budsElevated && this.targetLidAngle < 0.8) {
      this.targetLidAngle = 1.55;
    }
    return this.budsElevated;
  }

  setAncMode(mode) {
    this.displayTextureManager.setState({ ancMode: mode });
    this.displayTexture.needsUpdate = true;
  }

  update(delta) {
    // 1. Smoothly interpolate lid rotation
    if (Math.abs(this.lidAngle - this.targetLidAngle) > 0.001) {
      this.lidAngle += (this.targetLidAngle - this.lidAngle) * Math.min(1, delta * 9);
      this.setLidAngle(this.lidAngle);
    }

    // 2. Smoothly interpolate earbud elevation (Inspect / Undocked mode)
    if (Math.abs(this.budsElevation - this.targetBudsElevation) > 0.001) {
      this.budsElevation += (this.targetBudsElevation - this.budsElevation) * Math.min(1, delta * 6);
      
      const leftBaseY = 2.0;
      const rightBaseY = 2.0;
      this.leftEarbud.position.y = leftBaseY + this.budsElevation;
      this.rightEarbud.position.y = rightBaseY + this.budsElevation;

      // When elevated, splay earbuds slightly outward for aesthetic exhibition inspection
      const splay = this.budsElevation * 0.15;
      this.leftEarbud.position.x = -1.3 - splay;
      this.rightEarbud.position.x = 1.3 + splay;

      const tilt = this.budsElevation * 0.2;
      this.leftEarbud.rotation.y = -tilt;
      this.rightEarbud.rotation.y = tilt;
      this.leftEarbud.rotation.x = tilt * 0.5;
      this.rightEarbud.rotation.x = tilt * 0.5;
    }

    // 3. Update dynamic OLED display texture animation
    this.displayTextureManager.update(delta);
    this.displayTexture.needsUpdate = true;

    // 4. Update Hotspot World Coordinates
    if (this.leftEarbud) {
      const ancWorld = new THREE.Vector3(0, 0.48, 0.05);
      this.leftEarbud.localToWorld(ancWorld);
      this.hotspots.anc.position.copy(ancWorld);
    }
  }
}
