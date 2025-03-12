import * as THREE from 'three';

export class InteractiveObject {
  constructor(options = {}) {
    this.options = Object.assign({
      type: 'default',
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      scale: new THREE.Vector3(1, 1, 1),
      onInteract: () => {},
      interactionDistance: 3,
    }, options);

    this.mesh = this.createMesh();
    this.setupInteractive();
  }

  createMesh() {
    let geometry, material;

    switch (this.options.type) {
      case 'terminal':
        // Create a computer terminal mesh
        geometry = new THREE.BoxGeometry(2, 3, 0.5);
        material = new THREE.MeshStandardMaterial({
          color: 0x333333,
          metalness: 0.8,
          roughness: 0.2
        });
        
        // Create the terminal group
        const group = new THREE.Group();
        
        // Main terminal body
        const body = new THREE.Mesh(geometry, material);
        group.add(body);
        
        // Screen
        const screenGeometry = new THREE.PlaneGeometry(1.8, 2);
        const screenMaterial = new THREE.MeshPhongMaterial({
          color: 0x00ff88,
          emissive: 0x00ff88,
          emissiveIntensity: 0.5
        });
        const screen = new THREE.Mesh(screenGeometry, screenMaterial);
        screen.position.z = 0.26;
        group.add(screen);
        
        // Add keyboard/control panel
        const panelGeometry = new THREE.BoxGeometry(1.5, 0.1, 0.3);
        const panelMaterial = new THREE.MeshStandardMaterial({
          color: 0x666666,
          metalness: 0.5,
          roughness: 0.5
        });
        const panel = new THREE.Mesh(panelGeometry, panelMaterial);
        panel.position.y = -1.2;
        panel.position.z = 0.1;
        panel.rotation.x = -0.3;
        group.add(panel);
        
        // Position and rotate the group
        group.position.copy(this.options.position);
        group.rotation.copy(this.options.rotation);
        group.scale.copy(this.options.scale);
        
        return group;

      default:
        // Default interactive object is a simple box
        geometry = new THREE.BoxGeometry(1, 1, 1);
        material = new THREE.MeshStandardMaterial({
          color: 0x00ff00
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(this.options.position);
        mesh.rotation.copy(this.options.rotation);
        mesh.scale.copy(this.options.scale);
        return mesh;
    }
  }

  setupInteractive() {
    this.mesh.userData.interactive = true;
    this.mesh.userData.interactionDistance = this.options.interactionDistance;
    this.mesh.userData.onInteract = this.options.onInteract;
  }

  update(deltaTime) {
    // Add any animation or update logic here
    if (this.options.type === 'terminal') {
      // Add screen flicker effect
      const screen = this.mesh.children[1];
      if (screen && screen.material) {
        screen.material.emissiveIntensity = 0.5 + 0.1 * Math.sin(Date.now() * 0.005);
      }
    }
  }

  dispose() {
    this.mesh.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        object.material.dispose();
      }
    });
  }
} 
