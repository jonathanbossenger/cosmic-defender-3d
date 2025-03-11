import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Arena {
  constructor(scene, loadingManager, physics) {
    this.scene = scene;
    this.loadingManager = loadingManager;
    this.physics = physics;
    
    // Arena properties
    this.radius = 15; // Arena radius in meters
    this.platformHeight = 0.5; // Height of the platform
    
    // Create arena elements
    this.createPlatform();
    this.createBoundary();
    this.createCoverElements();
    this.createEnvironment();
  }
  
  createPlatform() {
    // Create central platform
    const platformGeometry = new THREE.CylinderGeometry(this.radius, this.radius, this.platformHeight, 32);
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.7,
      metalness: 0.2,
    });
    
    this.platform = new THREE.Mesh(platformGeometry, platformMaterial);
    this.platform.position.y = -this.platformHeight / 2;
    this.platform.receiveShadow = true;
    this.scene.add(this.platform);
    
    // Add platform physics
    const platformShape = new CANNON.Cylinder(
      this.radius,
      this.radius,
      this.platformHeight,
      32
    );
    
    const platformBody = new CANNON.Body({
      mass: 0, // Static body
      shape: platformShape,
      position: new CANNON.Vec3(0, -this.platformHeight / 2, 0),
    });
    
    this.physics.addBody(platformBody);
  }
  
  createBoundary() {
    // Create boundary markers
    const boundaryGeometry = new THREE.TorusGeometry(this.radius, 0.2, 16, 100);
    const boundaryMaterial = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      roughness: 0.3,
      metalness: 0.7,
      emissive: 0x0044ff,
      emissiveIntensity: 0.5,
    });
    
    this.boundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
    this.boundary.rotation.x = Math.PI / 2;
    this.boundary.position.y = 0.1;
    this.scene.add(this.boundary);
    
    // Add shield effect
    const shieldGeometry = new THREE.CylinderGeometry(this.radius, this.radius, 20, 32, 1, true);
    const shieldMaterial = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
    });
    
    this.shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    this.shield.position.y = 10;
    this.scene.add(this.shield);
  }
  
  createCoverElements() {
    // Create defensive positions around the arena
    const coverPositions = [];
    const coverCount = 8;
    
    for (let i = 0; i < coverCount; i++) {
      const angle = (i / coverCount) * Math.PI * 2;
      const x = Math.cos(angle) * (this.radius * 0.7);
      const z = Math.sin(angle) * (this.radius * 0.7);
      
      coverPositions.push(new THREE.Vector3(x, 0, z));
    }
    
    // Create cover elements
    coverPositions.forEach((position, index) => {
      // Alternate between different cover types
      if (index % 2 === 0) {
        this.createBarrier(position);
      } else {
        this.createShieldStation(position);
      }
    });
  }
  
  createBarrier(position) {
    // Create a defensive barrier
    const barrierWidth = 2;
    const barrierHeight = 1.5;
    const barrierDepth = 0.3;
    
    const barrierGeometry = new THREE.BoxGeometry(barrierWidth, barrierHeight, barrierDepth);
    const barrierMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.5,
      metalness: 0.5,
    });
    
    const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
    barrier.position.copy(position);
    barrier.position.y = barrierHeight / 2;
    
    // Rotate to face center
    barrier.lookAt(new THREE.Vector3(0, barrier.position.y, 0));
    barrier.rotateY(Math.PI); // Rotate 180 degrees to face outward
    
    barrier.castShadow = true;
    barrier.receiveShadow = true;
    this.scene.add(barrier);
    
    // Add physics body
    const barrierShape = new CANNON.Box(new CANNON.Vec3(barrierWidth / 2, barrierHeight / 2, barrierDepth / 2));
    const barrierBody = new CANNON.Body({
      mass: 0, // Static body
      shape: barrierShape,
      position: new CANNON.Vec3(position.x, barrierHeight / 2, position.z),
    });
    
    // Set quaternion to match mesh rotation
    barrierBody.quaternion.copy(barrier.quaternion);
    
    this.physics.addBody(barrierBody);
    this.physics.addObjectToUpdate(barrier, barrierBody);
  }
  
  createShieldStation(position) {
    // Create a shield recharge station
    const baseRadius = 0.5;
    const baseHeight = 0.2;
    const pillarRadius = 0.2;
    const pillarHeight = 1.2;
    const topRadius = 0.7;
    const topHeight = 0.3;
    
    // Create base
    const baseGeometry = new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.7,
      metalness: 0.3,
    });
    
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.copy(position);
    base.position.y = baseHeight / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    this.scene.add(base);
    
    // Create pillar
    const pillarGeometry = new THREE.CylinderGeometry(pillarRadius, pillarRadius, pillarHeight, 16);
    const pillarMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.5,
      metalness: 0.5,
    });
    
    const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    pillar.position.copy(position);
    pillar.position.y = baseHeight + pillarHeight / 2;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    this.scene.add(pillar);
    
    // Create top
    const topGeometry = new THREE.CylinderGeometry(topRadius, topRadius, topHeight, 16);
    const topMaterial = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      roughness: 0.3,
      metalness: 0.8,
      emissive: 0x0044ff,
      emissiveIntensity: 0.5,
    });
    
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.copy(position);
    top.position.y = baseHeight + pillarHeight + topHeight / 2;
    top.castShadow = true;
    top.receiveShadow = true;
    this.scene.add(top);
    
    // Add physics body for the entire station
    const stationShape = new CANNON.Cylinder(topRadius, baseRadius, baseHeight + pillarHeight + topHeight, 16);
    const stationBody = new CANNON.Body({
      mass: 0, // Static body
      shape: stationShape,
      position: new CANNON.Vec3(position.x, (baseHeight + pillarHeight + topHeight) / 2, position.z),
    });
    
    this.physics.addBody(stationBody);
  }
  
  createEnvironment() {
    // Add environmental features around the arena
    this.createHazardZones();
    this.createVisualEffects();
    this.createAmbientElements();
  }
  
  createHazardZones() {
    // Create hazard zones around the arena
    const hazardCount = 4;
    
    for (let i = 0; i < hazardCount; i++) {
      const angle = (i / hazardCount) * Math.PI * 2;
      const distance = this.radius + 5;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      
      // Create hazard visual
      const hazardGeometry = new THREE.CylinderGeometry(2, 2, 0.1, 16);
      const hazardMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        roughness: 0.3,
        metalness: 0.5,
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.7,
      });
      
      const hazard = new THREE.Mesh(hazardGeometry, hazardMaterial);
      hazard.position.set(x, 0.05, z);
      hazard.receiveShadow = true;
      this.scene.add(hazard);
    }
  }
  
  createVisualEffects() {
    // Add visual effects around the arena
    
    // Create light beams at the arena edge
    const beamCount = 16;
    
    for (let i = 0; i < beamCount; i++) {
      const angle = (i / beamCount) * Math.PI * 2;
      const x = Math.cos(angle) * this.radius;
      const z = Math.sin(angle) * this.radius;
      
      // Create beam
      const beamGeometry = new THREE.CylinderGeometry(0.05, 0.05, 10, 8);
      const beamMaterial = new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.3,
      });
      
      const beam = new THREE.Mesh(beamGeometry, beamMaterial);
      beam.position.set(x, 5, z);
      this.scene.add(beam);
    }
  }
  
  createAmbientElements() {
    // Add ambient elements for visual interest
    
    // Create floating particles
    const particleCount = 100;
    const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.7,
    });
    
    this.particles = [];
    
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      
      // Random position within a cylinder above the arena
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * this.radius;
      const height = Math.random() * 10 + 1;
      
      particle.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );
      
      // Store initial position and random movement parameters
      particle.userData = {
        initialY: height,
        speed: Math.random() * 0.5 + 0.5,
        amplitude: Math.random() * 0.5 + 0.2,
      };
      
      this.scene.add(particle);
      this.particles.push(particle);
    }
  }
  
  update(deltaTime) {
    // Update animated elements
    
    // Rotate boundary
    this.boundary.rotation.z += deltaTime * 0.2;
    
    // Pulse shield opacity
    const pulseSpeed = 0.5;
    this.shield.material.opacity = 0.1 + Math.sin(Date.now() * 0.001 * pulseSpeed) * 0.05;
    
    // Animate particles
    this.particles.forEach(particle => {
      const { initialY, speed, amplitude } = particle.userData;
      particle.position.y = initialY + Math.sin(Date.now() * 0.001 * speed) * amplitude;
    });
  }
}
