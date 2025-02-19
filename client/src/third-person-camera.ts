import * as THREE from '../../../three.js';
import { Component } from './components/entity';


export class ThirdPersonCamera extends Component {

  _params: any;
  _camera: any;
  _currentPosition: any;
  _currentLookat: any;

  constructor(params: { camera: any; target: any }) {
    super();

    this._params = params;
    this._camera = params.camera;

    this._currentPosition = new THREE.Vector3();
    this._currentLookat = new THREE.Vector3();
  }

  _CalculateIdealOffset() {
    const idealOffset = new THREE.Vector3(-0, 10, -15);
    idealOffset.applyQuaternion(this._params.target._rotation);
    idealOffset.add(this._params.target._position);

    const terrain = this.FindEntity('terrain').GetComponent('TerrainChunkManager');
    idealOffset.y = Math.max(idealOffset.y, terrain.GetHeight(idealOffset)[0] + 5.0);

    return idealOffset;
  }

  _CalculateIdealLookat() {
    const idealLookat = new THREE.Vector3(0, 5, 20);
    idealLookat.applyQuaternion(this._params.target._rotation);
    idealLookat.add(this._params.target._position);
    return idealLookat;
  }

  Update(timeElapsed: number) {
    const idealOffset = this._CalculateIdealOffset();
    const idealLookat = this._CalculateIdealLookat();

    // const t = 0.05;
    // const t = 4.0 * timeElapsed;
    const t = 1.0 - Math.pow(0.01, timeElapsed);

    this._currentPosition.lerp(idealOffset, t);
    this._currentLookat.lerp(idealLookat, t);

    this._camera.position.copy(this._currentPosition);
    this._camera.lookAt(this._currentLookat);
  }
}
