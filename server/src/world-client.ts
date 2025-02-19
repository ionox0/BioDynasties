import {quat, vec3} from 'gl-matrix';
import { HeightGenerator } from '../../client/shared/terrain-height';


export const world_client = (() => {

  const _TIMEOUT = 600.0;

  class WorldClient {
    
    entity_: any;
    client_: any;
    timeout_: number;
    entityCache_: {};

    constructor(client: any, entity: any) {
      this.entity_ = entity;

      // Hack
      this.entity_.onEvent_ = (t: any, d: any) => this.OnEntityEvent_(t, d);

      this.client_ = client;
      this.client_.onMessage = (e: any, d: any) => this.OnMessage_(e, d);
      this.client_.Send('world.player', this.entity_ .CreatePlayerPacket_());
      this.client_.Send('world.stats', this.entity_ .CreateStatsPacket_());

      this.timeout_ = _TIMEOUT;

      this.entityCache_ = {};

      // Hack
      entity.parent_ = this;
    }

    Destroy() {
      this.client_.Disconnect();
      this.client_ = null;

      this.entity_.Destroy();
      this.entity_ = null;
    }

    OnDeath() {}

    OnEntityEvent_(t: string, d: any) {
      if (t == 'attack.damage') {
        this.OnDamageEvent_(d);
      }
    }

    OnMessage_(evt: string, data: any) {
      this.timeout_ = _TIMEOUT;

      if (evt == 'world.update') {
        this.entity_.UpdateTransform(data);
        return true;
      }
  
      if (evt == 'chat.msg') {
        this.OnChatMessage_(data);
        return true;
      }
  
      if (evt == 'action.attack') {
        this.entity_.OnActionAttack();
        return true;
      }
  
      if (evt == 'world.inventory') {
        this.OnInventoryChanged_(data);
        return true;
      }
  
      return false;
    }

    OnDamageEvent_(_: any) {}

    OnInventoryChanged_(inventory: any) {
      this.entity_.UpdateInventory(inventory);
  
      // Todo: Merge this into entityCache_ path.
      const nearby = this.entity_.FindNear(50, true);

      for (let n of nearby) {
        n.parent_.client_.Send('world.inventory', [this.entity_.ID, inventory]);
      }
    }

    OnChatMessage_(message: any) {
      const chatMessage = {
        name: this.entity_.accountInfo_.name,
        text: message,
      };

      this.BroadcastChat(chatMessage);
    }

    BroadcastChat(chatMessage: { name: any; text: any; server?: boolean; }) {  
      const nearby = this.entity_.FindNear(50, true);
  
      for (let i = 0; i < nearby.length; ++i) {
        const n = nearby[i];
        n.parent_.client_.Send('chat.message', chatMessage);
      }
    }

    get IsDead() {
      return this.timeout_ <= 0.0;
    }

    OnUpdate_(timeElapsed: any) {}

    OnUpdateClientState_() {}

    UpdateClientState_() {
      this.OnUpdateClientState_();
    }

    Update(timeElapsed: number) {
      this.timeout_ -= timeElapsed;

      this.entity_.Update(timeElapsed);

      this.OnUpdate_(timeElapsed);
    }
  };


  class WorldNetworkClient extends WorldClient {
    constructor(client: any, entity: any) {
      super(client, entity);
    }

    OnUpdate_(timeElapsed: any) {
    }

    OnUpdateClientState_() {
      const _Filter = (e: { ID: any; }) => {
        return e.ID != this.entity_.ID;
      };

      const nearby = this.entity_.FindNear(500).filter((e: any) => _Filter(e));

      const updates = [{
          id: this.entity_.ID,
          stats: this.entity_.CreateStatsPacket_(),
          events: this.entity_.CreateEventsPacket_(),
      }];
      const newCache_: any = {};

      for (let n of nearby) {
        // We could easily trim this down based on what we know
        // this client saw last. Maybe do it later.
        const cur: any = {
            id: n.ID,
            transform: n.CreateTransformPacket_(),
            stats: n.CreateStatsPacket_(),
            events: n.CreateEventsPacket_(),
        };

        if (!(n.ID in this.entityCache_)) {
          cur.desc = n.GetDescription();
        }

        newCache_[n.ID] = cur;
        updates.push(cur);
      }

      this.entityCache_ = newCache_;

      this.client_.Send('world.update', updates);
    }
  };


  class AIStateMachine {

    currentState_: any;
    entity_: any;
    terrain_: any;

    constructor(entity: any, terrain: any) {
      this.currentState_ = null;
      this.entity_ = entity;
      this.terrain_ = terrain;
    }

    SetState(state: any) {
      const prevState = this.currentState_;
      
      if (prevState) {
        if (prevState.constructor.name == state.constructor.name) {
          return;
        }
        prevState.Exit();
      }

      this.currentState_ = state;
      this.currentState_.parent_ = this;
      this.currentState_.entity_ = this.entity_;
      this.currentState_.terrain_ = this.terrain_;
      state.Enter(prevState);
    }

    Update(timeElapsed: any) {
      if (this.currentState_) {
        this.currentState_.Update(timeElapsed);
      }
    }
  };

  class AIState {
    constructor() {}
    Exit() {}
    Enter() {}
    Update(timeElapsed: any) {}
  }

  class AIState_JustSitThere extends AIState {

    timer_: number;
    entity_: any;
    parent_: any;

    constructor() {
      super();

      this.timer_ = 0.0;
    }

    UpdateLogic_() {
      const _IsPlayer = (e: { isAI: any; }) => {
        return !e.isAI;
      };
      const nearby = this.entity_.FindNear(50.0).filter((e: { Health: number; }) => e.Health > 0).filter(_IsPlayer);

      if (nearby.length > 0) {
        this.parent_.SetState(new AIState_FollowToAttack(nearby[0]));
      }
    }

    Update(timeElapsed: number) {
      this.timer_ += timeElapsed;
      this.entity_.SetState('idle');

      if (this.timer_ > 5.0) {
        this.UpdateLogic_();
        this.timer_ = 0.0;
      }
    }
  };

  class AIState_FollowToAttack extends AIState {
    
    target_: any;
    entity_: any;
    terrain_: any;
    parent_: any;

    constructor(target: any) {
      super();
      this.target_ = target;
    }

    UpdateMovement_(timeElapsed: number) {
      this.entity_.state_ = 'walk';

      const direction = vec3.create();
      const forward = vec3.fromValues(0, 0, 1);

      vec3.sub(direction, this.target_.position_, this.entity_.position_);
      direction[1] = 0.0;

      vec3.normalize(direction, direction);
      quat.rotationTo(this.entity_.rotation_, forward, direction);

      const movement = vec3.clone(direction);
      vec3.scale(movement, movement, timeElapsed * 10.0);

      vec3.add(this.entity_.position_, this.entity_.position_, movement);

      this.entity_.position_[1] = this.terrain_.Get(...this.entity_.position_)[0];
      this.entity_.UpdateGridClient_();

      const distance = vec3.distance(this.entity_.position_, this.target_.position_);

      if (distance < 10.0) {
        this.entity_.OnActionAttack();
        this.parent_.SetState(new AIState_WaitAttackDone(this.target_));
      } else if (distance > 100.0) {
        this.parent_.SetState(new AIState_JustSitThere());
      }
    }

    Update(timeElapsed: any) {
      if (!this.target_.Valid || this.target_.Health == 0) {
        this.parent_.SetState(new AIState_JustSitThere());
        return;
      }

      this.UpdateMovement_(timeElapsed);
    }
  };


  class AIState_WaitAttackDone extends AIState {
    target_: any;
    entity_: any;
    parent_: any;
    constructor(target: any) {
      super();
      this.target_ = target;
    }

    Update(_: any) {
      this.entity_.state_ = 'attack';
      if (this.entity_.action_) {
        return;
      }

      this.parent_.SetState(new AIState_FollowToAttack(this.target_));
    }
  };

  
  class FakeClient {
    constructor() {}
  
    Send(msg: any, data: any) {}

    Disconnect() {}
  };

  class WorldAIClient extends WorldClient {

    terrain_: HeightGenerator;
    onDeath_: any;
    fsm_: AIStateMachine;
    deathTimer_: number;

    constructor(entity: any, terrain: any, onDeath: any) {
      super(new FakeClient(), entity);
      this.terrain_ = terrain;
      this.onDeath_ = onDeath;
      // Haha sorry
      this.entity_.isAI = true;

      this.fsm_ = new AIStateMachine(entity, this.terrain_);
      this.fsm_.SetState(new AIState_JustSitThere());

      this.deathTimer_ = 0.0;
    }

    get IsDead() {
      return this.deathTimer_ >= 300.0;
    }

    OnDeath() {
      this.onDeath_();
    }

    OnUpdateClientState_() {}

    OnUpdate_(timeElapsed: number) {
      // Never times out
      this.timeout_ = 1000000.0;

      if (this.entity_.Health > 0) {
        this.fsm_.Update(timeElapsed);
      } else {
        // this.deathTimer_ += timeElapsed;
      }
    }
  };


  return {
      WorldNetworkClient: WorldNetworkClient,
      WorldAIClient: WorldAIClient,
  };
})();