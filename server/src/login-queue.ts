export const login_queue = (() => {

  class FiniteStateMachine {

    currentState_: any;
    onEvent_: any;

    constructor(onEvent: (e: any) => void) {
      this.currentState_ = null;
      this.onEvent_ = onEvent;
    }
  
    get State() {
      return this.currentState_;
    }
  
    Broadcast(evt: any) {
      this.onEvent_(evt);
    }

    OnMessage(evt: any, data: any) {
      return this.currentState_.OnMessage(evt, data);
    }

    SetState(state: any) {
      const prevState = this.currentState_;
      
      if (prevState) {
        prevState.OnExit();
      }
  
      this.currentState_ = state;
      this.currentState_.parent_ = this;
      state.OnEnter(prevState);
    }
  };
  
  
  class State {
    parent_: any;
    constructor() {}

    Broadcast(evt: { topic: string; params: any; }) {
      this.parent_.Broadcast(evt);
    }
  
    OnEnter() {
    }
  
    OnMessage(evt: string, data: any) {
    }
  
    OnExit() {
    }
  };
  

  class Login_Await extends State {
    params_: any;
    
    constructor() {
      super();
      this.params_ = {};
    }
  
    OnMessage(evt: string, data: any) {
      if (evt != 'login.commit') {
        return false;
      }
  
      this.params_.accountName = data;
      this.parent_.SetState(new Login_Confirm(this.params_));

      return true;
    }
  };
  
  
  class Login_Confirm extends State {
    params_: any;
    constructor(params: any) {
      super();
      this.params_ = {...params};
    }
  
    OnEnter() {
      console.log('login confirmed: ' + this.params_.accountName);
      this.Broadcast({topic: 'login.complete', params: this.params_});
    }
  
    OnMessage() {
      return true;
    }
  };


  class LoginClient {

    onLogin_: any;
    fsm_: FiniteStateMachine;

    constructor(client: any, onLogin: Function) {
      this.onLogin_ = onLogin;

      client.onMessage = (e: any, d: any) => this.OnMessage_(e, d);

      this.fsm_ = new FiniteStateMachine((e: any) => { this.OnEvent_(e); });
      this.fsm_.SetState(new Login_Await());
    }

    OnEvent_(evt: { params: any; }) {
      this.onLogin_(evt.params);
    }

    OnMessage_(topic: any, data: any) {
      return this.fsm_.OnMessage(topic, data);
    }
  };


  class LoginQueue {
    clients_: any;
    onLogin_: any;
    
    constructor(onLogin: any) {
      this.clients_ = {};
      this.onLogin_ = onLogin;
    }
  
    Add(client: { ID: string | number; }) {
      this.clients_[client.ID] = new LoginClient(
          client, (e: any) => { this.OnLogin_(client, e); });
    }
  
    OnLogin_(client: { ID: string | number; }, params: any) {
      delete this.clients_[client.ID];
  
      this.onLogin_(client, params);
    }
  };

  return {
      LoginQueue: LoginQueue,
  };
})();