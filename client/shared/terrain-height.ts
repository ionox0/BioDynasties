import { terrain_constants } from './terrain-constants';
import { NoiseGenerator } from './noise';


export class HeightGenerator {

  noise_: NoiseGenerator;

  constructor() {
    this.noise_ = new NoiseGenerator(terrain_constants.NOISE_PARAMS);
  }

  Get(x: any, y: any, z: any) {
    return [this.noise_.Get(x, y, z), 1];
  }
};
