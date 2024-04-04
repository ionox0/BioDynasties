import * as THREE from '../../../three.js';
import { MeshBasicNodeMaterial, float, texture, triplanarTexture } from '../../../three.js/examples/jsm/nodes/Nodes';

import { PS, VS } from './terrain-shader-tlsl_2';


export class TerrainChunk {

  _params: any;
  _geometry: any;
  _material: any;
  _plane: any;

  constructor(params: any) {
    this._params = params;
    this._Init(params);
  }
  
  Destroy() {
    this._params.group.remove(this._plane);
  }

  Hide() {
    // this._plane.visible = false;
  }

  Show() {
    this._plane.visible = true;
  }

  _Init(params: { material: any; }) {
    this._params = params;
    this._geometry = new THREE.BufferGeometry();
    // this._plane = new THREE.Mesh(this._geometry, params.material);
    // this._plane.castShadow = false;
    // this._plane.receiveShadow = true;
    // this._plane.frustumCulled = false;
    // this._params.group.add(this._plane);
    // this.Reinit(params);
  }

  Update(cameraPosition: any) {
    // this._plane.position.copy(this._params.origin);
    // this._plane.position.sub(cameraPosition);
  }

  Reinit(params: any) {
    this._params = params;
    this._plane.position.set(0, 0, 0);
  }

  RebuildMeshFromData(data: any) {

    this._geometry.setAttribute(
        'position', new THREE.Float32BufferAttribute(data.positions, 3));
    this._geometry.setAttribute(
        'normal', new THREE.Float32BufferAttribute(data.normals, 3));
    this._geometry.setAttribute(
        'color', new THREE.Float32BufferAttribute(data.colours, 3));
    this._geometry.setAttribute(
        'coords', new THREE.Float32BufferAttribute(data.coords, 3));
    this._geometry.setAttribute(
        'weights1', new THREE.Float32BufferAttribute(data.weights1, 4));
    this._geometry.setAttribute(
        'weights2', new THREE.Float32BufferAttribute(data.weights2, 4));
    this._geometry.computeBoundingBox();

    console.log('data:');
    console.log(data);
    const loader = new THREE.TextureLoader();
    const noiseTexture = loader.load('./resources/terrain/simplex-noise.png');
    noiseTexture.wrapS = THREE.RepeatWrapping;
    noiseTexture.wrapT = THREE.RepeatWrapping;

    this._material = new MeshBasicNodeMaterial();
    this._material.side = THREE.BackSide;

    this._material.colorNode = PS(this._geometry, data, this._params.normalTextureAtlas, this._params.diffuseTextureAtlas);

    // this._material.colorNode = triplanarTexture(
    //   texture(noiseTexture),
    //   texture(noiseTexture),
    //   texture(noiseTexture),
    //   float(0.01)
    // );
    
    this._plane = new THREE.Mesh(this._geometry, this._material);
    this._plane.castShadow = false;
    // this._plane.receiveShadow = true;
    // this._plane.frustumCulled = false;
    this._params.group.add(this._plane);
    this.Reinit(this._params);

  }

}
