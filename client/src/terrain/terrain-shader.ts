import { abs, float, vec3, tslFn, vec2, vec4, sin, fract, max, normalize, mul, texture, floor, sub, min, smoothstep, mix, storage, instanceIndex, uint, uv, normalLocal, positionLocal, positionWorld, normalWorld } from '../../../../three.js/examples/jsm/nodes/Nodes';
import StorageInstancedBufferAttribute from '../../../../three.js/examples/jsm/renderers/common/StorageInstancedBufferAttribute';


export function PS(data: any, normalTextureAtlas: any, diffuseTextureAtlas: any, noiseTexture: any ) {

    const TRI_SCALE = float(10.0);

    const diffuseTex = diffuseTextureAtlas.Info['diffuse'].atlas;
    
    const TerrainBlend_4 = (d0: any, d1: any, d2: any, d3: any) => {
        const depth = float( 0.2 ).toVar();
        const ma = float( max( d0.w, max( d1.w, max( d2.w, d3.w ) ) ).sub( depth ) ).toVar();
        const b1 = float( max( d0.w.sub( ma ), 0.0 ) ).toVar();
        const b2 = float( max( d1.w.sub( ma ), 0.0 ) ).toVar();
        const b3 = float( max( d2.w.sub( ma ), 0.0 ) ).toVar();
        const b4 = float( max( d3.w.sub( ma ), 0.0 ) ).toVar();
        const numer = vec4( d0.mul( b1 ).add( d1.mul( b2 ).add( d2.mul( b3 ).add( d3.mul( b4 ) ) ) ) ).toVar();
        const denom = float( b1.add( b2.add( b3.add( b4 ) ) ) ).toVar();
        return numer.div( denom );
    };

    const sum = ( v: any ) => {
        return v.x.add( v.y.add( v.z ) );
    };

    const texture_UV = (x: any) => {
        const k = float(texture(noiseTexture, mul(0.0025, x.xy)).x).toVar();
        const l = float( k.mul( 8.0 ) ).toVar();
        const f = float( fract( l ) ).toVar();
        const ia = float( floor( l.add( 0.5 ) ) ).toVar();
        const ib = float( floor( l ) ).toVar();
        f.assign( min( f, sub( 1.0, f ) ).mul( 2.0 ) );
        const offa = vec2( sin( vec2( 3.0, 7.0 ).mul( ia ) ) ).toVar();
        const offb = vec2( sin( vec2( 3.0, 7.0 ).mul( ib ) ) ).toVar();

        // let coord1 = uv();
        // coord1 = coord1.setX( x.xy.add(offa).x ); 
        // coord1 = coord1.setY( x.xy.add(offa).y ); 
        // let coord2 = uv();
        // coord2 = coord2.setX( x.xy.add(offb).x ); 
        // coord2 = coord2.setY( x.xy.add(offb).y );
        // const cola = vec4(texture(diffuseTex, coord1).depth(x.z)).toVar();
        // const colb = vec4(texture(diffuseTex, coord2).depth(x.z)).toVar();

        const cola = vec4(texture(diffuseTex, x.xy.add(offa).xy).depth(x.z)).toVar();
        const colb = vec4(texture(diffuseTex, x.xy.add(offb).xy).depth(x.z)).toVar();

        return mix(cola, colb, smoothstep(0.2, 0.8, f.sub(mul(0.1, sum(cola.xyz.sub(colb.xyz))))));
    };
    
    const Triplanar_UV = (pos: any, normal: any, texSlice: any) => {
        const dx = vec4(texture_UV(vec3(pos.zy.div(TRI_SCALE), texSlice))).toVar();
        const dy = vec4(texture_UV(vec3(pos.xz.div(TRI_SCALE), texSlice))).toVar();
        const dz = vec4(texture_UV(vec3(pos.xy.div(TRI_SCALE), texSlice))).toVar();
        const weights = vec3( abs( normal.xyz ) ).toVar();
        weights.assign(weights.div(weights.x.add(weights.y.add(weights.z))));
        return dx.mul(weights.x).add(dy.mul(weights.y).add(dz.mul(weights.z)));
    };

    // const positionBufferPadded = new Float32Array( [...data.positions, ...new Float32Array( 200000 ) ] )
    // const colorBufferPadded = new Float32Array( [...data.colours, ...new Float32Array( 200000 ) ] )
    // const normalBufferPadded = new Float32Array( [...data.normals, ...new Float32Array( 200000 ) ] )
    // const coordsBufferPadded = new Float32Array( [...data.coords, ...new Float32Array( 200000 ) ] )
    const weights1BufferPadded = new Float32Array( [...data.weights1, ...new Float32Array( 200000 ) ] )
    const weights2BufferPadded = new Float32Array( [...data.weights2, ...new Float32Array( 200000 ) ] )

    // const positionBuffer = new StorageInstancedBufferAttribute( positionBufferPadded, 3 );
    // const colorBuffer = new StorageInstancedBufferAttribute( colorBufferPadded, 3 );
    // const normalBuffer = new StorageInstancedBufferAttribute( normalBufferPadded, 3 );
    // const coordsBuffer = new StorageInstancedBufferAttribute( coordsBufferPadded, 3 );
    const weights1Buffer = new StorageInstancedBufferAttribute( weights1BufferPadded, 4 );
    const weights2Buffer = new StorageInstancedBufferAttribute( weights2BufferPadded, 4 );

    // const positionBufferNode = storage( positionBuffer, 'vec3', data.positions.length * 3 );
    // const colorBufferNode = storage( colorBuffer, 'vec3', data.colours.length * 3 );
    // const normalBufferNode = storage( normalBuffer, 'vec3', data.normals.length * 3 );
    // const coordsBufferNode = storage( coordsBuffer, 'vec3', data.coords.length * 3 );
    const weights1BufferNode = storage( weights1Buffer, 'vec4', data.weights1.length * 4 );
    const weights2BufferNode = storage( weights2Buffer, 'vec4', data.weights2.length * 4 );

    const main = tslFn( (data: any) => {
        // const index = uint(uv().x.mul(data.weights2.length).floor()).toVar();
        
        // const position = positionBufferNode.element(instanceIndex);
        // const color = colorBufferNode.element(instanceIndex);
        // const normal = normalBufferNode.element(instanceIndex);
        // const coords = coordsBufferNode.element(instanceIndex);
        const weights1 = weights1BufferNode.element(instanceIndex);
        const weights2 = weights2BufferNode.element(instanceIndex);

        // const worldUv = vec3(uv, 1.0).toVar();
        const worldPosition = vec3(positionWorld).toVar();
        const worldSpaceNormal = vec3(normalize(normalWorld)).toVar();
        const weightIndices = vec4(weights1).toVar();
        const weightValues = vec4(weights2).toVar();
        
        const d0 = Triplanar_UV(worldPosition, worldSpaceNormal, weightIndices.element(0));
        d0.w.mulAssign(weightValues.element(0));
        const d1 = Triplanar_UV(worldPosition, worldSpaceNormal, weightIndices.element(1));
        d1.w.mulAssign(weightValues.element(1));
        const d2 = Triplanar_UV(worldPosition, worldSpaceNormal, weightIndices.element(2));
        d2.w.mulAssign(weightValues.element(2));
        const d3 = Triplanar_UV(worldPosition, worldSpaceNormal, weightIndices.element(3));
        d3.w.mulAssign(weightValues.element(3));
        
        const diffuseBlended = vec4(TerrainBlend_4(d0.mul(0.1), d1.mul(1.1), d2.mul(1.1), d3.mul(1.1))).toVar();
        const diffuse = vec3(diffuseBlended.xyz).toVar();
        const finalColour = vec3(diffuse).toVar();

        // return diffuseBlended;
        return vec4(finalColour, 1.0);
    });

    return main(data);

}
