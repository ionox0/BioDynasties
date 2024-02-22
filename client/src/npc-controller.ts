import * as THREE from '../../../three.js';
import { pass, mix, range, color, oscSine, timerLocal, MeshStandardNodeMaterial } from '../../../three.js/examples/jsm/nodes/Nodes.js';

import { Component } from './entity';
import { BasicCharacterControllerProxy, CharacterFSM} from './player-entity'

import { defs } from '../shared/defs';
import { math } from '../shared/math';


export class NPCController extends Component {
  
  mixer: THREE.AnimationMixer;
  clock: any;
  params_: any;
  group_: THREE.Group;
  animations_: {[x: string]: any};
  queuedState_: any;
  stateMachine_: any;
  target_: any;
  bones_: any;
  mixer_: any;
  objMesh: any;
  instanceCount_: number;

  constructor(params: any) {
    super();
    this.params_ = params;
    this.instanceCount_ = 3;
  }

  Destroy() {
    this.group_.traverse((c: any) => {
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
    this.params_.scene.remove(this.group_);
  }

  InitEntity() {
    this._Init();
  }

  _Init() {
    this.clock = new THREE.Clock();
    
    this.animations_ = {};
    this.group_ = new THREE.Group();

    this.params_.scene.add(this.group_);
    this.queuedState_ = null;

    this.LoadModels_();
  }

  InitComponent() {
    this._RegisterHandler('health.death', (m: any) => { this.OnDeath_(m); });
    this._RegisterHandler('update.position', (m: { value: any; }) => { this.OnPosition_(m); });
    this._RegisterHandler('update.rotation', (m: { value: any; }) => { this.OnRotation_(m); });
  }

  SetState(s: string) {
    if (!this.stateMachine_) {
      this.queuedState_ = s;
      return;
    }

    // hack: should propogate attacks through the events on server
    // Right now, they're inferred from whatever animation we're running, blech
    if (s == 'attack' && this.stateMachine_._currentState.Name != 'attack') {
      this.Broadcast({
          topic: 'action.attack',
      });
    }

    this.stateMachine_.SetState(s);
  }

  OnDeath_(msg: any) {
    this.SetState('death');
  }

  OnPosition_(m: { value: any; }) {
    this.group_.position.copy(m.value);
    // this.RepositionInstances(m);
  }

  RepositionInstances(m: any) {
    return;
    // Update relative instance positions
    // Todo: need a separate InstancedEntity class
    if (this.objMesh === null || this.objMesh === undefined) return;
    const dummy: any = new THREE.Object3D();
    const matrix = new THREE.Matrix4();
    for(let i = 0; i < this.instanceCount_; i++) {
      this.objMesh.getMatrixAt(i, matrix);
      matrix.decompose(dummy.position, dummy.rotation, dummy.scale);
      // Todo: look into group pathing algorithms
      dummy.position.x = math.smootherstep(0.4, dummy.position.x, dummy.position.x + Math.random() - 0.5);
      dummy.position.z = math.smootherstep(0.4, dummy.position.z, dummy.position.z + Math.random() - 0.5);
      dummy.updateMatrix();
      this.objMesh.setMatrixAt(i, dummy.matrix);
    }
    this.objMesh.instanceMatrix.needsUpdate = true;
  }

  OnRotation_(m: { value: any; }) {
    return;
    // Update relative instance positions
    if (this.objMesh === null || this.objMesh === undefined) return;
    // Todo: should have a separate InstancedNPCController Component
    const dummy: any = new THREE.Object3D();
    const matrix = new THREE.Matrix4();
    for(let i = 0; i < this.instanceCount_; i++) {
      this.objMesh.getMatrixAt(i, matrix);
      matrix.decompose(dummy.position, dummy.rotation, dummy.scale);
      dummy.rotation.setFromQuaternion(m.value);
      dummy.updateMatrix();
      this.objMesh.setMatrixAt(i, dummy.matrix);
    }
    this.objMesh.instanceMatrix.needsUpdate = true;
  }

  animate() {
    // Todo: add to animations object
    const delta = this.clock.getDelta();
    if (this.mixer) this.mixer.update(delta);
  }

  LoadModels_() {
    const classType = this.params_.desc.character.class;
    const modelData = defs.CHARACTER_MODELS[classType];

    const loader = this.FindEntity('loader').GetComponent('LoadController');

    const path = 'resources/characters/'
    const base = 'Michelle.glb'
    loader.LoadSkinnedGLB(path, base, (glb: any) => {
      this.target_ = glb.scene;
      // this.target_.scale.setScalar(modelData.scale);
      this.target_.scale.setScalar(5);
      this.target_.visible = false;
      this.group_.add(this.target_);

      this.mixer = new THREE.AnimationMixer(this.target_);
      const action = this.mixer.clipAction(glb.animations[0]);
      action.play();
      this.params_.renderer.setAnimationLoop(() => {this.animate();});

      this.AddInstancing();

      this.bones_ = {};
      this.target_.traverse((c: { skeleton: { bones: any; }; }) => {
        if (!c.skeleton) {
          return;
        }
        for (let b of c.skeleton.bones) {
          this.bones_[b.name] = b;
        }
      });

      this.target_.traverse((c: any) => {
        c.castShadow = true;
        c.receiveShadow = true;
      });

      this.mixer_ = new THREE.AnimationMixer(this.target_);

      
      const _FindAnim = (animName: string) => {
        for (let i = 0; i < glb.animations.length; i++) {
          if (glb.animations[i].name.includes(animName)) {
            const clip = glb.animations[i];
            const action = this.mixer_.clipAction(clip);
            return {
              clip: clip,
              action: action
            }
          }
        }
        return null;
      };

      this.animations_['idle'] = _FindAnim('Idle');
      this.animations_['walk'] = _FindAnim('Walk');
      this.animations_['run'] = _FindAnim('Run');
      this.animations_['death'] = _FindAnim('Death');
      this.animations_['attack'] = _FindAnim('Attack');
      this.animations_['dance'] = _FindAnim('Dance');

      // todo: hack until i figure out how to make / rename animations in blender
      if (this.animations_['idle'] == undefined || this.animations_['idle'] == null) {
        this.animations_['idle'] = _FindAnim('Attack');
        this.animations_['walk'] = _FindAnim('Attack');
        this.animations_['run'] = _FindAnim('Attack');
        this.animations_['death'] = _FindAnim('Attack');
        this.animations_['attack'] = _FindAnim('Attack');
        this.animations_['dance'] = _FindAnim('Attack');
      }

      this.target_.visible = true;

      this.stateMachine_ = new CharacterFSM(
          new BasicCharacterControllerProxy(this.animations_));

      if (this.queuedState_) {
        this.stateMachine_.SetState(this.queuedState_)
        this.queuedState_ = null;
      } else {
        this.stateMachine_.SetState('idle');
      }

      this.Broadcast({
          topic: 'load.character',
          model: this.group_,
          bones: this.bones_,
      });
    });
  }

  AddInstancing() {
    const mesh = this.target_.getObjectByName("Ch03");

    this.target_.traverse((child: any) => {
      if ( child.isMesh ) {
        const oscNode = oscSine( timerLocal(.1) );
        const randomColors = range( new THREE.Color( 0x000000 ), new THREE.Color( 0xFFFFFF ) );
        const randomMetalness = range( 0, 1 );

        mesh.material = new MeshStandardNodeMaterial();
        mesh.material.roughness = .1;
        mesh.material.metalnessNode = mix( 0.0, randomMetalness, oscNode );
        mesh.material.colorNode = mix( color( 0xFFFFFF ), randomColors, oscNode );

        mesh.isInstancedMesh = true;
        mesh.instanceMatrix = new THREE.InstancedBufferAttribute( new Float32Array( this.instanceCount_ * 16 ), 16 );
        mesh.count = this.instanceCount_;

        const dummy = new THREE.Object3D();
        for ( let i = 0; i < this.instanceCount_; i ++ ) {
          dummy.position.x = - 200 + ( ( i % 5 ) * 70 );
          dummy.position.y = Math.floor( i / 5 ) * - 200;
          dummy.updateMatrix();
          dummy.matrix.toArray(mesh.instanceMatrix.array, i * 16 );
        }
      }
    });
  }

  Update(timeInSeconds: any) {
    if (!this.stateMachine_) {
      return;
    }
    this.stateMachine_.Update(timeInSeconds, null);
    
    if (this.mixer_) {
      this.mixer_.update(timeInSeconds);
    }
  }
};
