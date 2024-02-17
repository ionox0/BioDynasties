import * as THREE from 'three';
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils';

import { FBXLoader}  from 'three/examples/jsm/loaders/FBXLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

import { Component } from "./entity";
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
      this.textures_[name].encoding = THREE.sRGBEncoding;
    }

    return this.textures_[name].texture;
  }

  LoadFBX(path: any, name: string, onLoad: Function) {
    if (!(name in this.models_)) {
      const loader = new FBXLoader();
      loader.setPath(path);

      this.models_[name] = {loader: loader, asset: null, queue: [onLoad]};
      this.models_[name].loader.load(name, (fbx: any) => {
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
  
      loader.setPath(path);

      this.models_[name] = {loader: loader, asset: null, queue: [onLoad]};
      this.models_[name].loader.load(name, (glb: any) => {
        this.models_[name].asset = glb;

        glb.scene.traverse((c: { frustumCulled: boolean; }) => {
          // HAHAHAH
          c.frustumCulled = false;
          // Apparently this doesn't work, so just disable frustum culling.
          // Bugs... so many bugs...

          // if (c.geometry) {
          //   // Just make our own, super crappy, super big box
          //   c.geometry.boundingBox = new THREE.Box3(
          //       new THREE.Vector3(-50, -50, -50),
          //       new THREE.Vector3(50, 50, 50));
          //   c.geometry.boundingSphere = new THREE.Sphere();
          //   c.geometry.boundingBox.getBoundingSphere(c.geometry.boundingSphere);
          // }
        });

        const queue = this.models_[name].queue;
        this.models_[name].queue = null;
        for (let q of queue) {
          const clone = {...glb};
          clone.scene = SkeletonUtils.clone(clone.scene);

          q(clone);
        }
      });
    } else if (this.models_[name].asset == null) {
      this.models_[name].queue.push(onLoad);
    } else {
      const clone = {...this.models_[name].asset};
      clone.scene = SkeletonUtils.clone(clone.scene);

      onLoad(clone);
    }

  }
}
