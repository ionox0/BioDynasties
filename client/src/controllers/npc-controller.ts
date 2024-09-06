import * as THREE from '../../../../three.js';

import { defs } from '../../shared/defs';
import { Component } from '../components/entity';
import { BasicCharacterControllerProxy, CharacterFSM} from '../components/player-entity'


export class NPCController extends Component {
  
  mixer: THREE.AnimationMixer;
  clock: THREE.Clock;
  params_: any;
  group_: any;
  animations_: {[x: string]: any};
  queuedState_: any;
  stateMachine_: CharacterFSM;
  target_: any;
  bones_: any;
  mixer_: any;
  instanceCount_: number;
  mesh: any;
  object_: any;
  private _modelData: any;

  constructor(params: any) {
    super();
    this.params_ = params;
    this.instanceCount_ = 5;
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
    // this._RegisterHandler('health.death', (m: any) => { this.OnDeath_(m); });
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
    this.RepositionInstances();
  }

  RepositionInstances() {
    if (this.mesh === null || this.mesh === undefined) return;

    for (let i = 0; i < this.instanceCount_; i ++) {
      const dummyMat = new THREE.Matrix4();
      dummyMat.fromArray(this.mesh.instanceMatrix.array, i * 16);

      const vec = new THREE.Vector3();
      vec.setFromMatrixPosition(dummyMat);
      // vec.x += (Math.random() - 0.5) * 2;
      // vec.y += (Math.random() - 0.5) * 2;
      // vec.z += (Math.random() - 0.5) * 2;
      const terrain = this.FindEntity('terrain').GetComponent('TerrainChunkManager');
      vec.y = terrain.GetHeight({x: vec.x + this.group_.position.x, y: 0, z: vec.z + this.group_.position.z})[0] - this.group_.position.y;

      dummyMat.setPosition(vec.x, vec.y, vec.z);
      dummyMat.toArray(this.mesh.instanceMatrix.array, i * 16);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  OnRotation_(m: { value: THREE.Quaternion; }) {
    if (this.mesh === null || this.mesh === undefined) return;
    const newQuat = new THREE.Quaternion(m.value.x, m.value.y, m.value.z, m.value.w);
    
    var position = new THREE.Vector3();
    var rotation = new THREE.Quaternion();
    var scale = new THREE.Vector3();
    const dummyMat = new THREE.Matrix4();
    var updatedMatrix = new THREE.Matrix4();
    for (let i = 0; i < this.instanceCount_; i ++) {
      dummyMat.fromArray(this.mesh.instanceMatrix.array, i * 16);
      dummyMat.decompose(position, rotation, scale);
      updatedMatrix.compose(position, newQuat, scale);
      updatedMatrix.toArray(this.mesh.instanceMatrix.array, i * 16);
    }
  }

  animate() {
    // Todo: add to animations object
    const delta = this.clock.getDelta();
    if (this.mixer) this.mixer.update(delta);
  }

  LoadModels_() {
    const classType = this.params_.desc.character.class;
    const modelData = defs.CHARACTER_MODELS[classType];
    this._modelData = modelData;

    const loader = this.FindEntity('loader').GetComponent('LoadController');

    loader.LoadSkinnedGLB(modelData.path, modelData.base, (glb: any) => {
      this.object_ = glb;
      this.target_ = glb.scene;
      // Note: messing with the scale makes it harder to convert from global to local height coords
      this.target_.scale.setScalar(modelData.scale);
      this.target_.visible = false;
      this.group_.add(this.target_);

      this.mixer = new THREE.AnimationMixer(this.target_);
      if (glb.animations.length > 0) {
        const action = this.mixer.clipAction(glb.animations[1]);
        action.play();
        this.params_.renderer.setAnimationLoop(() => {this.animate();});
      }

      this.target_.traverse( ( child: any ) => {
        if ( child.isMesh ) {
          this.AddInstancing(child);
        }
      });

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
          if (glb.animations[i].name.toLowerCase().includes(animName)) {
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

      this.animations_['idle'] = _FindAnim('idle') || _FindAnim('stand');
      this.animations_['walk'] = _FindAnim('walk') || _FindAnim('hover');
      this.animations_['run'] = _FindAnim('run');
      this.animations_['death'] = _FindAnim('death');
      this.animations_['attack'] = _FindAnim('attack');
      this.animations_['dance'] = _FindAnim('dance');

      // todo: hack until i figure out how to make / rename animations in blender
      if (glb.animations.length > 0) {
        if (this.animations_['idle'] == undefined || this.animations_['idle'] == null) {
          const clip = glb.animations[0];
          const action = this.mixer_.clipAction(clip);
          const anim = {
            clip: clip,
            action: action
          }
          this.animations_['idle'] = anim;
          this.animations_['walk'] = anim;
          this.animations_['run'] = anim;
          this.animations_['death'] = anim;
          this.animations_['attack'] = anim;
          this.animations_['dance'] = anim;
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
      }

      this.Broadcast({
          topic: 'load.character',
          model: this.group_,
          bones: this.bones_,
      });
    });
  }

  AddInstancing(child: any) {
    this.mesh = child;
    this.mesh.matrixAutoUpdate = true;
    this.mesh.traverse(function( node: any ) {
      if ( node.isMesh ) {
        node.matrixAutoUpdate = true;
        node.matrixWorldAutoUpdate = true;
      }
    });

    this.mesh.isInstancedMesh = true;
    this.mesh.instanceMatrix = new THREE.InstancedBufferAttribute(new Float32Array(this.instanceCount_ * 16), 16);
    this.mesh.count = this.instanceCount_;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.instanceCount_; i ++) {
      // Distance between instances
      dummy.position.x = (i * 100) * this._modelData.scale;
      dummy.position.z = (i + 100 * (-1)**i) * this._modelData.scale;

      const terrain = this.FindEntity('terrain').GetComponent('TerrainChunkManager');
      dummy.position.y = terrain.GetHeight({x: dummy.position.x, z: dummy.position.z})[0];
      
      dummy.updateMatrix();
      dummy.matrix.toArray(this.mesh.instanceMatrix.array, i * 16);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.material.needsUpdate = true;
    this.mesh.instanceMatrix.version += 1;

    this.mesh.needsUpdate = true;
    this.mesh.matrixWorldNeedsUpdate = true;
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
