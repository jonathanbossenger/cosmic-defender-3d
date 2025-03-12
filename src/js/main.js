import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LoadingManager } from './utils/LoadingManager.js';
import { GameScene } from './scenes/GameScene.js';
import { PhysicsWorld } from './physics/world.js';
import { Collisions } from './physics/collisions.js';
import { Player } from './components/player/Player.js';
import { Debug } from './utils/debug.js';
import Stats from 'stats.js';
import { Pane } from 'tweakpane';
import { Game } from './Game.js';

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const loadingScreen = document.getElementById('loading-screen');
  const loadingBarFill = document.getElementById('loading-bar-fill');
  
  // Create loading manager
  const loadingManager = new LoadingManager();
  
  // Set up loading manager callbacks
  loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    const progress = (itemsLoaded / itemsTotal) * 100;
    loadingBarFill.style.width = `${progress}%`;
    console.log(`Loading progress: ${progress}%`);
  };
  
  loadingManager.onLoad = () => {
    console.log('All assets loaded');
    loadingScreen.style.display = 'none';
    
    // Create game instance after loading is complete
    const game = new Game(document.body, loadingManager);
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        game.stop();
      } else {
        game.start();
      }
    });
    
    // Handle cleanup on window unload
    window.addEventListener('unload', () => {
      game.dispose();
    });
  };
  
  // Start loading process
  loadingManager.startLoading();
}); 
