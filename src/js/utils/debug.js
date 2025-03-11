import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Stats from 'stats.js';
import { Pane } from 'tweakpane';

export class Debug {
  constructor(scene, renderer, camera, physics) {
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;
    this.physics = physics;
    
    // Debug state
    this.enabled = import.meta.env.DEV || window.location.hash === '#debug';
    this.physicsDebugEnabled = false;
    this.statsEnabled = false;
    this.guiEnabled = false;
    
    // Debug objects
    this.stats = null;
    this.gui = null;
    this.physicsDebugger = null;
    
    // Initialize if enabled
    if (this.enabled) {
      this.initialize();
    }
  }
  
  initialize() {
    // Create stats panel
    this.initStats();
    
    // Create GUI panel
    this.initGUI();
    
    // Create physics debugger
    this.initPhysicsDebugger();
    
    // Add keyboard shortcuts
    this.initKeyboardShortcuts();
    
    console.log('Debug mode enabled');
  }
  
  initStats() {
    // Create stats panel
    this.stats = new Stats();
    this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3: custom
    
    // Position the panel
    this.stats.dom.style.position = 'absolute';
    this.stats.dom.style.top = '0px';
    this.stats.dom.style.left = '0px';
    
    // Add to document
    document.body.appendChild(this.stats.dom);
    
    // Enable stats
    this.statsEnabled = true;
    this.stats.dom.style.display = 'block';
  }
  
  initGUI() {
    // Create GUI panel
    this.gui = new Pane({
      title: 'Debug Controls',
      expanded: true,
    });
    
    // Add sections
    this.addRendererControls();
    this.addPhysicsControls();
    this.addCameraControls();
    
    // Enable GUI
    this.guiEnabled = true;
    this.gui.element.style.display = 'block';
  }
  
  addRendererControls() {
    // Create renderer folder
    const rendererFolder = this.gui.addFolder({
      title: 'Renderer',
      expanded: false,
    });
    
    // Add renderer controls
    const rendererParams = {
      shadowMapEnabled: this.renderer.shadowMap.enabled
    };
    
    rendererFolder.addBinding(rendererParams, 'shadowMapEnabled', {
      label: 'Shadow Map'
    }).on('change', (event) => {
      this.renderer.shadowMap.enabled = event.value;
      this.renderer.shadowMap.needsUpdate = true;
    });
    
    // Add clear color control
    // Ensure renderer has a clear color set
    if (!this.renderer._clearColor) {
      this.renderer.setClearColor(0x000000);
    }
    
    const clearColor = {
      color: '#' + this.renderer.getClearColor(new THREE.Color()).getHexString(),
    };
    
    rendererFolder.addBinding(clearColor, 'color', {
      label: 'Clear Color',
    }).on('change', (event) => {
      this.renderer.setClearColor(event.value);
    });
  }
  
  addPhysicsControls() {
    // Create physics folder
    const physicsFolder = this.gui.addFolder({
      title: 'Physics',
      expanded: false,
    });
    
    // Add physics controls
    const physicsParams = {
      gravity: -9.82,
      debugDraw: this.physicsDebugEnabled,
    };
    
    physicsFolder.addBinding(physicsParams, 'gravity', {
      min: -20,
      max: 0,
      step: 0.1,
    }).on('change', (event) => {
      this.physics.world.gravity.y = event.value;
    });
    
    physicsFolder.addBinding(physicsParams, 'debugDraw').on('change', (event) => {
      this.togglePhysicsDebugger(event.value);
    });
  }
  
  addCameraControls() {
    // Create camera folder
    const cameraFolder = this.gui.addFolder({
      title: 'Camera',
      expanded: false,
    });
    
    // Add camera position controls
    cameraFolder.addBinding(this.camera.position, 'x', {
      min: -50,
      max: 50,
      step: 0.1,
    });
    
    cameraFolder.addBinding(this.camera.position, 'y', {
      min: -50,
      max: 50,
      step: 0.1,
    });
    
    cameraFolder.addBinding(this.camera.position, 'z', {
      min: -50,
      max: 50,
      step: 0.1,
    });
    
    // Add camera FOV control
    cameraFolder.addBinding(this.camera, 'fov', {
      min: 30,
      max: 120,
      step: 1,
    }).on('change', () => {
      this.camera.updateProjectionMatrix();
    });
  }
  
  initPhysicsDebugger() {
    // Create physics debugger
    this.physicsDebugger = new THREE.Group();
    this.scene.add(this.physicsDebugger);
    
    // Create meshes for physics bodies
    this.bodyMeshes = new Map();
    
    // Disable by default
    this.physicsDebugger.visible = false;
  }
  
  initKeyboardShortcuts() {
    // Add keyboard shortcuts
    window.addEventListener('keydown', (event) => {
      // Only in debug mode
      if (!this.enabled) return;
      
      switch (event.code) {
        case 'KeyP': // Toggle physics debugger
          if (event.ctrlKey || event.metaKey) {
            this.togglePhysicsDebugger(!this.physicsDebugEnabled);
            event.preventDefault();
          }
          break;
          
        case 'KeyS': // Toggle stats
          if (event.ctrlKey || event.metaKey) {
            this.toggleStats(!this.statsEnabled);
            event.preventDefault();
          }
          break;
          
        case 'KeyG': // Toggle GUI
          if (event.ctrlKey || event.metaKey) {
            this.toggleGUI(!this.guiEnabled);
            event.preventDefault();
          }
          break;
      }
    });
  }
  
  togglePhysicsDebugger(enabled) {
    this.physicsDebugEnabled = enabled;
    this.physicsDebugger.visible = enabled;
    
    if (enabled) {
      console.log('Physics debug enabled');
    } else {
      console.log('Physics debug disabled');
    }
  }
  
  toggleStats(enabled) {
    this.statsEnabled = enabled;
    this.stats.dom.style.display = enabled ? 'block' : 'none';
    
    if (enabled) {
      console.log('Stats enabled');
    } else {
      console.log('Stats disabled');
    }
  }
  
  toggleGUI(enabled) {
    this.guiEnabled = enabled;
    this.gui.element.style.display = enabled ? 'block' : 'none';
    
    if (enabled) {
      console.log('GUI enabled');
    } else {
      console.log('GUI disabled');
    }
  }
  
  update() {
    // Skip if debug is disabled
    if (!this.enabled) return;
    
    // Update stats
    if (this.statsEnabled) {
      this.stats.begin();
    }
    
    // Update physics debugger
    if (this.physicsDebugEnabled) {
      this.updatePhysicsDebugger();
    }
  }
  
  updatePhysicsDebugger() {
    // Clear old meshes
    this.physicsDebugger.children.forEach(child => {
      this.physicsDebugger.remove(child);
    });
    
    // Create meshes for each physics body
    this.physics.world.bodies.forEach(body => {
      if (body.shapes.length === 0) return;
      
      body.shapes.forEach((shape, shapeIndex) => {
        let mesh = this.bodyMeshes.get(body.id + '_' + shapeIndex);
        
        // Create mesh if it doesn't exist
        if (!mesh) {
          const geometry = this.createGeometryFromShape(shape);
          const material = new THREE.MeshBasicMaterial({
            color: body.mass === 0 ? 0x00ff00 : 0xff0000,
            wireframe: true,
            opacity: 0.5,
            transparent: true,
          });
          
          mesh = new THREE.Mesh(geometry, material);
          this.bodyMeshes.set(body.id + '_' + shapeIndex, mesh);
        }
        
        // Update mesh position and rotation
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
        
        // Add to debugger
        this.physicsDebugger.add(mesh);
      });
    });
  }
  
  createGeometryFromShape(shape) {
    switch (shape.type) {
      case CANNON.Shape.types.SPHERE:
        return new THREE.SphereGeometry(shape.radius, 16, 16);
        
      case CANNON.Shape.types.BOX:
        return new THREE.BoxGeometry(
          shape.halfExtents.x * 2,
          shape.halfExtents.y * 2,
          shape.halfExtents.z * 2
        );
        
      case CANNON.Shape.types.PLANE:
        return new THREE.PlaneGeometry(10, 10);
        
      case CANNON.Shape.types.CYLINDER:
        return new THREE.CylinderGeometry(
          shape.radiusTop,
          shape.radiusBottom,
          shape.height,
          shape.numSegments
        );
        
      default:
        return new THREE.SphereGeometry(0.1, 8, 8); // Fallback
    }
  }
  
  endFrame() {
    // End stats frame
    if (this.enabled && this.statsEnabled) {
      this.stats.end();
    }
  }
}
