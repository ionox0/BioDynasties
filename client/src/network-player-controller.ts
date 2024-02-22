import * as THREE from '../../../three.js';

import { Component } from './entity';


export class NetworkEntityController extends Component {
  
  updateTimer_: number;
  loaded_: boolean;
  net_: any;

  constructor(params: any) {
    super();
    this.updateTimer_ = 0.0;
    this.loaded_ = false;
  }

  InitComponent() {
    this._RegisterHandler('load.character', (m: any) => { this.OnLoaded_(m) });
    this._RegisterHandler('inventory.equip', (m: any) => { this.OnEquipChanged_(m) });
    this._RegisterHandler('network.update', (m: any) => { this.OnUpdate_(m) });
    this._RegisterHandler('action.attack', (m: any) => { this.OnActionAttack_(m) });
  }

  InitEntity() {
    this.net_ = this.FindEntity('network').GetComponent('NetworkController');
  }

  OnEquipChanged_(msg: any) {
    const inventory = this.GetComponent('InventoryController').CreatePacket();
    this.net_.SendInventoryChange_(inventory);
  }

  OnActionAttack_(msg: any) {
    this.net_.SendActionAttack_();
  }

  OnUpdate_(msg: any) {
    if (msg.transform) {
      this.Parent.SetPosition(new THREE.Vector3(...msg.transform[1]));
      this.Parent.SetQuaternion(new THREE.Quaternion(...msg.transform[2]));
    }

    if (msg.stats) {
      this.Broadcast({
          topic: 'stats.network',
          value: msg.stats,
      });
    }

    if (msg.events) {
      if (msg.events.length > 0) {
        this.Broadcast({
            topic: 'events.network',
            value: msg.events,
        });
      }
    }
  }

  OnLoaded_(_: any) {
    this.loaded_ = true;
  }

  CreateTransformPacket() {
    const controller = this.GetComponent('BasicCharacterController');

    // HACK
    return [
        controller.stateMachine_._currentState.Name,
        this.Parent.Position.toArray(),
        this.Parent.Quaternion.toArray(),
    ];
  }

  Update(timeElapsed: number) {
    this.updateTimer_ -= timeElapsed;
    if (this.updateTimer_ <= 0.0 && this.loaded_) {
      this.updateTimer_ = 0.1;

      this.net_.SendTransformUpdate(this.CreateTransformPacket());
    }
  }
};
