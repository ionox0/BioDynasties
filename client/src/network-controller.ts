import { io } from 'socket.io-client';

import { Component } from './entity';


export class NetworkController extends Component {
  
  playerID_: any;
  socket_: any;

  constructor() {
    super();

    this.playerID_ = null;
    this.SetupSocket_();
  }

  GenerateRandomName_() {
    const names1 = [
        'Aspiring', 'Nameless', 'Cautionary', 'Excited',
        'Modest', 'Maniacal', 'Caffeinated', 'Sleepy',
        'Passionate', 'Medical',
    ];
    const names2 = [
        'Painter', 'Cheese Guy', 'Giraffe', 'Snowman',
        'Doberwolf', 'Cocktail', 'Fondler', 'Typist',
        'Noodler', 'Arborist', 'Peeper'
    ];
    const n1 = names1[Math.floor(Math.random() * names1.length)];
    const n2 = names2[Math.floor(Math.random() * names2.length)];
    return n1 + ' ' + n2;
  }

  SetupSocket_() {
    this.socket_ = io('ws://localhost:3000', {
        reconnection: false,
        transports: ['websocket'],
        timeout: 10000,
    });

    this.socket_.on("connect", () => {
      console.log(this.socket_.id);
      const randomName = this.GenerateRandomName_();
      // Input validation is for losers
      const input: any = document.getElementById('login-input');
      this.socket_.emit('login.commit', input.value);
    });

    this.socket_.on("disconnect", () => {
      console.log('DISCONNECTED: ' + this.socket_.id); // undefined
    });

    this.socket_.onAny((e: any, d: any) => {
      this.OnMessage_(e, d);
    });
  }

  SendChat(txt: any) {
    this.socket_.emit('chat.msg', txt);
  }

  SendTransformUpdate(transform: any) {
    this.socket_.emit('world.update', transform);
  }

  SendActionAttack_() {
    this.socket_.emit('action.attack');
  }

  SendInventoryChange_(packet: any) {
    this.socket_.emit('world.inventory', packet);
  }

  GetEntityID_(serverID: string) {
    if (serverID == this.playerID_) {
      return 'player';
    } else {
      return '__npc__' + serverID;
    }
  }
  
  OnMessage_(e: string, d: any) {
    if (e == 'world.player') {
      const spawner = this.FindEntity('spawners').GetComponent(
          'PlayerSpawner');

      const player = spawner.Spawn(d.desc);
      player.Broadcast({
          topic: 'network.update',
          transform: d.transform,
      });

      player.Broadcast({
          topic: 'network.inventory',
          inventory: d.desc.character.inventory,
      });

      console.log('entering world: ' + d.id);
      this.playerID_ = d.id;
    } 
    else if (e == 'world.update') {
      const updates = d;

      const spawner = this.FindEntity('spawners').GetComponent(
          'NetworkEntitySpawner');

      const ui = this.FindEntity('ui').GetComponent('UIController');

      for (let u of updates) {
        const id = this.GetEntityID_(u.id);

        let npc = null;
        if ('desc' in u) {
          npc = spawner.Spawn(id, u.desc);

          npc.Broadcast({
              topic: 'network.inventory',
              inventory: u.desc.character.inventory,
          });
        } else {
          npc = this.FindEntity(id);
        }

        // Translate events, hardcoded, bad, sorry
        let events = [];
        if (u.events) {
          for (let e of u.events) {
            events.push({
                type: e.type,
                target: this.FindEntity(this.GetEntityID_(e.target)),
                attacker: this.FindEntity(this.GetEntityID_(e.attacker)),
                amount: e.amount,
            });
          }
        }

        ui.AddEventMessages(events);

        npc.Broadcast({
            topic: 'network.update',
            transform: u.transform,
            stats: u.stats,
            events: events,
        });
      }
    } else if (e == 'chat.message') {
      this.FindEntity('ui').GetComponent('UIController').AddChatMessage(d);
    } else if (e == 'world.inventory') {
      const id = this.GetEntityID_(d[0]);

      const e = this.FindEntity(id);
      if (!e) {
        return;
      }

      e.Broadcast({
          topic: 'network.inventory',
          inventory: d[1],
      });
    }
  }
};
