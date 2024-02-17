import { Component } from './entity';


export class InventoryDatabaseController extends Component {

  items_: {[name: string | number]: InventoryItem};

  constructor() {
    super();

    this.items_ = {};
  }

  AddItem(name: string | number, item: any) {
    this.items_[name] = item;
  }

  Find(name: string | number) {
    return this.items_[name];
  }
};

export class UIInventoryController extends Component {
  
  inventory_: any;

  constructor() {
    super();
  }

  InitEntity() {
    this._RegisterHandler('inventory.updated', () => this.OnInventoryUpdated_());

    this.inventory_ = this.GetComponent('InventoryController');

    const _SetupElement = (n: string) => {
      const element = document.getElementById(n);
      element.ondragstart = (ev) => {
        ev.dataTransfer.setData('text/plain', n);
      };
      element.ondragover = (ev) => {
        ev.preventDefault();
      };
      element.ondrop = (ev) => {
        ev.preventDefault();
        const data = ev.dataTransfer.getData('text/plain');
        const other = document.getElementById(data);
  
        this.OnItemDropped_(other, element);
      };
    }

    for (let k in this.inventory_.Inventory) {
      _SetupElement(k);
    }
  }

  OnInventoryUpdated_() {
    const items = this.inventory_.Inventory;
    for (let k in items) {
      this.SetItemAtSlot_(k, items[k].value);
    }
  }

  OnItemDropped_(oldElement: HTMLElement, newElement: HTMLElement) {
    const oldItem = this.inventory_.Inventory[oldElement.id];
    const newItem = this.inventory_.Inventory[newElement.id];

    const oldValue = oldItem.value;
    const newValue = newItem.value;

    this.SetItemAtSlot_(oldElement.id, newValue);
    this.SetItemAtSlot_(newElement.id, oldValue);

    this.inventory_.SetItemAtSlot_(oldElement.id, newValue);
    this.inventory_.SetItemAtSlot_(newElement.id, oldValue);
  }

  GetItemDefinition_(name: any) {
    const database = this.FindEntity('database').GetComponent(
        'InventoryDatabaseController');
    return database.Find(name);
  }

  SetItemAtSlot_(slot: string, itemName: any) {
    const div = document.getElementById(slot);
    const item = this.GetItemDefinition_(itemName);
    if (item) {
      const path = './resources/icons/weapons/' + item.renderParams.icon;
      div.style.backgroundImage = "url('" + path + "')";
    } else {
      div.style.backgroundImage = '';
    }
  }
};


export class InventoryController extends Component {

  inventory_: any;

  constructor() {
    super();

    this.inventory_ = this.CreateEmpty_();
  }

  CreateEmpty_() {
    const inventory: any = {};

    for (let i = 1; i <= 24; ++i) {
      inventory['inventory-' + i] = {
        type: 'inventory',
        value: null,
      };
    }

    for (let i = 1; i <= 8; ++i) {
      inventory['inventory-equip-' + i] = {
        type: 'equip',
        value: null,
      };
    }

    return inventory;
  }

  get Inventory() {
    return this.inventory_;
  }

  InitComponent() {
    // Hack
    this._RegisterHandler('network.inventory', (m: any) => this.OnNetworkUpdate_(m));
  }

  OnNetworkUpdate_(msg: { inventory: { [x: string]: any; }; }) {
    const inventory = this.CreateEmpty_();
    for (let k in msg.inventory) {
      inventory[k].value = msg.inventory[k];
    }

    let changed = false;
    for (let k in inventory) {
      if (inventory[k].value != this.inventory_[k].value) {
        this.SetItemAtSlot_(k, inventory[k].value);
      }
    }

    if (inventory) {
      this.Broadcast({
          topic: 'inventory.updated'
      });
    }
  }

  CreatePacket() {
    // Meh
    const packet: any = {};
    for (let k in this.inventory_) {
      if (this.inventory_[k].value) {
        packet[k] = this.inventory_[k].value;
      }
    }
    return packet;
  }

  GetItemDefinition_(name: any) {
    const database = this.FindEntity('database').GetComponent(
        'InventoryDatabaseController');
    return database.Find(name);
  }

  SetItemAtSlot_(slot: string, itemName: any) {
    const oldValue = this.inventory_[slot].value;

    this.inventory_[slot].value = itemName;

    if (this.inventory_[slot].type == 'equip' && oldValue != itemName) {
      this.Broadcast({
          topic: 'inventory.equip',
          value: itemName,
      });
    }
  }

  GetItemByName(name: string) {
    for (let k in this.inventory_) {
      if (this.inventory_[k].value == name) {
        return this.FindEntity(name);
      }
    }
    return null;
  }
};


export class InventoryItem extends Component {
  _params: any;
  constructor(params: any) {
    super();
    this._params = params;
  }

  InitComponent() {}

  get Params() {
    return this._params;
  }

  get RenderParams() {
    return this._params.renderParams;
  }
};
