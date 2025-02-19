import * as THREE from '../../../three.js';
import { uniform, texture, MeshBasicNodeMaterial, triplanarTexture } from '../../../three.js/examples/jsm/nodes/Nodes';

import { Component } from './components/entity';
import { CubeQuadTree } from './quadtree';
import { TerrainChunkRebuilder_Threaded } from './terrain/terrain-builder-threaded';
import { TextureSplatter } from './texture-splatter';
import { textures } from './textures';
import { utils } from './utils';

import { terrain_constants } from '../shared/terrain-constants';
import { HeightGenerator } from '../shared/terrain-height';
import { NoiseGenerator } from '../shared/noise';


export class TerrainChunkManager extends Component {
    
  _updatedAlready: boolean;
  _params: any;
  _builder: TerrainChunkRebuilder_Threaded;
  heightGenerator_: any;
  _biomes: any;
  _biomesParams: any;
  _colourNoise: any;
  _colourNoiseParams: any;
  _groups: any[];
  _chunks: any;
  _normalTextureAtlas: any;
  _diffuseTextureAtlas: any;

  constructor(params: any) {
    super();
    this._Init(params);
  }

  async _Init(params: any) {
    this._updatedAlready = false;
    this._params = params;

    const loader = new THREE.TextureLoader();

    const noiseTexture = loader.load('./resources/terrain/simplex-noise.png');
    noiseTexture.wrapS = THREE.RepeatWrapping;
    noiseTexture.wrapT = THREE.RepeatWrapping;

    // Note the need to await loading of TextureAtlas before 
    //  TextureNode from nodes system can handle them:
    //  https://github.com/ionox0/BioDynasties/issues/11
    const diffuse = new textures.TextureAtlas(params);
    await diffuse.Load('diffuse', [
      './resources/terrain/dirt_01_diffuse-1024.png',
      './resources/terrain/grass1-albedo3-1024.png',
      './resources/terrain/sandyground-albedo-1024.png',
      './resources/terrain/worn-bumpy-rock-albedo-1024.png',
      './resources/terrain/rock-snow-ice-albedo-1024.png',
      './resources/terrain/snow-packed-albedo-1024.png',
      './resources/terrain/rough-wet-cobble-albedo-1024.png',
      // './resources/terrain/sandy-rocks1-albedo-1024.png',
      './resources/terrain/bark1-albedo.jpg',
    ]);


    const normal = new textures.TextureAtlas(params);
    await normal.Load('normal', [
      './resources/terrain/dirt_01_normal-1024.jpg',
      './resources/terrain/grass1-normal-1024.jpg',
      './resources/terrain/sandyground-normal-1024.jpg',
      './resources/terrain/worn-bumpy-rock-normal-1024.jpg',
      './resources/terrain/rock-snow-ice-normal-1024.jpg',
      './resources/terrain/snow-packed-normal-1024.jpg',
      './resources/terrain/rough-wet-cobble-normal-1024.jpg',
      // './resources/terrain/sandy-rocks1-normal-1024.jpg',
      './resources/terrain/bark1-normal3.jpg',
    ]);

    this._normalTextureAtlas = normal;
    this._diffuseTextureAtlas = diffuse;
    this._builder = new TerrainChunkRebuilder_Threaded(params);

    this._InitNoise();
    this._InitBiomes(params);
    this._InitTerrain(params);
  }

  _InitNoise() {
    this.heightGenerator_ = new HeightGenerator();
  }

  _InitBiomes(params: any) {
    params.guiParams.biomes = {
      octaves: 2,
      persistence: 0.5,
      lacunarity: 2.0,
      scale: 1024.0,
      noiseType: 'simplex',
      seed: 2,
      exponentiation: 2,
      height: 1.0
    };

    const onNoiseChanged = () => {
      this._builder.Rebuild(this._chunks);
    };

    const noiseRollup = params.gui.addFolder('Terrain.Biomes');
    noiseRollup.add(params.guiParams.biomes, "scale", 64.0, 4096.0).onChange(
        onNoiseChanged);
    noiseRollup.add(params.guiParams.biomes, "octaves", 1, 20, 1).onChange(
        onNoiseChanged);
    noiseRollup.add(params.guiParams.biomes, "persistence", 0.01, 1.0).onChange(
        onNoiseChanged);
    noiseRollup.add(params.guiParams.biomes, "lacunarity", 0.01, 4.0).onChange(
        onNoiseChanged);
    noiseRollup.add(params.guiParams.biomes, "exponentiation", 0.1, 10.0).onChange(
        onNoiseChanged);

    this._biomes = new NoiseGenerator(params.guiParams.biomes);
    this._biomesParams = params.guiParams.biomes;

    const colourParams = {
      octaves: 1,
      persistence: 0.5,
      lacunarity: 2.0,
      exponentiation: 1.0,
      scale: 256.0,
      noiseType: 'simplex',
      seed: 2,
      height: 1.0,
    };
    this._colourNoise = new NoiseGenerator(colourParams);
    this._colourNoiseParams = colourParams;
  }

  _InitTerrain(params: any) {
    params.guiParams.terrain= {
      wireframe: false,
    };

    this._groups = [...new Array(6)].map(_ => new THREE.Group());
    params.scene.add(...this._groups);

    const terrainRollup = params.gui.addFolder('Terrain');
    terrainRollup.add(params.guiParams.terrain, "wireframe").onChange(() => {
      for (let k in this._chunks) {
        this._chunks[k].chunk._plane.material.wireframe = params.guiParams.terrain.wireframe;
      }
    });

    this._chunks = {};
    this._params = params;
  }

  _CreateTerrainChunk(group: any, groupTransform: any, offset: any, width: any, resolution: any) {
    const params = {
      group: group,
      transform: groupTransform,
      normalTextureAtlas: this._normalTextureAtlas,
      diffuseTextureAtlas: this._diffuseTextureAtlas,
      width: width,
      offset: offset,
      // origin: this._params.camera.position.clone(),
      radius: terrain_constants.PLANET_RADIUS,
      resolution: resolution,
      biomeGenerator: this._biomes,
      colourGenerator: new TextureSplatter(
          {biomeGenerator: this._biomes, colourNoise: this._colourNoise}),
      heightGenerators: [this.heightGenerator_],
      noiseParams: terrain_constants.NOISE_PARAMS,
      colourNoiseParams: this._colourNoiseParams,
      biomesParams: this._biomesParams,
      colourGeneratorParams: {
        biomeGeneratorParams: this._biomesParams,
        colourNoiseParams: this._colourNoiseParams,
      },
      heightGeneratorsParams: {
        min: 100000,
        max: 100000 + 1,
      }
    };

    return this._builder.AllocateChunk(params);
  }

  GetHeight(pos: { x: any; z: any; }) {
    return this.heightGenerator_.Get(pos.x, 0.0, pos.z);
  }

  GetBiomeAt(pos: { x: any; z: any; }) {
    return this._biomes.Get(pos.x, 0.0, pos.z);
  }

  Update(_: any) {
    const target = this.FindEntity(this._params.target);
    if (!target) {
      return;
    }

    this._builder.Update();
    if (!this._builder.Busy) {
      this._UpdateVisibleChunks_Quadtree(target);
    }

    for (let k in this._chunks) {
      this._chunks[k].chunk.Update(target.Position);
    }
    for (let c of this._builder._old) {
      c.chunk.Update(target.Position);
    }

    // this._params.scattering.uniforms.planetRadius.value = terrain_constants.PLANET_RADIUS;
    // this._params.scattering.uniforms.atmosphereRadius.value = terrain_constants.PLANET_RADIUS * 1.01;
  }

  _UpdateVisibleChunks_Quadtree(target: { Position: any; }) {
    if (this._updatedAlready) { return; }
    this._updatedAlready = true;

    function _Key(c: any) {
      return c.position[0] + '/' + c.position[2] + ' [' + c.size + ']';
    }

    const q = new CubeQuadTree({
      radius: terrain_constants.PLANET_RADIUS,
      min_node_size: terrain_constants.QT_MIN_CELL_SIZE,
    });
    q.Insert(target.Position);

    const sides = q.GetChildren();

    let newTerrainChunks: {[k: string]: any} = {};
    const center = new THREE.Vector3();
    const dimensions = new THREE.Vector3();
    for (let i = 0; i < sides.length; i++) {
      for (let c of sides[i].children) {
        c.bounds.getCenter(center);
        c.bounds.getSize(dimensions);

        const child = {
          index: i,
          group: this._groups[i],
          transform: sides[i].transform,
          position: [center.x, center.y, center.z],
          bounds: c.bounds,
          size: dimensions.x,
        };

        const k = _Key(child);
        newTerrainChunks[k] = child;
      }
    }

    const intersection = utils.DictIntersection(this._chunks, newTerrainChunks);
    const difference = utils.DictDifference(newTerrainChunks, this._chunks);
    const recycle = Object.values(utils.DictDifference(this._chunks, newTerrainChunks));

    this._builder.RetireChunks(recycle);

    newTerrainChunks = intersection;

    for (let k in difference) {
      const [xp, yp, zp] = difference[k].position;

      if (xp > 100 || xp < -100) {
        continue;
      }

      const offset = new THREE.Vector3(xp, yp, zp);
      newTerrainChunks[k] = {
        position: [xp, zp],
        chunk: this._CreateTerrainChunk(
            difference[k].group, difference[k].transform,
            offset, difference[k].size,
            terrain_constants.QT_MIN_CELL_RESOLUTION),
      };
    }

    console.log('chunks:');
    console.log(newTerrainChunks);
    this._chunks = newTerrainChunks;
  }
}
