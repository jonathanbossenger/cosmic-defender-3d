import * as THREE from 'three';
import { RectAreaLight } from 'three/examples/jsm/lights/RectAreaLight.js';
import { InteractiveObject } from '../../components/InteractiveObject.js';

export class AlienHive {
  constructor(scene, physics, options = {}) {
    this.scene = scene;
    this.physics = physics;
    this.options = Object.assign({
      width: 100,
      height: 30,
      depth: 100,
      platformRadius: 40,
      tentacleCount: 12,
      podCount: 8,
      lightIntensity: 1.5,
      pulseSpeed: 0.5,
    }, options);

    // Store scene elements
    this.structure = new THREE.Group();
    this.lights = new THREE.Group();
    this.organics = new THREE.Group();
    this.effects = new THREE.Group();
    this.ambient = new THREE.Group();

    // Materials
    this.materials = {
      flesh: new THREE.MeshStandardMaterial({
        color: 0x4a1f1f,
        roughness: 0.7,
        metalness: 0.2,
        side: THREE.DoubleSide,
      }),
      membrane: new THREE.MeshPhysicalMaterial({
        color: 0x2a0f0f,
        transmission: 0.5,
        opacity: 0.7,
        metalness: 0.2,
        roughness: 0.3,
        ior: 1.2,
        thickness: 0.5,
        transparent: true,
        side: THREE.DoubleSide,
      }),
      organic: new THREE.MeshStandardMaterial({
        color: 0x3a1515,
        roughness: 0.8,
        metalness: 0.1,
      }),
      bioluminescent: new THREE.MeshPhongMaterial({
        color: 0x00ff88,
        emissive: 0x00aa66,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8,
      })
    };

    // Dynamic elements
    this.tentacles = [];
    this.pods = [];
    this.spores = [];
    this.pulseTime = 0;

    this.init();
  }

  init() {
    this.createStructure();
    this.createOrganics();
    this.createLighting();
    this.createEffects();
    this.createAmbient();
    
    // Add all groups to scene
    this.scene.add(this.structure);
    this.scene.add(this.organics);
    this.scene.add(this.lights);
    this.scene.add(this.effects);
    this.scene.add(this.ambient);
  }

  createStructure() {
    const { platformRadius, height } = this.options;

    // Create organic platform base
    const platformGeometry = new THREE.CylinderGeometry(platformRadius, platformRadius * 1.2, height * 0.2, 32, 4);
    this.deformGeometry(platformGeometry, 0.2);
    const platform = new THREE.Mesh(platformGeometry, this.materials.flesh);
    platform.position.y = -height * 0.1;
    this.structure.add(platform);

    // Create membrane dome
    const domeGeometry = new THREE.SphereGeometry(platformRadius * 1.1, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6);
    this.deformGeometry(domeGeometry, 0.15);
    const dome = new THREE.Mesh(domeGeometry, this.materials.membrane);
    dome.position.y = height * 0.4;
    this.structure.add(dome);

    // Create support tendrils
    this.createTendrils();
  }

  deformGeometry(geometry, intensity) {
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      // Add organic deformation
      const noise = this.organicNoise(x * 0.1, y * 0.1, z * 0.1);
      positions.setX(i, x + normals.getX(i) * noise * intensity);
      positions.setY(i, y + normals.getY(i) * noise * intensity);
      positions.setZ(i, z + normals.getZ(i) * noise * intensity);
    }
    
    geometry.computeVertexNormals();
  }

  organicNoise(x, y, z) {
    // Simplex-like noise function for organic deformation
    return (Math.sin(x) + Math.sin(y * 1.5) + Math.sin(z * 0.8)) * 0.33;
  }

  createTendrils() {
    const { platformRadius, height, tentacleCount } = this.options;
    
    for (let i = 0; i < tentacleCount; i++) {
      const angle = (i / tentacleCount) * Math.PI * 2;
      const radius = platformRadius * 0.9;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const tendril = this.createTendril(height * 0.8);
      tendril.position.set(x, 0, z);
      tendril.rotation.y = angle;
      tendril.rotation.x = Math.random() * 0.3 - 0.15;
      
      this.tentacles.push(tendril);
      this.structure.add(tendril);
    }
  }

  createTendril(height) {
    const segments = 8;
    const tendrilGroup = new THREE.Group();
    
    // Create segments with decreasing size
    for (let i = 0; i < segments; i++) {
      const t = i / (segments - 1);
      const radius = 0.8 * (1 - t * 0.7);
      const segmentHeight = height / segments;
      
      const geometry = new THREE.CylinderGeometry(radius, radius * 1.2, segmentHeight, 8, 1);
      this.deformGeometry(geometry, 0.2);
      const segment = new THREE.Mesh(geometry, this.materials.organic);
      
      segment.position.y = i * segmentHeight;
      tendrilGroup.add(segment);
    }
    
    return tendrilGroup;
  }

  createOrganics() {
    // Create egg pods
    this.createPods();
    
    // Create organic growths
    this.createGrowths();
    
    // Create spore emitters
    this.createSporeEmitters();
  }

  createPods() {
    const { platformRadius, podCount } = this.options;
    
    for (let i = 0; i < podCount; i++) {
      const angle = (i / podCount) * Math.PI * 2;
      const radius = platformRadius * 0.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const pod = this.createPod();
      pod.position.set(x, 0, z);
      pod.rotation.y = Math.random() * Math.PI * 2;
      
      this.pods.push(pod);
      this.organics.add(pod);
    }
  }

  createPod() {
    const podGroup = new THREE.Group();
    
    // Create pod base
    const baseGeometry = new THREE.SphereGeometry(2, 16, 16);
    this.deformGeometry(baseGeometry, 0.2);
    const base = new THREE.Mesh(baseGeometry, this.materials.flesh);
    podGroup.add(base);
    
    // Create translucent membrane
    const membraneGeometry = new THREE.SphereGeometry(2.2, 16, 16);
    this.deformGeometry(membraneGeometry, 0.15);
    const membrane = new THREE.Mesh(membraneGeometry, this.materials.membrane);
    podGroup.add(membrane);
    
    // Add bioluminescent core
    const coreGeometry = new THREE.SphereGeometry(1, 16, 16);
    const core = new THREE.Mesh(coreGeometry, this.materials.bioluminescent);
    podGroup.add(core);
    
    return podGroup;
  }

  createGrowths() {
    const { platformRadius } = this.options;
    const growthCount = 20;
    
    for (let i = 0; i < growthCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * platformRadius * 0.8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const growth = this.createGrowth();
      growth.position.set(x, 0, z);
      growth.rotation.y = Math.random() * Math.PI * 2;
      growth.scale.setScalar(0.5 + Math.random() * 0.5);
      
      this.organics.add(growth);
    }
  }

  createGrowth() {
    const geometry = new THREE.ConeGeometry(1, 2, 8);
    this.deformGeometry(geometry, 0.3);
    const growth = new THREE.Mesh(geometry, this.materials.organic);
    return growth;
  }

  createSporeEmitters() {
    const { platformRadius } = this.options;
    const emitterCount = 6;
    
    for (let i = 0; i < emitterCount; i++) {
      const angle = (i / emitterCount) * Math.PI * 2;
      const radius = platformRadius * 0.6;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const emitter = this.createSporeEmitter();
      emitter.position.set(x, 2, z);
      
      this.organics.add(emitter);
    }
  }

  createSporeEmitter() {
    const emitterGroup = new THREE.Group();
    
    // Create emitter base
    const baseGeometry = new THREE.ConeGeometry(1, 2, 8);
    this.deformGeometry(baseGeometry, 0.2);
    const base = new THREE.Mesh(baseGeometry, this.materials.flesh);
    emitterGroup.add(base);
    
    // Create spore particle system
    const particleCount = 50;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = 0;
      positions[i + 1] = 0;
      positions[i + 2] = 0;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x00ff88,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    
    const particleSystem = new THREE.Points(particles, particleMaterial);
    this.spores.push(particleSystem);
    emitterGroup.add(particleSystem);
    
    return emitterGroup;
  }

  createLighting() {
    const { lightIntensity, platformRadius } = this.options;

    // Add ambient bioluminescence
    const ambientLight = new THREE.AmbientLight(0x001408, 0.2);
    this.lights.add(ambientLight);

    // Add pulsing point lights near pods
    this.pods.forEach(pod => {
      const light = new THREE.PointLight(0x00ff88, lightIntensity, 10);
      light.position.copy(pod.position);
      light.position.y += 2;
      this.lights.add(light);
    });

    // Add organic area lights
    const lightCount = 4;
    for (let i = 0; i < lightCount; i++) {
      const angle = (i / lightCount) * Math.PI * 2;
      const radius = platformRadius * 0.7;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const light = new RectAreaLight(0x00ff88, lightIntensity * 0.5, 5, 5);
      light.position.set(x, 10, z);
      light.lookAt(x, 0, z);
      this.lights.add(light);
    }
  }

  createEffects() {
    // Create organic mist
    this.createMist();
    
    // Create pulsing veins
    this.createVeins();
    
    // Create energy tendrils
    this.createEnergyTendrils();
  }

  createMist() {
    const { platformRadius, height } = this.options;
    const particleCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * platformRadius;
      positions[i] = Math.cos(angle) * radius;
      positions[i + 1] = Math.random() * height * 0.5;
      positions[i + 2] = Math.sin(angle) * radius;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0x00ff88,
      size: 0.2,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });
    
    const mist = new THREE.Points(geometry, material);
    this.effects.add(mist);
  }

  createVeins() {
    const { platformRadius } = this.options;
    const veinCount = 20;
    
    for (let i = 0; i < veinCount; i++) {
      const points = [];
      const segments = 10;
      
      for (let j = 0; j < segments; j++) {
        const angle = (j / segments) * Math.PI * 2;
        const radius = platformRadius * (0.3 + Math.random() * 0.4);
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius,
          j * 0.5,
          Math.sin(angle) * radius
        ));
      }
      
      const curve = new THREE.CatmullRomCurve3(points);
      const geometry = new THREE.TubeGeometry(curve, 20, 0.1, 8, false);
      const vein = new THREE.Mesh(geometry, this.materials.bioluminescent);
      
      this.effects.add(vein);
    }
  }

  createEnergyTendrils() {
    const { platformRadius, height } = this.options;
    const tendrilCount = 8;
    
    for (let i = 0; i < tendrilCount; i++) {
      const angle = (i / tendrilCount) * Math.PI * 2;
      const radius = platformRadius * 0.6;
      
      const points = [];
      const segments = 20;
      
      for (let j = 0; j < segments; j++) {
        const t = j / (segments - 1);
        points.push(new THREE.Vector3(
          Math.cos(angle + t * 2) * radius * (1 - t * 0.5),
          t * height * 0.6,
          Math.sin(angle + t * 2) * radius * (1 - t * 0.5)
        ));
      }
      
      const curve = new THREE.CatmullRomCurve3(points);
      const geometry = new THREE.TubeGeometry(curve, 20, 0.2, 8, false);
      const tendril = new THREE.Mesh(geometry, this.materials.bioluminescent);
      
      this.effects.add(tendril);
    }
  }

  createAmbient() {
    // Create ambient sound sources
    this.createSoundSources();
    
    // Create ambient particles
    this.createAmbientParticles();
    
    // Create organic movement
    this.createOrganicMovement();
  }

  createSoundSources() {
    // This would be connected to the audio system
    // For now, we'll just create visual indicators
    const { platformRadius } = this.options;
    const sourceCount = 6;
    
    for (let i = 0; i < sourceCount; i++) {
      const angle = (i / sourceCount) * Math.PI * 2;
      const radius = platformRadius * 0.4;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const geometry = new THREE.SphereGeometry(0.3, 8, 8);
      const mesh = new THREE.Mesh(geometry, this.materials.bioluminescent);
      mesh.position.set(x, 1, z);
      
      this.ambient.add(mesh);
    }
  }

  createAmbientParticles() {
    const { platformRadius, height } = this.options;
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * platformRadius;
      positions[i] = Math.cos(angle) * radius;
      positions[i + 1] = Math.random() * height;
      positions[i + 2] = Math.sin(angle) * radius;
      
      velocities[i] = (Math.random() - 0.5) * 0.02;
      velocities[i + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i + 2] = (Math.random() - 0.5) * 0.02;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0x00ff88,
      size: 0.1,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    
    const particles = new THREE.Points(geometry, material);
    this.ambient.add(particles);
  }

  createOrganicMovement() {
    // This will be updated in the update loop
    this.organicMovementTime = 0;
  }

  update(deltaTime) {
    this.pulseTime += deltaTime * this.options.pulseSpeed;
    this.organicMovementTime += deltaTime;

    // Update tentacle movement
    this.updateTentacles(deltaTime);

    // Update pod pulsing
    this.updatePods(deltaTime);

    // Update spore systems
    this.updateSpores(deltaTime);

    // Update lighting
    this.updateLights(deltaTime);

    // Update ambient elements
    this.updateAmbient(deltaTime);
  }

  updateTentacles(deltaTime) {
    this.tentacles.forEach((tendril, index) => {
      tendril.children.forEach((segment, segmentIndex) => {
        const t = segmentIndex / tendril.children.length;
        const wave = Math.sin(this.organicMovementTime * 2 + index * 0.5 + t * 4) * 0.1;
        segment.rotation.x = wave;
        segment.rotation.z = wave * 0.5;
      });
    });
  }

  updatePods(deltaTime) {
    this.pods.forEach((pod, index) => {
      const pulse = Math.sin(this.pulseTime + index * 0.5) * 0.2 + 0.8;
      pod.scale.setScalar(pulse);
      
      const core = pod.children[2];
      if (core.material) {
        core.material.emissiveIntensity = pulse * 0.5;
      }
    });
  }

  updateSpores(deltaTime) {
    this.spores.forEach(sporeSystem => {
      const positions = sporeSystem.geometry.attributes.position.array;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += (Math.random() - 0.5) * 0.1;
        positions[i + 1] += Math.random() * 0.1;
        positions[i + 2] += (Math.random() - 0.5) * 0.1;
        
        // Reset particles that move too far
        const distance = Math.sqrt(
          positions[i] * positions[i] +
          positions[i + 1] * positions[i + 1] +
          positions[i + 2] * positions[i + 2]
        );
        
        if (distance > 5) {
          positions[i] = 0;
          positions[i + 1] = 0;
          positions[i + 2] = 0;
        }
      }
      
      sporeSystem.geometry.attributes.position.needsUpdate = true;
    });
  }

  updateLights(deltaTime) {
    this.lights.children.forEach((light, index) => {
      if (light instanceof THREE.PointLight) {
        light.intensity = this.options.lightIntensity * 
          (0.8 + Math.sin(this.pulseTime + index * 0.5) * 0.2);
      }
    });
  }

  updateAmbient(deltaTime) {
    // Update ambient particles
    const particles = this.ambient.children[this.ambient.children.length - 1];
    if (particles instanceof THREE.Points) {
      const positions = particles.geometry.attributes.position.array;
      const velocities = particles.geometry.attributes.velocity.array;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];
        
        // Add some random movement
        velocities[i] += (Math.random() - 0.5) * 0.001;
        velocities[i + 1] += (Math.random() - 0.5) * 0.001;
        velocities[i + 2] += (Math.random() - 0.5) * 0.001;
        
        // Dampen velocities
        velocities[i] *= 0.99;
        velocities[i + 1] *= 0.99;
        velocities[i + 2] *= 0.99;
      }
      
      particles.geometry.attributes.position.needsUpdate = true;
      particles.geometry.attributes.velocity.needsUpdate = true;
    }
  }

  dispose() {
    // Clean up geometries, materials, and remove from scene
    [this.structure, this.organics, this.lights, this.effects, this.ambient].forEach(group => {
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
