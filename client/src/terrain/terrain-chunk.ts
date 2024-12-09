import * as THREE from '../../../../three.js';
import { MeshBasicNodeMaterial } from '../../../../three.js/examples/jsm/nodes/Nodes';

import { PS } from './terrain-shader';


export class TerrainChunk {

  _params: any;
  _geometry: any;
  _material: any;
  _plane: any;
  private _terrainData: any;

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
    // this._plane.visible = true;
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

  RebuildMeshFromData(terrainData: any) {

    this._geometry.setAttribute(
        'position', new THREE.Float32BufferAttribute(terrainData.positions, 3));
    this._geometry.setAttribute(
        'normal', new THREE.Float32BufferAttribute(terrainData.normals, 3));
    this._geometry.setAttribute(
        'color', new THREE.Float32BufferAttribute(terrainData.colours, 3));
    this._geometry.setAttribute(
        'coords', new THREE.Float32BufferAttribute(terrainData.coords, 3));
    this._geometry.setAttribute(
        'weights1', new THREE.Float32BufferAttribute(terrainData.weights1, 4));
    this._geometry.setAttribute(
        'weights2', new THREE.Float32BufferAttribute(terrainData.weights2, 4));
    this._geometry.computeBoundingBox();

    this._terrainData = terrainData;
    const loader = new THREE.TextureLoader();
    loader.load('./resources/terrain/simplex-noise.png', (noiseTexture: any) => { this.initShader(noiseTexture); });
  }

  initShader(noiseTexture: any) {
    noiseTexture.wrapS = THREE.RepeatWrapping;
    noiseTexture.wrapT = THREE.RepeatWrapping;

    this._material = new MeshBasicNodeMaterial();
    this._material.side = THREE.BackSide;

    this._material.colorNode = PS(this._terrainData, this._params.normalTextureAtlas, this._params.diffuseTextureAtlas, noiseTexture);

    console.log(this._params);
    // this._material.colorNode = triplanarTexture(
    //   // texture(this._params.normalTextureAtlas.Info['diffuse'].atlas),
    //   texture(this._params.diffuseTextureAtlas._textures['diffuse'].textures[0]),
    //   texture(this._params.diffuseTextureAtlas._textures['diffuse'].textures[2]),
    //   texture(this._params.diffuseTextureAtlas._textures['diffuse'].textures[1]),
    //   // texture(noiseTexture),
    //   float(0.01),
    //   positionLocal,
    //   normalLocal
    // );
    
    this._plane = new THREE.Mesh(this._geometry, this._material);
    this._plane.castShadow = false;
    this._plane.receiveShadow = false;
    this._plane.frustumCulled = false;
    this._params.group.add(this._plane);
    this.Reinit(this._params);
  }

}
