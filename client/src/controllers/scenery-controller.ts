import * as THREE from '../../../../three.js';

import { Entity, Component } from '../components/entity';
import { RenderComponent } from '../render-component';
import { SpatialGridController } from './spatial-grid-controller';

import {math} from '../../shared/math';
import { NoiseGenerator } from '../../shared/noise';


const _SCENERY: any = {
  birch1: {
    base: 'Birch_1.fbx',
    resourcePath: './resources/trees/FBX/',
    names: {
      Bark: 'Birch_Bark.png',
      Leaves: 'Birch_Leaves_Yellow.png'
    },
    scale: 0.075,
    biomes: ['forest'],
    collision: true,
  },
  tree1: {
    base: 'Tree_1.fbx',
    resourcePath: './resources/trees/FBX/',
    names: {
      Bark: 'Tree_Bark.jpg',
      Leaves: 'Leaves_Blue.png'
    },
    scale: 0.1,
    biomes: ['forest'],
    collision: true,
  },
  rock1: {
    base: 'Rock_1.fbx',
    resourcePath: './resources/nature/FBX/',
    names: {},
    scale: 0.025,
    biomes: ['arid', 'desert'],
  },
  rockMoss1: {
    base: 'Rock_Moss_1.fbx',
    resourcePath: './resources/nature/FBX/',
    names: {},
    scale: 0.025,
    biomes: ['forest'],
  },
  plant1: {
    base: 'Plant_1.fbx',
    resourcePath: './resources/nature/FBX/',
    names: {},
    scale: 0.05,
    biomes: ['forest', 'arid'],
  },
  grass1: {
    base: 'Grass_1.fbx',
    resourcePath: './resources/nature/FBX/',
    names: {},
    scale: 0.05,
    biomes: ['forest', 'arid'],
  },
  flowers1: {
    base: 'Flowers.fbx',
    resourcePath: './resources/nature/FBX/',
    names: {},
    scale: 0.05,
    biomes: ['forest'],
  },
};

const _BIOMES = {
  desert: 0.1,
  forest: 0.8,
  arid: 0.6,
};

const multiples: any = {
  birch1: {name: 'Birch_', key: 'birch', num: 10},
  tree1: {name: 'Tree_', key: 'tree', num: 10},
  rock1: {name: 'Rock_', key: 'rock', num: 7},
  rockMoss1: {name: 'Rock_Moss_', key: 'rockMoss', num: 7},
  plant1: {name: 'Plant_', key: 'plant', num: 5},
  grass1: {name: 'Grass_', key: 'grass',  num: 2},
};

for (let k in multiples) {
  for (let i = 2; i < multiples[k].num; ++i) {
    _SCENERY[multiples[k].key + i] = {..._SCENERY[k]};
    _SCENERY[multiples[k].key + i].base = multiples[k].name + i + '.fbx';
  }
}

export class SceneryController extends Component {
  
  params_: any;
  noise_: any;
  center_: any;
  crap_: any[];

  constructor(params: any) {
    super();
    this.params_ = params;

    const noiseParams = {
      octaves: 1,
      persistence: 0.5,
      lacunarity: 2.0,
      exponentiation: 1.0,
      scale: 1.0,
      noiseType: 'simplex',
      seed: 2,
      height: 1.0,
    };
    this.noise_ = new NoiseGenerator(noiseParams);

    this.center_ = null;
    this.crap_ = [];
  }

  InitEntity() {
    this.SpawnClouds_();
  }

  SpawnClouds_() {
    for (let i = 0; i < 20; ++i) {
      const index = math.rand_int(1, 3);
      const pos = new THREE.Vector3(
          (Math.random() * 2.0 - 1.0) * 5000,
          500,
          (Math.random() * 2.0 - 1.0) * 5000);

      const e = new Entity();
      e.AddComponent(new RenderComponent({
        scene: this.params_.scene,
        resourcePath: './resources/nature2/GLTF/',
        resourceName: 'Cloud' + index + '.glb',
        scale: Math.random() * 20 + 40,
        emissive: new THREE.Color(0x000000),
        color: new THREE.Color(0x202020),
      }));
      e.SetPosition(pos);

      const q = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0), math.rand_range(0, 360));
      e.SetQuaternion(q);

      this.Manager.Add(e, null);
      e.SetActive(false);
    }
  }

  FindBiome_(terrain: { GetBiomeAt: (arg0: any) => any; }, pos: { y: number; }) {
    const biome = terrain.GetBiomeAt(pos);

    // HACK: duplicaed code from texture-splatter
    const m = biome;
    const h = math.sat(pos.y / 100.0);

    if (h < 0.05) {
      return 'desert';
    } else if (m > 0.5) {
      return 'forest';
    } else {
      return 'arid';
    }
  }

  SpawnAt_(biome: string, spawnPos: { x: any; z: any; }) {
    const matchingScenery: any = [];
    for (let k in _SCENERY) {
      if (_SCENERY[k as keyof typeof _SCENERY].biomes.indexOf(biome) >= 0) {
        matchingScenery.push(k);
      }
    }

    const roll = this.noise_.Get(spawnPos.x, 3.0, spawnPos.z);
    const randomProp = _SCENERY[
        matchingScenery[Math.round(roll * (matchingScenery.length - 1))]];

    const e = new Entity();
    e.AddComponent(new RenderComponent({
      scene: this.params_.scene,
      resourcePath: randomProp.resourcePath,
      resourceName: randomProp.base,
      textures: {
        resourcePath: './resources/trees/Textures/',
        names: randomProp.names,
        wrap: true,
      },
      emissive: new THREE.Color(0x000000),
      specular: new THREE.Color(0x000000),
      scale: randomProp.scale * (0.8 + this.noise_.Get(spawnPos.x, 4.0, spawnPos.z) * 0.4),
      castShadow: true,
      receiveShadow: true,
      onMaterial: (m: { name: string; alphaTest: number; }) => {
        if (m.name.search('Leaves') >= 0) {
          m.alphaTest = 0.5;
        }
      }
    }));
    if (randomProp.collision) {
      e.AddComponent(
        new SpatialGridController({grid: this.params_.grid})
      );
    }

    const q = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0), this.noise_.Get(spawnPos.x, 5.0, spawnPos.z) * 360);
    e.SetQuaternion(q);

    return e;
  }

  SpawnCrap_() {
    const player = this.FindEntity('player');
    if (!player) {
      return;
    }

    const center = new THREE.Vector3().copy(player.Position);

    center.x = Math.round(center.x / 50.0);
    center.y = 0.0;
    center.z = Math.round(center.z / 50.0);

    if (this.center_ && this.center_.equals(center)) {
      return;
    }

    this.center_ = center;

    const _P = new THREE.Vector3();
    const _V = new THREE.Vector3();
    const terrain = this.FindEntity('terrain').GetComponent('TerrainChunkManager');

    for (let x = -10; x <= 10; ++x) {
      for (let y = -10; y <= 10; ++y) {
        _P.set(x, 0.0, y);
        _P.add(center);
        _P.multiplyScalar(50.0);

        const key = '__scenery__[' + _P.x + '][' + _P.z + ']';
        if (this.FindEntity(key)) {
          continue;
        }

        _V.copy(_P);
        
        _P.x += (this.noise_.Get(_P.x, 0.0, _P.z) * 2.0 - 1.0) * 25.0;
        _P.z += (this.noise_.Get(_P.x, 1.0, _P.z) * 2.0 - 1.0) * 25.0;
        _P.y = terrain.GetHeight(_P)[0];

        const biome = this.FindBiome_(terrain, _P);

        const roll = this.noise_.Get(_V.x, 2.0, _V.z);
        if (roll > _BIOMES[biome]) {
          continue;
        }

        const e = this.SpawnAt_(biome, _P);

        e.SetPosition(_P);

        this.Manager.Add(e, key);

        e.SetActive(false);
        this.crap_.push(e);
      }
    }
  }

  Update(_: any) {
    this.SpawnCrap_();
  }
};
