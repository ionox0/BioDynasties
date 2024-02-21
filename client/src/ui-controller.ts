import { Component } from './entity';


export class UIController extends Component {
  
  _params: any;
  _quests: any;
  iconBar_: any;
  _ui: any;
  chatElement_: any;

  constructor(params: any) {
    super();
    this._params = params;
    this._quests = {};
  }

  InitComponent() {
    this.chatElement_ = document.getElementById('chat-input');
    this.chatElement_.addEventListener('keydown', (e: KeyboardEvent) => this.OnChatKeyDown_(e), false);
  }

  FadeoutLogin() {
    const loginElement = document.getElementById('login-ui');
    if (loginElement.classList.contains('fadeOut')) {
      return;
    }

    loginElement.classList.toggle('fadeOut');
    document.getElementById('game-ui').style.visibility = 'visible';
  }  
  
  OnChatKeyDown_(evt: KeyboardEvent) {
    if (evt.keyCode === 13) {
      evt.preventDefault();
      const msg = this.chatElement_.value;
      if (msg != '') {
        const net = this.FindEntity('network').GetComponent(
            'NetworkController');
        net.SendChat(msg);
      }
      this.chatElement_.value = '';
    }
    evt.stopPropagation();
  }

  AddEventMessages(events: any) {
    for (let e of events) {
      if (e.type != 'attack') {
        continue;
      }
      if (e.attacker.Name != 'player' && e.target.Name != 'player') {
        continue;
      }

      const attackerName = e.attacker.Name == 'player' ? 'You' : e.attacker.Account.name;
      const targetName = e.target.Name == 'player' ? 'you' : e.target.Account.name;

      this.AddChatMessage({
          name: '',
          text: attackerName + ' hit ' + targetName + ' for ' + e.amount + ' damage!',
          action: true,
      });
    }
  }

  AddChatMessage(msg: { name: any; text: any; action: any; server?: any; }) {
    const e = document.createElement('div');
    e.className = 'chat-text';
    if (msg.server) {
      e.className += ' chat-text-server';
    } else if (msg.action) {
      e.className += ' chat-text-action';
    } else {
      e.innerText = '[' + msg.name + ']: ';
    }
    e.innerText += msg.text;
    const chatElement = document.getElementById('chat-ui-text-area');
    chatElement.insertBefore(e, document.getElementById('chat-input'));
  }

  HideUI_() {}

  Update(timeInSeconds: any) {}
};
