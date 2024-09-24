import * as THREE from '../../../three.js';


export const textures = (function() {

  // Taken from https://github.com/mrdoob/three.js/issues/758
  function _GetImageData( image: any ) {
    var canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    var context = canvas.getContext('2d');
    context.drawImage( image, 0, 0 );

    return context.getImageData( 0, 0, image.width, image.height );
  }

  return {
    TextureAtlas: class {

      onLoad: any;
      _threejs: any;
      _manager: THREE.LoadingManager;
      _loader: THREE.TextureLoader;
      _textures: {[k: string]: any};

      constructor(params: { threejs: any; }) {
        this._threejs = params.threejs;
        this._Create();
        this.onLoad = () => {};
      }

      Load(atlas: string, names: string[]) {
        this._LoadAtlas(atlas, names);
      }

      _Create() {
        this._manager = new THREE.LoadingManager();
        this._loader = new THREE.TextureLoader(this._manager);
        this._textures = {};

        this._manager.onLoad = () => {
          this._OnLoad();
        };
      }

      get Info() {
        return this._textures;
      }

      _LoadTexture(n: any) {
        const t = this._loader.load(n);
        t.encoding = THREE.LinearSRGBColorSpace;
        return t;
      }

      _OnLoad() {
        for (let k in this._textures) {
          const atlas = this._textures[k];
          const data = new Uint8Array(atlas.textures.length * 4 * 1024 * 1024);

          for (let t = 0; t < atlas.textures.length; t++) {
            const curTexture = atlas.textures[t];
            const curData = _GetImageData(curTexture.image);
            const offset = t * (4 * 1024 * 1024);

            data.set(curData.data, offset);
          }
    
          const diffuse = new THREE.DataArrayTexture(data, 1024, 1024, atlas.textures.length);
          diffuse.format = THREE.RGBAFormat;
          diffuse.type = THREE.UnsignedByteType;
          diffuse.minFilter = THREE.LinearMipMapLinearFilter;
          diffuse.magFilter = THREE.LinearFilter;
          diffuse.wrapS = THREE.RepeatWrapping;
          diffuse.wrapT = THREE.RepeatWrapping;
          diffuse.generateMipmaps = true;
          diffuse.needsUpdate = true;

          // const caps = this._threejs.capabilities;
          // const aniso = caps.getMaxAnisotropy();

          diffuse.anisotropy = 4;
          atlas.atlas = diffuse;
        }

        this.onLoad();
      }

      _LoadAtlas(atlas: string | number, names: any[]) {
        this._textures[atlas] = {
          textures: names.map((n: any) => this._LoadTexture(n) ),
          atlas: null,
        };
      }
    }
  };
})();
