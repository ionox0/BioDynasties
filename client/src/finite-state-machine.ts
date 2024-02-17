import { State } from "./player-state";


export class FiniteStateMachine {

  _states: any;
  _currentState: any;
  
  constructor() {
    this._states = {};
    this._currentState = null;
  }

  _AddState(name: any, type: any) {
    this._states[name] = type;
  }

  SetState(name: string | number) {
    const prevState = this._currentState;
    
    if (prevState) {
      if (prevState.Name == name) {
        return;
      }
      prevState.Exit();
    }

    const state = new this._states[name](this);

    this._currentState = state;
    state.Enter(prevState);
  }

  Update(timeElapsed: any, input: any) {
    if (this._currentState) {
      this._currentState.Update(timeElapsed, input);
    }
  }
};
