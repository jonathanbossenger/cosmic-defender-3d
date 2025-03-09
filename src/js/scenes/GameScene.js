import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { Water } from 'three/examples/jsm/objects/Water.js';

export class GameScene {
  constructor(camera, loadingManager) {
    this.camera = camera;
    this.loadingManager = loadingManager;
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.01);
    
    // Add lights
    this.setupLights();
    
    // Add environment
    this.setupEnvironment();
    
    // Add objects
    this.setupObjects();
  }
  
  setupLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    this.scene.add(ambientLight);
    
    // Directional light (sun)
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
    this.sunLight.position.set(10, 20, 10);
    this.sunLight.castShadow = true;
    
    // Configure shadow properties
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 50;
    this.sunLight.shadow.camera.left = -20;
    this.sunLight.shadow.camera.right = 20;
    this.sunLight.shadow.camera.top = 20;
    this.sunLight.shadow.camera.bottom = -20;
    
    this.scene.add(this.sunLight);
    
    // Helper for debugging
    // const helper = new THREE.CameraHelper(this.sunLight.shadow.camera);
    // this.scene.add(helper);
  }
  
  setupEnvironment() {
    // Sky
    this.sky = new Sky();
    this.sky.scale.setScalar(1000);
    this.scene.add(this.sky);
    
    const skyUniforms = this.sky.material.uniforms;
    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;
    
    // Sun position
    const phi = THREE.MathUtils.degToRad(90 - 45); // Sun elevation
    const theta = THREE.MathUtils.degToRad(180); // Sun azimuth
    
    const sunPosition = new THREE.Vector3();
    sunPosition.setFromSphericalCoords(1, phi, theta);
    
    skyUniforms['sunPosition'].value.copy(sunPosition);
    
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100, 32, 32);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.8,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    
    // Water
    const waterGeometry = new THREE.PlaneGeometry(100, 100);
    
    // Use the TextureLoader from our custom LoadingManager
    const textureLoader = this.loadingManager.createTextureLoader();
    const waterNormals = textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg',
      function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }
    );
    
    this.water = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: waterNormals,
      sunDirection: new THREE.Vector3(sunPosition.x, sunPosition.y, sunPosition.z),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: this.scene.fog !== undefined,
    });
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = -5;
    this.scene.add(this.water);
  }
  
  setupObjects() {
    // Create some boxes for the environment
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const boxMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.5,
      metalness: 0.5,
    });
    
    // Create a grid of boxes
    for (let i = -5; i <= 5; i += 2) {
      for (let j = -5; j <= 5; j += 2) {
        if (i === 0 && j === 0) continue; // Skip center
        
        const height = Math.random() * 3 + 0.5;
        const box = new THREE.Mesh(
          boxGeometry,
          boxMaterial.clone()
        );
        box.position.set(i * 2, height / 2, j * 2);
        box.scale.set(1, height, 1);
        box.castShadow = true;
        box.receiveShadow = true;
        
        // Randomize color
        box.material.color.setHSL(Math.random(), 0.7, 0.5);
        
        this.scene.add(box);
      }
    }
    
    // Add a target sphere
    const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      roughness: 0.3,
      metalness: 0.7,
    });
    this.targetSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.targetSphere.position.set(0, 1, -10);
    this.targetSphere.castShadow = true;
    this.scene.add(this.targetSphere);
  }
  
  update(deltaTime) {
    // Update water
    this.water.material.uniforms['time'].value += deltaTime;
    
    // Animate target sphere
    this.targetSphere.position.y = 1 + Math.sin(Date.now() * 0.001) * 0.5;
    this.targetSphere.rotation.y += deltaTime;
  }
} 
