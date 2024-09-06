import { Component } from '../components/entity';


export class SpatialGridController extends Component {

  grid_: any;
  client_: any;

  constructor(params: { grid: any; }) {
    super();

    this.grid_ = params.grid;
  }

  Destroy() {
    this.grid_.Remove(this.client_);
    this.client_ = null;
  }

  InitComponent() {
    const pos = [
        this.parent_._position.x,
        this.parent_._position.z,
    ];

    this.client_ = this.grid_.NewClient(pos, [1, 1]);
    this.client_.entity = this.parent_;
    this._RegisterHandler('update.position', (m: { value: { x: any; z: any; }; }) => this._OnPosition(m));
  }

  _OnPosition(msg: { value: { x: any; z: any; }; }) {
    this.client_.position = [msg.value.x, msg.value.z];
    this.grid_.UpdateClient(this.client_);
  }

  FindNearbyEntities(range: any) {
    const results = this.grid_.FindNear(
        [this.parent_._position.x, this.parent_._position.z], [range, range]);
        
    return results.filter((c: { entity: null; }) => c.entity != this.parent_);
  }
};
