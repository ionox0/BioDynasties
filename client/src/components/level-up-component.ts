import * as THREE from '../../../../three.js';

import { ParticleSystem } from "../particle-system";
import { Entity, Component} from "./entity";


export class LevelUpComponentSpawner extends Component {
  _params: any;

  constructor(params: any) {
    super();
    this._params = params;
  }

  Spawn(pos: any) {
    const e = new Entity();
    e.SetPosition(pos);
    e.AddComponent(new LevelUpComponent(this._params));
    this.Manager.Add(e, null);

    return e;
  }
};

class LevelUpComponent extends Component {
  
  _params: any;
  _particles: ParticleSystem;

  constructor(params: { camera: any; scene: any; }) {
    super();
    this._params = params;

    this._particles = new ParticleSystem({
        camera: params.camera,
        parent: params.scene,
        texture: './resources/textures/ball.png',
    });
    this._particles._alphaSpline.AddPoint(0.0, 0.0);
    this._particles._alphaSpline.AddPoint(0.1, 1.0);
    this._particles._alphaSpline.AddPoint(0.7, 1.0);
    this._particles._alphaSpline.AddPoint(1.0, 0.0);
    
    this._particles._colourSpline.AddPoint(0.0, new THREE.Color(0x00FF00));
    this._particles._colourSpline.AddPoint(0.5, new THREE.Color(0x40C040));
    this._particles._colourSpline.AddPoint(1.0, new THREE.Color(0xFF4040));
    
    this._particles._sizeSpline.AddPoint(0.0, 0.05);
    this._particles._sizeSpline.AddPoint(0.5, 0.25);
    this._particles._sizeSpline.AddPoint(1.0, 0.0);
  }

  InitComponent() {
    this._particles.AddParticles(this.Parent.Position, 300);
  }
  
  Update(timeElapsed: any) {
    this._particles.Step(timeElapsed);
    if (this._particles._particles.length == 0) {
      this.Parent.SetActive(false);
    }
  }
}
