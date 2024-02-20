import * as THREE from 'three';

import { Component } from './entity';
import { BasicCharacterControllerProxy, CharacterFSM} from './player-entity'

import { defs } from '../shared/defs';
import { math } from '../shared/math';


export class NPCController extends Component {
  
  params_: any;
  group_: THREE.Group;
  animations_: {[x: string]: any};
  queuedState_: any;
  stateMachine_: any;
  target_: any;
  bones_: any;
  mixer_: any;
  objMesh: THREE.InstancedMesh<any, any>;
  instanceCount_: number;

  constructor(params: any) {
    super();
    this.params_ = params;
    this.instanceCount_ = 30;
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
    this.RepositionInstances(m);
  }

  RepositionInstances(m: any) {
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

  LoadModels_() {
    const classType = this.params_.desc.character.class;
    const modelData = defs.CHARACTER_MODELS[classType];

    const loader = this.FindEntity('loader').GetComponent('LoadController');
    loader.LoadSkinnedGLB(modelData.path, modelData.base, (glb: any) => {
      this.target_ = glb.scene;
      this.target_.scale.setScalar(modelData.scale);
      this.target_.visible = false;

      // todo: is the group useful here?
      // this.group_.add(this.target_);

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
        if (c.material && c.material.map) {
          c.material.map.encoding = THREE.sRGBEncoding;
        }
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
    const mesh = this.target_.getObjectByName("Cube001_1");
    const geometry = mesh.geometry.clone();
    const material = mesh.material;
    this.objMesh = new THREE.InstancedMesh(geometry, material, 10000);
    this.group_.add(this.objMesh);

    const dummy = new THREE.Object3D();
    for(let i = 0; i < this.instanceCount_; i++) {
      dummy.position.x = Math.random() * 10 - 5;
      dummy.position.z = Math.random() * 10 - 5;
      dummy.scale.x = dummy.scale.y = dummy.scale.z = 0.3 * (Math.random() + 0.2);
      dummy.updateMatrix();
      this.objMesh.setMatrixAt(i, dummy.matrix);
      this.objMesh.setColorAt(i, new THREE.Color(Math.random() * 0xFFFFFF));
    }
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
