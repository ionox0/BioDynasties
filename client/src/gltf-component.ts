import * as THREE from '../../../three.js';
import { GLTFLoader } from '../../../three.js/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from '../../../three.js/examples/jsm/loaders/FBXLoader';

import { Component } from './entity';


export class StaticModelComponent extends Component {
  _params: any;
  _target: any;
  constructor(params: any) {
    super();
    this._Init(params);
  }

  _Init(params: any) {
    this._params = params;

    this._LoadModels();
  }

  InitComponent() {
    this._RegisterHandler('update.position', (m: any) => { this._OnPosition(m); });
  }

  _OnPosition(m: { value: any; }) {
    if (this._target) {
      this._target.position.copy(m.value);
    }
  }

  _LoadModels() {
    if (this._params.resourceName.endsWith('glb') || this._params.resourceName.endsWith('gltf')) {
      this._LoadGLB();
    } else if (this._params.resourceName.endsWith('fbx')) {
      this._LoadFBX();
    }
  }

  _OnLoaded(obj: any) {
    this._target = obj;
    this._params.scene.add(this._target);

    this._target.scale.setScalar(this._params.scale);
    this._target.position.copy(this.parent_._position);

    let texture: any = null;
    if (this._params.resourceTexture) {
      const texLoader = new THREE.TextureLoader();
      texture = texLoader.load(this._params.resourceTexture);
      // texture.encoding = THREE.sRGBEncoding;
    }

    this._target.traverse((c: { material: any; receiveShadow: any; castShadow: any; visible: any; }) => {
      let materials = c.material;
      if (!(c.material instanceof Array)) {
        materials = [c.material];
      }

      for (let m of materials) {
        if (m) {
          if (texture) {
            m.map = texture;
          }
          if (this._params.specular) {
            m.specular = this._params.specular;
          }
          if (this._params.emissive) {
            m.emissive = this._params.emissive;
          }
        }
      }
      if (this._params.receiveShadow != undefined) {
        c.receiveShadow = this._params.receiveShadow;
      }
      if (this._params.castShadow != undefined) {
        c.castShadow = this._params.castShadow;
      }
      if (this._params.visible != undefined) {
        c.visible = this._params.visible;
      }
    });
  }

  _LoadGLB() {
    const loader = new GLTFLoader();
    // loader.setPath(this._params.resourcePath);
    loader.load(this._params.resourcePath + this._params.resourceName, (glb: { scene: any; }) => {
      this._OnLoaded(glb.scene);
    });
  }

  _LoadFBX() {
    const loader = new FBXLoader();
    // loader.setPath(this._params.resourcePath);
    loader.load(this._params.resourcePath + this._params.resourceName, (fbx: any) => {
      this._OnLoaded(fbx);
    });
  }

  Update(timeInSeconds: any) {
  }
};


export class AnimatedModelComponent extends Component {
  _target: any;
  _params: any;
  _parent: any;
  _mixer: any;
  constructor(params: any) {
    super();
    this._Init(params);
  }

  InitComponent() {
    this._RegisterHandler('update.position', (m: any) => { this._OnPosition(m); });
  }

  _OnPosition(m: { value: any; }) {
    if (this._target) {
      this._target.position.copy(m.value);
      this._target.position.y = 0.35;
    }
  }

  _Init(params: any) {
    this._params = params;

    this._LoadModels();
  }

  _LoadModels() {
    if (this._params.resourceName.endsWith('glb') || this._params.resourceName.endsWith('gltf')) {
      this._LoadGLB();
    } else if (this._params.resourceName.endsWith('fbx')) {
      this._LoadFBX();
    }
  }

  _OnLoaded(obj: any) {
    this._target = obj;
    this._params.scene.add(this._target);

    this._target.scale.setScalar(this._params.scale);
    this._target.position.copy(this._parent._position);

    this.Broadcast({
      topic: 'update.position',
      value: this._parent._position,
    });

    let texture: any = null;
    if (this._params.resourceTexture) {
      const texLoader = new THREE.TextureLoader();
      texture = texLoader.load(this._params.resourceTexture);
      // texture.encoding = THREE.sRGBEncoding;
    }

    this._target.traverse((c: { material: any; receiveShadow: any; castShadow: any; visible: any; }) => {
      let materials = c.material;
      if (!(c.material instanceof Array)) {
        materials = [c.material];
      }

      for (let m of materials) {
        if (m) {
          if (texture) {
            m.map = texture;
          }
          if (this._params.specular) {
            m.specular = this._params.specular;
          }
          if (this._params.emissive) {
            m.emissive = this._params.emissive;
          }
        }
      }
      if (this._params.receiveShadow != undefined) {
        c.receiveShadow = this._params.receiveShadow;
      }
      if (this._params.castShadow != undefined) {
        c.castShadow = this._params.castShadow;
      }
      if (this._params.visible != undefined) {
        c.visible = this._params.visible;
      }
    });

    const _OnLoad = (anim: { animations: any[]; }) => {
      const clip = anim.animations[0];
      const action = this._mixer.clipAction(clip);

      action.play();
    };

    const loader = new FBXLoader();
    // loader.setPath(this._params.resourcePath);
    loader.load(this._params.resourcePath, this._params.resourceAnimation, (a: any) => { _OnLoad(a); });

    this._mixer = new THREE.AnimationMixer(this._target);

    this._parent._mesh = this._target;
    this.Broadcast({
        topic: 'load.character',
        model: this._target,
    });
  }

  _LoadGLB() {
    const loader = new GLTFLoader();
    // loader.setPath(this._params.resourcePath);
    loader.load(this._params.resourcePath + this._params.resourceName, (glb: { scene: any; animations: any; }) => {
      this._OnLoaded(glb.scene);
    });
  }

  _LoadFBX() {
    const loader = new FBXLoader();
    // loader.setPath(this._params.resourcePath);
    loader.load(this._params.resourcePath + this._params.resourceName, (fbx: any) => {
      this._OnLoaded(fbx);
    });
  }

  Update(timeInSeconds: any) {
    if (this._mixer) {
      this._mixer.update(timeInSeconds);
    }
  }
};
