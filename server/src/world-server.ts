import {performance} from 'perf_hooks';

import { world_manager } from './world-manager';
import { login_queue } from './login-queue';


export const world_server = (() => {


  class SocketWrapper {
    
    socket_: any;
    onMessage: any;
    dead_: boolean;

    constructor(params: { socket: any; }) {
      this.socket_ = params.socket;
      this.onMessage = null;
      this.dead_ = false;
      this.SetupSocket_();
    }
  
    get ID() {
      return this.socket_.id;
    }

    get IsAlive() {
      return !this.dead_;
    }
  
    SetupSocket_() {
      this.socket_.on('user-connected', () => {
        console.log('socket.id: ' + this.socket_.id);
      });
      this.socket_.on('disconnect', () => {
        console.log('Client disconnected.');
        this.dead_ = true;
      });
      this.socket_.onAny((e: string, d: any) => {
        try {
          if (!this.onMessage(e, d)) {
            console.log('Unknown command (' + e + '), disconnected.');
            this.Disconnect();
          }
        } catch (err) {
          console.error(err);
          this.Disconnect();
        }
      });
    }
  
    Disconnect() {
      this.socket_.disconnect(true);
    }
  
    Send(msg: any, data: any) {
      this.socket_.emit(msg, data);
    }
  };


  class WorldServer {
    loginQueue_: any;
    worldMgr_: any;
    constructor(io: any) {
      this.loginQueue_ = new login_queue.LoginQueue(
          (c: any, p: any) => { this.OnLogin_(c, p); });

      this.worldMgr_ = new world_manager.WorldManager();
      this.SetupIO_(io);
    }
  
    SetupIO_(io: { on: (arg0: string, arg1: (socket: any) => void) => void; }) {
      io.on('connection', (socket: any) => {
        this.loginQueue_.Add(new SocketWrapper({socket: socket}));
      });
    }
  
    OnLogin_(client: any, params: any) {
      this.worldMgr_.Add(client, params);
    }
  
    Run() {
      let t1 = performance.now();
      this.Schedule_(t1);
    }
  
    Schedule_(t1: number) {
      setTimeout(() => {
        let t2 = performance.now();
        this.Update_((t2 - t1) * 0.001);
        this.Schedule_(t2);
      });
    }
  
    Update_(timeElapsed: number) {
      this.worldMgr_.Update(timeElapsed);
    }
  };

  return {
      WorldServer: WorldServer,
  };
})();