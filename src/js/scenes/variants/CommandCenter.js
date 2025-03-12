import * as THREE from 'three';
import { RectAreaLight } from 'three/examples/jsm/lights/RectAreaLight.js';
import { InteractiveObject } from '../../components/InteractiveObject.js';

export class CommandCenter {
  constructor(scene, physics, options = {}) {
    this.scene = scene;
    this.physics = physics;
    this.options = Object.assign({
      width: 80,
      height: 20,
      depth: 80,
      wallThickness: 1,
      roomCount: 4,
      lightIntensity: 2,
      lightColor: 0xffffff,
    }, options);

    // Store scene elements
    this.structure = new THREE.Group();
    this.lights = new THREE.Group();
    this.interactives = new THREE.Group();
    this.effects = new THREE.Group();

    // Materials
    this.materials = {
      walls: new THREE.MeshStandardMaterial({
        color: 0x445566,
        roughness: 0.2,
        metalness: 0.8,
      }),
      floor: new THREE.MeshStandardMaterial({
        color: 0x334455,
        roughness: 0.8,
        metalness: 0.2,
      }),
      ceiling: new THREE.MeshStandardMaterial({
        color: 0x445566,
        roughness: 0.3,
        metalness: 0.7,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0x88ccff,
        transmission: 0.5,
        opacity: 0.5,
        metalness: 0.2,
        roughness: 0.1,
        ior: 1.5,
        thickness: 0.5,
        transparent: true,
      })
    };

    this.init();
  }

  init() {
    this.createStructure();
    this.createLighting();
    this.createInteractives();
    this.createEffects();
    
    // Add all groups to scene
    this.scene.add(this.structure);
    this.scene.add(this.lights);
    this.scene.add(this.interactives);
    this.scene.add(this.effects);
  }

  createStructure() {
    this.createWalls();
    this.createRooms();
    this.addPhysicsBodies();
  }

  createWalls() {
    const { width, height, depth, wallThickness } = this.options;

    // Create walls array for physics bodies
    const walls = [];

    // Front wall with entrance
    const frontWall = this.createWallWithDoor(width, height, wallThickness);
    frontWall.position.z = depth / 2;
    this.structure.add(frontWall);
    walls.push(frontWall);

    // Back wall
    const backWallGeometry = new THREE.BoxGeometry(width, height, wallThickness);
    const backWall = new THREE.Mesh(backWallGeometry, this.materials.walls);
    backWall.position.z = -depth / 2;
    this.structure.add(backWall);
    walls.push(backWall);

    // Side walls
    const sideWallGeometry = new THREE.BoxGeometry(wallThickness, height, depth);
    
    const leftWall = new THREE.Mesh(sideWallGeometry, this.materials.walls);
    leftWall.position.x = -width / 2;
    this.structure.add(leftWall);
    walls.push(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeometry, this.materials.walls);
    rightWall.position.x = width / 2;
    this.structure.add(rightWall);
    walls.push(rightWall);
  }

  createRooms() {
    const { width, height, depth, wallThickness } = this.options;
    
    // Create central command room
    this.createCommandRoom();
    
    // Create side rooms
    this.createSideRooms();
  }

  createCommandRoom() {
    const { width, height, depth, wallThickness } = this.options;
    
    // Central command room dimensions
    const roomWidth = width * 0.5;
    const roomDepth = depth * 0.4;
    const roomHeight = height;
    
    // Create glass walls for command room
    const glassWallGeometry = new THREE.BoxGeometry(wallThickness, roomHeight, roomDepth);
    
    // Left glass wall
    const leftGlass = new THREE.Mesh(glassWallGeometry, this.materials.glass);
    leftGlass.position.set(-roomWidth/2, height/2, -depth * 0.1);
    this.structure.add(leftGlass);
    
    // Right glass wall
    const rightGlass = new THREE.Mesh(glassWallGeometry, this.materials.glass);
    rightGlass.position.set(roomWidth/2, height/2, -depth * 0.1);
    this.structure.add(rightGlass);
    
    // Back glass wall
    const backGlassGeometry = new THREE.BoxGeometry(roomWidth, roomHeight, wallThickness);
    const backGlass = new THREE.Mesh(backGlassGeometry, this.materials.glass);
    backGlass.position.set(0, height/2, -depth * 0.3);
    this.structure.add(backGlass);
    
    // Add command console
    this.createCommandConsole(new THREE.Vector3(0, 1, -depth * 0.25));
  }

  createSideRooms() {
    const { width, height, depth, wallThickness } = this.options;
    
    // Dimensions for side rooms
    const roomWidth = width * 0.2;
    const roomDepth = depth * 0.3;
    const roomHeight = height * 0.8;
    
    // Create left side rooms
    this.createSideRoom(
      new THREE.Vector3(-width * 0.35, 0, -depth * 0.1),
      roomWidth,
      roomHeight,
      roomDepth,
      'armory'
    );
    
    // Create right side rooms
    this.createSideRoom(
      new THREE.Vector3(width * 0.35, 0, -depth * 0.1),
      roomWidth,
      roomHeight,
      roomDepth,
      'communications'
    );
  }

  createSideRoom(position, width, height, depth, type) {
    const { wallThickness } = this.options;
    
    // Create room structure
    const roomGroup = new THREE.Group();
    
    // Room walls
    const wallGeometry = new THREE.BoxGeometry(wallThickness, height, depth);
    const backWallGeometry = new THREE.BoxGeometry(width, height, wallThickness);
    
    // Side walls
    const leftWall = new THREE.Mesh(wallGeometry, this.materials.walls);
    leftWall.position.set(-width/2, height/2, 0);
    roomGroup.add(leftWall);
    
    const rightWall = new THREE.Mesh(wallGeometry, this.materials.walls);
    rightWall.position.set(width/2, height/2, 0);
    roomGroup.add(rightWall);
    
    // Back wall
    const backWall = new THREE.Mesh(backWallGeometry, this.materials.walls);
    backWall.position.set(0, height/2, -depth/2);
    roomGroup.add(backWall);
    
    // Add room-specific elements
    switch(type) {
      case 'armory':
        this.createArmoryElements(roomGroup, width, height, depth);
        break;
      case 'communications':
        this.createCommunicationsElements(roomGroup, width, height, depth);
        break;
    }
    
    // Position the room
    roomGroup.position.copy(position);
    this.structure.add(roomGroup);
  }

  createCommandConsole(position) {
    // Create console base
    const baseGeometry = new THREE.BoxGeometry(8, 1, 4);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.copy(position);
    
    // Create console screens
    const screenGroup = new THREE.Group();
    const screenGeometry = new THREE.PlaneGeometry(2, 1.5);
    const screenMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.5
    });
    
    // Create three screens at different angles
    for (let i = -1; i <= 1; i++) {
      const screen = new THREE.Mesh(screenGeometry, screenMaterial);
      screen.position.set(i * 2, 2, 0);
      screen.rotation.x = -0.3;
      screen.rotation.y = i * 0.2;
      screenGroup.add(screen);
    }
    
    screenGroup.position.copy(position);
    
    this.structure.add(base);
    this.structure.add(screenGroup);
  }

  createArmoryElements(roomGroup, width, height, depth) {
    // Add weapon racks
    const rackGeometry = new THREE.BoxGeometry(width * 0.8, height * 0.6, 0.3);
    const rackMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.6,
      roughness: 0.4
    });
    
    const rack = new THREE.Mesh(rackGeometry, rackMaterial);
    rack.position.set(0, height * 0.4, -depth * 0.4);
    roomGroup.add(rack);
    
    // Add weapon holders
    const holderCount = 4;
    const holderGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8);
    const holderMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.7,
      roughness: 0.3
    });
    
    for (let i = 0; i < holderCount; i++) {
      const holder = new THREE.Mesh(holderGeometry, holderMaterial);
      holder.rotation.x = Math.PI / 2;
      holder.position.set(
        (i - holderCount/2 + 0.5) * 0.8,
        height * 0.4,
        -depth * 0.38
      );
      roomGroup.add(holder);
    }
  }

  createCommunicationsElements(roomGroup, width, height, depth) {
    // Add communication console
    const consoleGeometry = new THREE.BoxGeometry(width * 0.8, height * 0.3, depth * 0.2);
    const consoleMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2
    });
    
    const console = new THREE.Mesh(consoleGeometry, consoleMaterial);
    console.position.set(0, height * 0.2, -depth * 0.4);
    roomGroup.add(console);
    
    // Add screens
    const screenGeometry = new THREE.PlaneGeometry(width * 0.7, height * 0.4);
    const screenMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.5
    });
    
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(0, height * 0.6, -depth * 0.45);
    roomGroup.add(screen);
    
    // Add antenna
    const antennaGeometry = new THREE.CylinderGeometry(0.05, 0.05, height * 0.3, 8);
    const antennaMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.7,
      roughness: 0.3
    });
    
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(0, height * 0.9, -depth * 0.4);
    roomGroup.add(antenna);
  }

  createLighting() {
    const { width, height, depth, lightIntensity, lightColor } = this.options;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(lightColor, 0.5);
    this.lights.add(ambientLight);

    // Add rect area lights for ceiling panels
    const panelWidth = 10;
    const panelDepth = 10;
    const rows = 3;
    const cols = 3;
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const light = new RectAreaLight(
          lightColor,
          lightIntensity,
          panelWidth,
          panelDepth
        );

        const x = (i - 1) * (width / 3);
        const y = height - 0.5;
        const z = (j - 1) * (depth / 3);

        light.position.set(x, y, z);
        light.rotation.x = -Math.PI / 2;
        
        this.lights.add(light);
      }
    }
  }

  createInteractives() {
    // Create computer terminals
    const terminal1 = new InteractiveObject({
      type: 'terminal',
      position: new THREE.Vector3(-15, 3, -20),
      rotation: new THREE.Euler(0, Math.PI / 4, 0),
      onInteract: () => this.handleTerminalInteraction(1)
    });

    const terminal2 = new InteractiveObject({
      type: 'terminal',
      position: new THREE.Vector3(15, 3, -20),
      rotation: new THREE.Euler(0, -Math.PI / 4, 0),
      onInteract: () => this.handleTerminalInteraction(2)
    });

    this.interactives.add(terminal1.mesh);
    this.interactives.add(terminal2.mesh);
  }

  createEffects() {
    // Add holographic displays
    this.createHolographicDisplay(new THREE.Vector3(0, 10, 0));
    
    // Add emergency lights
    this.createEmergencyLights();
    
    // Add particle systems for ambient effects
    this.createAmbientParticles();
  }

  createHolographicDisplay(position) {
    const geometry = new THREE.CylinderGeometry(3, 3, 8, 32, 1, true);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x00ff88) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying vec2 vUv;
        void main() {
          float opacity = 0.5 + 0.3 * sin(vUv.y * 10.0 + time);
          gl_FragColor = vec4(color, opacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });

    const hologram = new THREE.Mesh(geometry, material);
    hologram.position.copy(position);
    this.effects.add(hologram);
  }

  createEmergencyLights() {
    const light1 = new THREE.PointLight(0xff0000, 0.5, 20);
    light1.position.set(-20, 15, 0);
    this.effects.add(light1);

    const light2 = new THREE.PointLight(0xff0000, 0.5, 20);
    light2.position.set(20, 15, 0);
    this.effects.add(light2);
  }

  createAmbientParticles() {
    const particleCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * this.options.width;
      positions[i + 1] = Math.random() * this.options.height;
      positions[i + 2] = (Math.random() - 0.5) * this.options.depth;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x0088ff,
      size: 0.1,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    this.effects.add(particles);
  }

  addPhysicsBodies() {
    // Add physics bodies for floor, ceiling, and walls
    // Implementation will use Cannon.js to add collision bodies
    // This will be implemented when physics system is ready
  }

  handleTerminalInteraction(terminalId) {
    // Handle terminal interaction logic
    console.log(`Terminal ${terminalId} activated`);
  }

  update(deltaTime) {
    // Update hologram effects
    this.effects.children.forEach(effect => {
      if (effect.material && effect.material.uniforms) {
        effect.material.uniforms.time.value += deltaTime;
      }
    });

    // Update emergency lights
    this.updateEmergencyLights(deltaTime);
  }

  updateEmergencyLights(deltaTime) {
    this.effects.children.forEach(light => {
      if (light instanceof THREE.PointLight) {
        light.intensity = 0.5 + 0.3 * Math.sin(Date.now() * 0.003);
      }
    });
  }

  dispose() {
    // Clean up geometries, materials, and remove from scene
    this.structure.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        object.material.dispose();
      }
    });

    this.scene.remove(this.structure);
    this.scene.remove(this.lights);
    this.scene.remove(this.interactives);
    this.scene.remove(this.effects);
  }
} 
