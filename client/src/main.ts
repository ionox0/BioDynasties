import { GUI } from 'dat.gui';

import { Entity } from './components//entity';
import { EntityManager } from './entity-manager';

import { UIController } from './ui-controller';
import { NetworkController } from './network-controller';
import { SceneryController } from './scenery-controller';
import { LoadController } from './load-controller';
import { ThreeJSController } from './threejs_component';

import { LevelUpComponentSpawner } from './level-up-component';
import { PlayerSpawner, NetworkEntitySpawner } from './spawners';
import { TerrainChunkManager } from './terrain';
import { spatial_hash_grid } from '../shared/spatial-hash-grid';


class CrappyMMOAttempt {

  entityManager_: EntityManager;
  grid_: any;
  previousRAF_: any;
  _guiParams: { general: {}; };
  _gui: any;
  scene_: any;
  camera_: any;
  threejs_: any;

  constructor() {
    this._Initialize();
  }

  _Initialize() {
    this.entityManager_ = new EntityManager();

    document.getElementById('login-ui').style.visibility = 'visible';
    document.getElementById('login-button').onclick = () => {
      this.OnGameStarted_();
    };
  }

  OnGameStarted_() {
    this.CreateGUI_();

    this.grid_ = new spatial_hash_grid.SpatialHashGrid(
        [[-1000, -1000], [1000, 1000]], [100, 100]);

    this.LoadControllers_();
    this.LoadPlayer_();

    this.previousRAF_ = null;
    this.RAF_();
  }

  CreateGUI_() {
    this._guiParams = {
        general: {
      },
    };
    this._gui = new GUI();

    const generalRollup = this._gui.addFolder('General');
    this._gui.close();
  }

  LoadControllers_() {
    const threejs = new Entity();
    const mainController = new ThreeJSController();
    threejs.AddComponent(mainController);
    this.entityManager_.Add(threejs, 'threejs');

    // birdsObj = new Birds(mainController);
    // birdsObj.loadBirds();

    // Hack
    this.scene_ = threejs.GetComponent('ThreeJSController').scene_;
    this.camera_ = threejs.GetComponent('ThreeJSController').camera_;
    this.threejs_ = threejs.GetComponent('ThreeJSController').threejs_;

    const ui = new Entity();
    ui.AddComponent(new UIController({}));
    this.entityManager_.Add(ui, 'ui');

    const network = new Entity();
    network.AddComponent(new NetworkController());
    this.entityManager_.Add(network, 'network');

    const t = new Entity();
    t.AddComponent(new TerrainChunkManager({
        scene: this.scene_,
        target: 'player',
        gui: this._gui,
        guiParams: this._guiParams,
        threejs: this.threejs_,
    }));
    this.entityManager_.Add(t, 'terrain');

    const l = new Entity();
    l.AddComponent(new LoadController());
    this.entityManager_.Add(l, 'loader');

    const scenery = new Entity();
    scenery.AddComponent(new SceneryController({
        scene: this.scene_,
        grid: this.grid_,
    }));
    this.entityManager_.Add(scenery, 'scenery');

    const spawner = new Entity();
    spawner.AddComponent(new PlayerSpawner({
        grid: this.grid_,
        scene: this.scene_,
        camera: this.camera_,
    }));
    spawner.AddComponent(new NetworkEntitySpawner({
        grid: this.grid_,
        scene: this.scene_,
        camera: this.camera_,
        three: this.threejs_
    }));
    this.entityManager_.Add(spawner, 'spawners');
  }

  LoadPlayer_() {
    const params = {
      camera: this.camera_,
      scene: this.scene_,
    };

    const levelUpSpawner = new Entity();
    levelUpSpawner.AddComponent(new LevelUpComponentSpawner({
        camera: this.camera_,
        scene: this.scene_,
    }));
    this.entityManager_.Add(levelUpSpawner, 'level-up-spawner');
  }

  _OnWindowResize() {
    this.camera_.aspect = window.innerWidth / window.innerHeight;
    this.camera_.updateProjectionMatrix();
    this.threejs_.setSize(window.innerWidth, window.innerHeight);
  }

  RAF_() {
    requestAnimationFrame((t) => {
      if (this.previousRAF_ === null) {
        this.previousRAF_ = t;
      }

      this.threejs_.render(this.scene_, this.camera_);
      this.Step_(t - this.previousRAF_);
      this.previousRAF_ = t;

      // birdsObj.render();

      setTimeout(() => {
        this.RAF_();
      }, 1);
    });
  }

  Step_(timeElapsed: number) {
    const timeElapsedS = Math.min(1.0 / 30.0, timeElapsed * 0.001);

    this.entityManager_.Update(timeElapsedS);
  }
}


let _APP = null;

if (document.readyState !== 'loading') {
  _APP = new CrappyMMOAttempt();
} else {
  document.addEventListener('DOMContentLoaded', function () {
    _APP = new CrappyMMOAttempt();
  });
}
