import * as THREE from '../../../three.js';

import { Component } from "./entity";
import WebGPURenderer from '../../../three.js/examples/jsm/renderers/webgpu/WebGPURenderer.js';

import PostProcessing from '../../../three.js/examples/jsm/renderers/common/PostProcessing.js';
import { pass } from '../../../three.js/examples/jsm/nodes/Nodes';


const _VS = `
  varying vec3 vWorldPosition;
  
  void main() {
    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
    vWorldPosition = worldPosition.xyz;
  
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }`;
  
  
const _FS = `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  uniform float offset;
  uniform float exponent;
  uniform samplerCube background;
  
  varying vec3 vWorldPosition;
  
  void main() {
    vec3 viewDirection = normalize(vWorldPosition - cameraPosition);
    vec3 stars = textureCube(background, viewDirection).xyz;
  
    float h = normalize(vWorldPosition + offset).y;
    float t = max(pow(max(h, 0.0), exponent), 0.0);
  
    float f = exp(min(0.0, -vWorldPosition.y * 0.00125));
  
    vec3 sky = mix(stars, bottomColor, f);
    gl_FragColor = vec4(sky, 1.0);
  }`;

  
export class ThreeJSController extends Component {
  
  threejs_: any;
  camera_: any;
  scene_: any;
  sun_: any;
  postProcessing: PostProcessing;

  constructor() {
    super();
  }

  InitEntity() {
    THREE.ShaderChunk.fog_fragment = `
    #ifdef USE_FOG
      vec3 fogOrigin = cameraPosition;
      vec3 fogDirection = normalize(vWorldPosition - fogOrigin);
      float fogDepth = distance(vWorldPosition, fogOrigin);

      fogDepth *= fogDepth;

      float heightFactor = 0.05;
      float fogFactor = heightFactor * exp(-fogOrigin.y * fogDensity) * (
          1.0 - exp(-fogDepth * fogDirection.y * fogDensity)) / fogDirection.y;
      fogFactor = saturate(fogFactor);

      gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
    #endif`;
    
    THREE.ShaderChunk.fog_pars_fragment = `
    #ifdef USE_FOG
      uniform float fogTime;
      uniform vec3 fogColor;
      varying vec3 vWorldPosition;
      #ifdef FOG_EXP2
        uniform float fogDensity;
      #else
        uniform float fogNear;
        uniform float fogFar;
      #endif
    #endif`;
    
    THREE.ShaderChunk.fog_vertex = `
    #ifdef USE_FOG
      vWorldPosition = (modelMatrix * vec4(transformed, 1.0 )).xyz;
    #endif`;
    
    THREE.ShaderChunk.fog_pars_vertex = `
    #ifdef USE_FOG
      varying vec3 vWorldPosition;
    #endif`;

    this.threejs_ = new WebGPURenderer({
      antialias: false,
    });
    // this.threejs_.outputEncoding = THREE.sRGBEncoding;
    this.threejs_.gammaFactor = 2.2;
    this.threejs_.shadowMap.enabled = true;
    this.threejs_.shadowMap.type = THREE.PCFSoftShadowMap;
    this.threejs_.setPixelRatio(window.devicePixelRatio);
    this.threejs_.setSize(window.innerWidth, window.innerHeight);
    this.threejs_.domElement.id = 'threejs';

    document.getElementById('container').appendChild(this.threejs_.domElement);

    window.addEventListener('resize', () => {
      this._OnWindowResize();
    }, false);

    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 10000.0;
    this.camera_ = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera_.position.set(-25, 10, 25);

    this.scene_ = new THREE.Scene();

    const scenePass = pass(this.scene_, this.camera_);
    const scenePassColor = scenePass.getTextureNode();
    const scenePassDepth = scenePass.getDepthNode().remapClamp(0.15, 0.3);

    const scenePassColorBlurred = scenePassColor.gaussianBlur();
    scenePassColorBlurred.directionNode = scenePassDepth;

    this.postProcessing = new PostProcessing(this.threejs_);
    this.postProcessing.outputNode = scenePassColorBlurred;

    // lights
    const centerLight = new THREE.PointLight( 0xff9900, 1, 100 );
    // centerLight.position.y = 4.5;
    // centerLight.position.z = - 2;
    centerLight.power = 400;
    this.scene_.add( centerLight );

    const cameraLight = new THREE.PointLight( 0x0099ff, 1, 100 );
    cameraLight.power = 400;
    this.camera_.add( cameraLight );

    this.scene_.fog = new THREE.FogExp2(0x89b2eb, 0.00002);

    let light = new THREE.DirectionalLight(0x8088b3, 0.7);
    light.position.set(-10, 500, 10);
    light.target.position.set(0, 0, 0);
    // Note: shadows destroy performance of GPU birds
    // light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 1000.0;
    light.shadow.camera.left = 100;
    light.shadow.camera.right = -100;
    light.shadow.camera.top = 100;
    light.shadow.camera.bottom = -100;
    this.scene_.add(light);
    this.sun_ = light;

    this.LoadSky_();
  }
  _OnWindowResize() {
    throw new Error('Method not implemented.');
  }

  LoadSky_() {
    const hemiLight = new THREE.HemisphereLight(0x424a75, 0x6a88b5, 0.7);
    hemiLight.color.setHSL(0.6, 1, 0.4);
    hemiLight.groundColor.setHSL(0.095, 1, 0.5);
    this.scene_.add(hemiLight);


    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
        './resources/terrain/space-posx.jpg',
        './resources/terrain/space-negx.jpg',
        './resources/terrain/space-posy.jpg',
        './resources/terrain/space-negy.jpg',
        './resources/terrain/space-posz.jpg',
        './resources/terrain/space-negz.jpg',
    ]);
    // texture.encoding = THREE.sRGBEncoding;

    const uniforms = {
      "topColor": { value: new THREE.Color(0x000000) },
      "bottomColor": { value: new THREE.Color(0x5d679e) },
      "offset": { value: -500 },
      "exponent": { value: 0.3 },
      "background": { value: texture },
    };
    // uniforms["topColor"].value.copy(hemiLight.color);

    this.scene_.fog.color.copy(uniforms["bottomColor"].value);


    const skyGeo = new THREE.SphereGeometry(5000, 32, 15);
    const skyMat = new THREE.MeshBasicMaterial({
        uniforms: uniforms,
        vertexShader: _VS,
        fragmentShader: _FS,
        side: THREE.BackSide
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene_.add(sky);
  }

  Update(_: any) {
    const player = this.FindEntity('player');
    if (!player) {
      return;
    }
    const pos = player._position;

    this.sun_.position.copy(pos);
    this.sun_.position.add(new THREE.Vector3(-50, 200, -10));
    this.sun_.target.position.copy(pos);
    this.sun_.updateMatrixWorld();
    this.sun_.target.updateMatrixWorld();
  }
}
