import * as THREE from 'three';
import { RectAreaLight } from 'three/examples/jsm/lights/RectAreaLight.js';
import { InteractiveObject } from '../../components/InteractiveObject.js';

export class OrbitalPlatform {
  constructor(scene, physics, options = {}) {
    this.scene = scene;
    this.physics = physics;
    this.options = Object.assign({
      width: 100,
      height: 25,
      depth: 100,
      wallThickness: 1,
      platformRadius: 40,
      lightIntensity: 2,
      lightColor: 0xaaccff,
    }, options);

    // Store scene elements
    this.structure = new THREE.Group();
    this.lights = new THREE.Group();
    this.interactives = new THREE.Group();
    this.effects = new THREE.Group();
    this.spaceEnvironment = new THREE.Group();

    // Materials
    this.materials = {
      platform: new THREE.MeshStandardMaterial({
        color: 0x888899,
        roughness: 0.3,
        metalness: 0.8,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0x88ccff,
        transmission: 0.9,
        opacity: 0.3,
        metalness: 0.2,
        roughness: 0.1,
        ior: 1.5,
        thickness: 0.5,
        transparent: true,
      }),
      metal: new THREE.MeshStandardMaterial({
        color: 0x444466,
        roughness: 0.2,
        metalness: 0.9,
      }),
      energy: new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        emissive: 0x00aaff,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8,
      })
    };

    this.init();
  }

  init() {
    this.createSpaceEnvironment();
    this.createStructure();
    this.createLighting();
    this.createInteractives();
    this.createEffects();
    
    // Add all groups to scene
    this.scene.add(this.spaceEnvironment);
    this.scene.add(this.structure);
    this.scene.add(this.lights);
    this.scene.add(this.interactives);
    this.scene.add(this.effects);
  }

  createSpaceEnvironment() {
    // Create starfield
    this.createStarfield();
    
    // Create distant planets
    this.createPlanets();
    
    // Create space debris
    this.createSpaceDebris();
    
    // Create nebula effect
    this.createNebula();
  }

  createStarfield() {
    const starCount = 10000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      // Position stars in a large sphere around the platform
      const radius = 1000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      // Random star colors
      const color = new THREE.Color();
      color.setHSL(Math.random(), 0.5, 0.8);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      // Random star sizes
      sizes[i] = Math.random() * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pixelRatio: { value: window.devicePixelRatio }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          if (length(gl_PointCoord - vec2(0.5)) > 0.5) discard;
          gl_FragColor = vec4(vColor, 1.0);
        }
      `,
      vertexColors: true,
      transparent: true
    });

    const stars = new THREE.Points(geometry, material);
    this.spaceEnvironment.add(stars);
  }

  createPlanets() {
    // Create Earth in the background
    const earthGeometry = new THREE.SphereGeometry(50, 32, 32);
    const earthMaterial = new THREE.MeshPhongMaterial({
      color: 0x2233ff,
      emissive: 0x112244,
      specular: 0x222222,
      shininess: 25,
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.position.set(-200, -100, -500);
    this.spaceEnvironment.add(earth);

    // Create atmosphere glow
    const atmosphereGeometry = new THREE.SphereGeometry(52, 32, 32);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x88aaff) }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(color, intensity);
        }
      `,
      transparent: true,
      side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    atmosphere.position.copy(earth.position);
    this.spaceEnvironment.add(atmosphere);
  }

  createSpaceDebris() {
    const debrisCount = 100;
    const debris = new THREE.Group();

    for (let i = 0; i < debrisCount; i++) {
      const size = Math.random() * 2 + 0.5;
      const geometry = new THREE.TetrahedronGeometry(size);
      const material = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.7,
        metalness: 0.3
      });
      
      const piece = new THREE.Mesh(geometry, material);
      
      // Position debris in a ring around the platform
      const radius = 150 + Math.random() * 100;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 100;
      
      piece.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );
      
      piece.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      debris.add(piece);
    }

    this.spaceEnvironment.add(debris);
  }

  createNebula() {
    const textureSize = 256;
    const data = new Uint8Array(textureSize * textureSize * 4);
    
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % textureSize;
      const y = Math.floor((i / 4) / textureSize);
      
      // Create nebula-like patterns using noise
      const value = Math.pow(Math.sin(x / 20) + Math.cos(y / 20), 2) * 0.5;
      
      data[i] = value * 100;     // R
      data[i + 1] = value * 150; // G
      data[i + 2] = value * 255; // B
      data[i + 3] = value * 200; // A
    }
    
    const texture = new THREE.DataTexture(data, textureSize, textureSize, THREE.RGBAFormat);
    texture.needsUpdate = true;
    
    const nebulaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        texture: { value: texture }
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
        uniform sampler2D texture;
        varying vec2 vUv;
        void main() {
          vec2 uv = vUv + vec2(time * 0.01);
          vec4 color = texture2D(texture, uv);
          gl_FragColor = color;
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    const nebulaGeometry = new THREE.PlaneGeometry(1000, 1000);
    const nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
    nebula.position.z = -800;
    nebula.rotation.z = Math.PI / 4;
    
    this.spaceEnvironment.add(nebula);
  }

  createStructure() {
    const { platformRadius, height, wallThickness } = this.options;

    // Create main platform
    const platformGeometry = new THREE.CylinderGeometry(platformRadius, platformRadius, wallThickness, 32);
    const platform = new THREE.Mesh(platformGeometry, this.materials.platform);
    this.structure.add(platform);

    // Create glass dome
    const domeGeometry = new THREE.SphereGeometry(platformRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeometry, this.materials.glass);
    dome.position.y = height / 2;
    this.structure.add(dome);

    // Create support structures
    this.createSupportStructures();

    // Create docking stations
    this.createDockingStations();

    // Add physics bodies
    this.addPhysicsBodies();
  }

  createSupportStructures() {
    const { platformRadius, height } = this.options;
    
    // Create support pillars
    const pillarCount = 8;
    const pillarRadius = 1;
    const pillarHeight = height * 0.8;
    
    for (let i = 0; i < pillarCount; i++) {
      const angle = (i / pillarCount) * Math.PI * 2;
      const x = Math.cos(angle) * (platformRadius * 0.8);
      const z = Math.sin(angle) * (platformRadius * 0.8);
      
      const pillarGeometry = new THREE.CylinderGeometry(pillarRadius, pillarRadius, pillarHeight, 8);
      const pillar = new THREE.Mesh(pillarGeometry, this.materials.metal);
      pillar.position.set(x, pillarHeight / 2, z);
      
      this.structure.add(pillar);
    }
  }

  createDockingStations() {
    const { platformRadius } = this.options;
    const dockCount = 4;
    
    for (let i = 0; i < dockCount; i++) {
      const angle = (i / dockCount) * Math.PI * 2;
      const x = Math.cos(angle) * platformRadius;
      const z = Math.sin(angle) * platformRadius;
      
      const dock = this.createDockingStation();
      dock.position.set(x, 0, z);
      dock.rotation.y = angle + Math.PI / 2;
      
      this.structure.add(dock);
    }
  }

  createDockingStation() {
    const dockGroup = new THREE.Group();
    
    // Create docking port
    const portGeometry = new THREE.CylinderGeometry(3, 3, 2, 16);
    const port = new THREE.Mesh(portGeometry, this.materials.metal);
    dockGroup.add(port);
    
    // Create energy field
    const fieldGeometry = new THREE.CylinderGeometry(2.8, 2.8, 1.8, 16, 1, true);
    const field = new THREE.Mesh(fieldGeometry, this.materials.energy);
    dockGroup.add(field);
    
    return dockGroup;
  }

  createLighting() {
    const { lightIntensity, lightColor, platformRadius } = this.options;

    // Add space ambient light
    const spaceAmbient = new THREE.AmbientLight(0x111122, 0.2);
    this.lights.add(spaceAmbient);

    // Add sun directional light
    const sunLight = new THREE.DirectionalLight(0xffffaa, 1);
    sunLight.position.set(500, 300, -500);
    this.lights.add(sunLight);

    // Add platform lights
    const lightCount = 6;
    for (let i = 0; i < lightCount; i++) {
      const angle = (i / lightCount) * Math.PI * 2;
      const x = Math.cos(angle) * (platformRadius * 0.7);
      const z = Math.sin(angle) * (platformRadius * 0.7);

      const light = new RectAreaLight(lightColor, lightIntensity, 5, 5);
      light.position.set(x, 15, z);
      light.lookAt(x, 0, z);
      this.lights.add(light);
    }
  }

  createInteractives() {
    // Create control panels
    const panelCount = 4;
    for (let i = 0; i < panelCount; i++) {
      const angle = (i / panelCount) * Math.PI * 2;
      const radius = this.options.platformRadius * 0.6;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const panel = new InteractiveObject({
        type: 'terminal',
        position: new THREE.Vector3(x, 3, z),
        rotation: new THREE.Euler(0, angle + Math.PI, 0),
        onInteract: () => this.handlePanelInteraction(i)
      });

      this.interactives.add(panel.mesh);
    }
  }

  createEffects() {
    // Add shield effect
    this.createShieldEffect();
    
    // Add energy core
    this.createEnergyCore();
    
    // Add warning beacons
    this.createWarningBeacons();
  }

  createShieldEffect() {
    const { platformRadius, height } = this.options;
    
    const shieldGeometry = new THREE.SphereGeometry(platformRadius + 1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const shieldMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x00ffff) }
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying vec3 vPosition;
        void main() {
          float pattern = sin(vPosition.y * 20.0 + time * 2.0) * 0.5 + 0.5;
          float alpha = pattern * 0.3;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });

    const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    shield.position.y = height / 2;
    this.effects.add(shield);
  }

  createEnergyCore() {
    const coreGeometry = new THREE.TorusGeometry(5, 0.5, 16, 100);
    const coreMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x00ffff) }
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
          float pattern = sin(vUv.x * 50.0 + time * 3.0) * 0.5 + 0.5;
          gl_FragColor = vec4(color, pattern);
        }
      `,
      transparent: true
    });

    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.y = 10;
    core.rotation.x = Math.PI / 2;
    this.effects.add(core);
  }

  createWarningBeacons() {
    const { platformRadius } = this.options;
    const beaconCount = 4;
    
    for (let i = 0; i < beaconCount; i++) {
      const angle = (i / beaconCount) * Math.PI * 2;
      const x = Math.cos(angle) * (platformRadius + 2);
      const z = Math.sin(angle) * (platformRadius + 2);
      
      const light = new THREE.PointLight(0xff0000, 1, 10);
      light.position.set(x, 2, z);
      this.effects.add(light);
    }
  }

  handlePanelInteraction(panelId) {
    console.log(`Control panel ${panelId} activated`);
  }

  update(deltaTime) {
    // Update shield effect
    this.effects.children.forEach(effect => {
      if (effect.material && effect.material.uniforms) {
        effect.material.uniforms.time.value += deltaTime;
      }
    });

    // Update space environment
    this.updateSpaceEnvironment(deltaTime);

    // Update warning beacons
    this.updateWarningBeacons(deltaTime);
  }

  updateSpaceEnvironment(deltaTime) {
    // Rotate space debris
    const debris = this.spaceEnvironment.children[2];
    if (debris) {
      debris.rotation.y += deltaTime * 0.05;
    }

    // Update nebula effect
    const nebula = this.spaceEnvironment.children[3];
    if (nebula && nebula.material.uniforms) {
      nebula.material.uniforms.time.value += deltaTime;
    }
  }

  updateWarningBeacons(deltaTime) {
    this.effects.children.forEach(light => {
      if (light instanceof THREE.PointLight) {
        light.intensity = 0.5 + 0.5 * Math.sin(Date.now() * 0.005);
      }
    });
  }

  dispose() {
    // Clean up geometries, materials, and remove from scene
    [this.structure, this.lights, this.interactives, this.effects, this.spaceEnvironment].forEach(group => {
      group.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          object.material.dispose();
        }
      });
      this.scene.remove(group);
    });
  }
} 
