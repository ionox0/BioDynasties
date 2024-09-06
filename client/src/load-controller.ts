import * as THREE from '../../../three.js';
import { clone as threeClone } from '../../../three.js/examples/jsm/utils/SkeletonUtils';

import { FBXLoader}  from '../../../three.js/examples/jsm/loaders/FBXLoader';
import { GLTFLoader } from '../../../three.js/examples/jsm/loaders/GLTFLoader';

import { Component } from "./components/entity";
import { MeshoptDecoder } from 'meshoptimizer';


export class LoadController extends Component {

  textures_: {[name: string]: any};
  models_: {[name: string]: any};
  
  constructor() {
    super();

    this.textures_ = {};
    this.models_ = {};
  }

  LoadTexture(path: any, name: string) {
    if (!(name in this.textures_)) {
      const loader = new THREE.TextureLoader();
      loader.setPath(path);

      this.textures_[name] = {loader: loader, texture: loader.load(name)};
    }

    return this.textures_[name].texture;
  }

  LoadFBX(path: any, name: string, onLoad: Function) {
    if (!(name in this.models_)) {
      const loader = new FBXLoader();

      this.models_[name] = {loader: loader, asset: null, queue: [onLoad]};
      this.models_[name].loader.load(path + name, (fbx: any) => {
        this.models_[name].asset = fbx;

        const queue = this.models_[name].queue;
        this.models_[name].queue = null;
        for (let q of queue) {
          const clone = this.models_[name].asset.clone();
          q(clone);
        }
      });
    } else if (this.models_[name].asset == null) {
      this.models_[name].queue.push(onLoad);
    } else {
      const clone = this.models_[name].asset.clone();
      onLoad(clone);
    }
  }

  LoadSkinnedGLB(path: any, name: string, onLoad: Function) {
    if (!(name in this.models_)) {
      const loader = new GLTFLoader();

      if (name == 'black_ox_beetle-optimized.glb') {
        loader.setMeshoptDecoder(MeshoptDecoder);
      }

      this.models_[name] = {loader: loader, asset: null, queue: [onLoad]};
      this.models_[name].loader.load(path + name, (glb: any) => {
        this.models_[name].asset = glb;

        glb.scene.traverse((c: { frustumCulled: boolean; }) => {
          // Apparently this doesn't work, so just disable frustum culling.
          c.frustumCulled = false;
        });

        const queue = this.models_[name].queue;
        this.models_[name].queue = null;
        for (let q of queue) {
          const clone = {...glb};
          clone.scene = threeClone(clone.scene);

          q(clone);
        }
      });
    } else if (this.models_[name].asset == null) {
      this.models_[name].queue.push(onLoad);
    } else {
      const clone = {...this.models_[name].asset};
      clone.scene = threeClone(clone.scene);

      onLoad(clone);
    }

  }
}
