import { TerrainChunk } from './terrain-chunk';


export class TerrainChunkRebuilder {

  _pool: any
  _params: any;
  _queued: any;
  _old: any;
  _active: any;
  _new: any[];
  
  constructor(params: any) {
    this._pool = {};
    this._params = params;
    this._Reset();
  }

  AllocateChunk(params: { width: any; }) {
    const w = params.width;

    if (!(w in this._pool)) {
      this._pool[w] = [];
    }

    let c = null;
    if (this._pool[w].length > 0) {
      c = this._pool[w].pop();
      c._params = params;
    } else {
      c = new TerrainChunk(params);
    }

    c.Hide();

    this._queued.push(c);

    return c;    
  }

  RetireChunks(chunks: any) {
    this._old.push(...chunks);
  }

  _RecycleChunks(chunks: any) {
    for (let c of chunks) {
      if (!(c.chunk._params.width in this._pool)) {
        this._pool[c.chunk._params.width] = [];
      }

      c.chunk.Destroy();
    }
  }

  _Reset() {
    this._active = null;
    this._queued = [];
    this._old = [];
    this._new = [];
  }

  get Busy() {
    return this._active || this._queued.length > 0;
  }

  Rebuild(chunks: { [x: string]: { chunk: any; }; }) {
    if (this.Busy) {
      return;
    }
    for (let k in chunks) {
      this._queued.push(chunks[k].chunk);
    }
  }

  Update() {
    if (this._active) {
      const r = this._active.next();
      if (r.done) {
        this._active = null;
      }
    } else {
      const b = this._queued.pop();
      if (b) {
        this._active = b._Rebuild();
        this._new.push(b);
      }
    }

    if (this._active) {
      return;
    }

    if (!this._queued.length) {
      this._RecycleChunks(this._old);
      for (let b of this._new) {
        b.Show();
      }
      this._Reset();
    }
  }
}
