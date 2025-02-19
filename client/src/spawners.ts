import { Component, Entity } from './components/entity';

import { ThirdPersonCamera } from './third-person-camera';
import { BasicCharacterController } from './components/player-entity'
import { HealthComponent } from './components/health-component';
import { BasicCharacterControllerInput } from './player-input';
import { SpatialGridController } from './controllers/spatial-grid-controller';
import { EquipWeapon } from './components/equip-weapon-component';
import { AttackController } from './controllers/attacker-controller';

import { NPCController } from './controllers/npc-controller';
import { NetworkEntityController as NEC } from './controllers/network-entity-controller';
import { NetworkEntityController as NPC } from './controllers/network-player-controller';
import { FloatingName } from './components/floating-name';
import { BloodEffect } from './blood-effect';


export class PlayerSpawner extends Component {

  params_: any;
  
  constructor(params: any) {
    super();
    this.params_ = params;
  }

  Spawn(playerParams: { account: any; character: { class: string; }; }) {
    const params = {
      camera: this.params_.camera,
      scene: this.params_.scene,
      desc: playerParams,
    };

    const player = new Entity();
    player.Account = playerParams.account;

    player.AddComponent(new BasicCharacterControllerInput(params));
    player.AddComponent(new BasicCharacterController(params));
    player.AddComponent(new EquipWeapon({desc: playerParams}));

    player.AddComponent(new HealthComponent({
        updateUI: true,
        health: 1,
        maxHealth: 1,
        strength: 1,
        wisdomness: 1,
        benchpress: 1,
        curl: 1,
        experience: 1,
        level: 1,
        desc: playerParams,
    }));

    player.AddComponent(
        new SpatialGridController(
            {grid: this.params_.grid}));

    player.AddComponent(
        new AttackController());

    player.AddComponent(
      new ThirdPersonCamera({
        camera: this.params_.camera,
        target: player
      })
    );

    player.AddComponent(
      new NPC(
        {camera: this.params_.camera,
        target: player}
      )
    );

    player.AddComponent(new BloodEffect({
        camera: this.params_.camera,
        scene: this.params_.scene,
    }));

    this.Manager.Add(player, 'player');

    return player;
  }
};

export class NetworkEntitySpawner extends Component {

  [x: string]: any;
  params_: any;

  constructor(params: any) {
    super();
    this.params_ = params;
  }

  Spawn(name: any, desc: { account: { name: any; }; character: { class: string; }; }) {
    const npc = new Entity();
    npc.Account = desc.account;
    npc.AddComponent(new NPCController({
        camera: this.params_.camera,
        scene: this.params_.scene,
        desc: desc,
        renderer: this.params_.three
    }));
    
    npc.AddComponent(
        new HealthComponent({
            health: 50,
            maxHealth: 50,
            strength: 2,
            wisdomness: 2,
            benchpress: 3,
            curl: 1,
            experience: 0,
            level: 1,
            desc: desc,
        }));

    npc.AddComponent(
        new SpatialGridController(
            {grid: this.params_.grid}));

    npc.AddComponent(new NEC());

    if (desc.account.name) {
      npc.AddComponent(new FloatingName({desc: desc}));
    }

    npc.AddComponent(
        new EquipWeapon({desc: desc}));
    npc.AddComponent(new BloodEffect({
        camera: this.params_.camera,
        scene: this.params_.scene,
    }));

    this.Manager.Add(npc, name);

    return npc;
  }
}
