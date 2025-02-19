import * as THREE from '../../../../three.js';

import { Component } from './entity';
import { math } from '../../shared/math';


const _VS = `
  varying vec2 vUV;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vUV = uv;
  }
  `;

const _PS = `
  uniform vec3 colour;
  uniform float health;

  varying vec2 vUV;

  void main() {
    gl_FragColor = vec4(mix(colour, vec3(0.0), step(health, vUV.y)), 1.0);
  }
  `;

export class HealthBar extends Component {
  params_: any;
  material_: any;
  geometry_: any;
  bar_: any;
  realHealth_: number;
  animHealth_: number;
  constructor(params: any) {
    super();
    this.params_ = params;
    this.Initialize_();
  }

  Destroy() {
    this.material_.dispose();
    this.geometry_.dispose();
  }

  Initialize_() {
    const uniforms = {
      colour: {
        value: new THREE.Color(0, 1, 0),
      },
      health: {
        value: 1.0,
      },
    };
    this.material_ = new THREE.MeshStandardMaterial({
      blending: THREE.NormalBlending,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.material_.onBeforeCompile = (shader: any) => {
      shader.uniforms = uniforms;
      shader.vertexShader = _VS;
      shader.fragmentShader = _PS;
    };

    this.geometry_ = new THREE.BufferGeometry();

    this.bar_ = new THREE.Mesh(this.geometry_, this.material_);
    this.bar_.frustumCulled = false;
    this.bar_.scale.set(2, 0.125, 1);

    this.realHealth_ = 1.0;
    this.animHealth_ = 1.0;

    this.params_.parent.add(this.bar_);
    this.GenerateBuffers_();
  }

  InitComponent() {
    this._RegisterHandler('health.update', (m: any) => { this.OnHealth_(m); });
  }

  OnHealth_(msg: { health: number; maxHealth: number; }) {
    const healthPercent = (msg.health / msg.maxHealth);
    
    this.realHealth_ = healthPercent;
  }

  Update(timeElapsed: number) {
    const t = 1.0 - Math.pow(0.001, timeElapsed);

    this.animHealth_ = math.lerp(t, this.animHealth_, this.realHealth_);

    const _R = new THREE.Color(1.0, 0, 0);
    const _G = new THREE.Color(0.0, 1.0, 0.0);
    const c = _R.clone();
    c.lerpHSL(_G, this.animHealth_);

    this.material_.uniforms.health.value = this.animHealth_;
    this.material_.uniforms.colour.value = c;
    this.bar_.position.copy(this.parent_.Position);
    this.bar_.position.y += 8.0;
    this.bar_.quaternion.copy(this.params_.camera.quaternion);
  }

  GenerateBuffers_() {
    const indices = [];
    const positions = [];
    const uvs = [];

    const square = [0, 1, 2, 2, 3, 0];

    indices.push(...square);

    const p1 = new THREE.Vector3(-1, -1, 0);
    const p2 = new THREE.Vector3(-1, 1, 0);
    const p3 = new THREE.Vector3(1, 1, 0);
    const p4 = new THREE.Vector3(1, -1, 0);

    uvs.push(0.0, 0.0);
    uvs.push(1.0, 0.0);
    uvs.push(1.0, 1.0);
    uvs.push(0.0, 1.0);

    positions.push(p1.x, p1.y, p1.z);
    positions.push(p2.x, p2.y, p2.z);
    positions.push(p3.x, p3.y, p3.z);
    positions.push(p4.x, p4.y, p4.z);

    this.geometry_.setAttribute(
        'position', new THREE.Float32BufferAttribute(positions, 3));
    this.geometry_.setAttribute(
        'uv', new THREE.Float32BufferAttribute(uvs, 2));
    this.geometry_.setIndex(
        new THREE.BufferAttribute(new Uint32Array(indices), 1));

    this.geometry_.attributes.position.needsUpdate = true;
  }
};
