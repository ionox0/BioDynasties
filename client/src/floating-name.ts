import * as THREE from '../../../three.js';

import { defs } from '../shared/defs';
import { Component } from './entity';


export class FloatingName extends Component {

  params_: any;
  visible_: boolean;
  sprite_: any;
  element_: HTMLCanvasElement;
  context2d_: any;
  model_: any;
  modelData_: any;
  map_: THREE.CanvasTexture;
  
  constructor(params: any) {
    super();
    this.params_ = params;
    this.visible_ = true;
  }

  Destroy() {
    if (!this.sprite_) {
      this.visible_ = false;
      return;
    }

    this.sprite_.traverse((c: { material: any; geometry: { dispose: () => void; }; }) => {
      if (c.material) {
        let materials = c.material;
        if (!(c.material instanceof Array)) {
          materials = [c.material];
        }
        for (let m of materials) {
          m.dispose();
        }
      }

      if (c.geometry) {
        c.geometry.dispose();
      }
    });
    if (this.sprite_.parent) {
      this.sprite_.parent.remove(this.sprite_);
    }
  }

  InitComponent() {
    this._RegisterHandler(
        'load.character', (m: any) => { this.CreateSprite_(m); });
    this._RegisterHandler(
        'health.death', () => { this.OnDeath_(); });
    this._RegisterHandler(
        'update.position', (m: any) => { this.Update_(m); });
  }

  OnDeath_() {
    this.Destroy();
  }

  CreateSprite_(msg: { model: { add: (arg0: any) => void; }; }) {
    if (!this.visible_) {
      return;
    }
    this.model_ = msg.model;
    const modelData = defs.CHARACTER_MODELS[this.params_.desc.character.class];
    this.modelData_ = modelData;

    this.element_ = document.createElement('canvas');
    this.context2d_ = this.element_.getContext('2d');
    this.context2d_.canvas.width = 356;
    this.context2d_.canvas.height = 128;
    this.context2d_.fillStyle = '#FFF';
    this.context2d_.font = "12pt Helvetica";
    this.context2d_.shadowOffsetX = 3;
    this.context2d_.shadowOffsetY = 3;
    this.context2d_.shadowColor = "rgba(0,0,0,0.3)";
    this.context2d_.whiteSpace = "pre-line";
    this.context2d_.shadowBlur = 2;
    this.context2d_.textAlign = 'center';
    // this.context2d_.fillText(this.params_.desc.account.name, 128, 64);
    this.context2d_.fillText(Math.round(this.parent_._position.x), 128, 64);

    const map = new THREE.CanvasTexture(this.context2d_.canvas);
    this.map_ = map;

    this.sprite_ = new THREE.Sprite(
        new THREE.SpriteMaterial({map: map, color: 0xffffff, fog: false}));
    this.sprite_.scale.set(10, 5, 1)
    this.sprite_.position.y += modelData.nameOffset;
    msg.model.add(this.sprite_);
  }

  Update_(m: any) {
    if (this.context2d_) {
      const newStr = `
        x: ${Math.round(m.value.x)}\n
        y: ${Math.round(m.value.y)}\n
        z: ${Math.round(m.value.z)}\n
      `
      this.context2d_.clearRect(0, 0, this.element_.width, this.element_.height);
      this.context2d_.fillText(newStr, 128, 64);
      this.map_.needsUpdate = true;
    }
  }
};
