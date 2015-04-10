/*
   struct quadVertex{
    float3 position;    
    float2 texCoord;
    float size;
    float alpha;
    float3 particlePos;
   }
*/
/// <reference name="copperlicht.js"/>


var quadVertexSize = 40;  //12 + 8 + 4 + 4 + 12 in bytes
var floatQuadVertexSize = 40/4;

Particle = function () {
    this.Position = new CL3D.Vect3d(0,0,0);
    this.Velocity = new CL3D.Vect3d(0, 0, 0);
    this.Size = 0;
    this.Color = 0;
    this.Alpha = 0;
    this.Type = 0;
    this.Life = -1;
    this.Weight = 1;
}

ParticleSystemNode = function (engine, maxParticles, texturefile) {
    this.engine = engine;
    this.maxParticles = maxParticles;
    this.texture = engine.getTextureManager().getTexture(texturefile, true);
    this.baseTime = -1;
    this.particlesToEmit = maxParticles;
    this.emitter = new Emitter();
    this.start = false;   
    this.hPosition = 0;
    this.hTexCoord = 0;
    this.hSize = 0;
    this.hAlpha = 0;
    this.hParticlePos = 0;    
    this.hCamPos = 0;
    this.hCamUp =  0;
    this.hSampler = 0;
    this.hViewProj = null;
    this.program = null;
    var gl = engine.getRenderer().getWebGL();
    this.gl = gl;
    this.force = new CL3D.Vect3d(0, 0, 0);
    this.particleLifeSpand = 1;
    this.particleMinSize = 1;
    this.particleMaxSize= 10;
    this.particleFadeIn = 0;
    this.particleFadeOff = 1;
    this.particleFade = 0.1;
    
    var numVertices = 4 * maxParticles;
    var numFaces = maxParticles * 2;
    this.numVertices = numVertices;
    this.numFaces = numFaces;
    
    // Allocate the buffers
    var quadBuffer = new ArrayBuffer(numVertices * quadVertexSize);
   
    // Map this buffer to a Float32Array to access the positions
    var floatArray = new Float32Array(quadBuffer);
   //Map this buffer to a
   var indexArray = new Uint16Array(6 * maxParticles)

    var texIdx = 3;
    var sizeIdx = 5;
    this.sizeIdx = sizeIdx;
    var size = 5;
    var idx = 0;
    for (var i = 0; i < maxParticles; i++) {
        //top Left
        floatArray[(i * floatQuadVertexSize)]     =-0.5; //x
        floatArray[(i * floatQuadVertexSize) + 1] = 0.5; //y
        floatArray[(i * floatQuadVertexSize) + 2] = 0; //z
        floatArray[(i * floatQuadVertexSize) + texIdx] = 0;        //u
        floatArray[(i * floatQuadVertexSize) + (texIdx + 1)] = 0;  //v
        floatArray[(i * floatQuadVertexSize) + sizeIdx] = size;   //size
        //
        //top Right
        floatArray[((i+1) * floatQuadVertexSize)] = 0.5; //x
        floatArray[((i+1) * floatQuadVertexSize)+1] = 0.5; //y
        floatArray[((i+1) * floatQuadVertexSize)+2] = 0; //z
        floatArray[((i+1) * floatQuadVertexSize) + texIdx] = 1;
        floatArray[((i+1) * floatQuadVertexSize) + (texIdx + 1)] = 0;
        floatArray[((i+1) * floatQuadVertexSize) + sizeIdx] = size;

        //bottom Right
        floatArray[((i+2) * floatQuadVertexSize)] = 0.5; //x
        floatArray[((i+2) * floatQuadVertexSize)+1] = -0.5; //y
        floatArray[((i+2) * floatQuadVertexSize)+2] = 0; //z
        floatArray[((i+2) * floatQuadVertexSize) + texIdx] = 1;
        floatArray[((i+2) * floatQuadVertexSize) + (texIdx + 1)] = 1;
        floatArray[((i+2) * floatQuadVertexSize) + sizeIdx] = size;

        //bottom Left
        floatArray[((i+3) * floatQuadVertexSize)] = -0.5; //x
        floatArray[((i+3) * floatQuadVertexSize)+1] = -0.5; //y
        floatArray[((i+3) * floatQuadVertexSize)+2] = 0; //z
        floatArray[((i+3) * floatQuadVertexSize) + texIdx] = 0;
        floatArray[((i+3) * floatQuadVertexSize) + (texIdx + 1)] = 1;
        floatArray[((i+3) * floatQuadVertexSize) + sizeIdx] = size;

        
        var startIndex = i * 4; //each particle have four vertices
//        indexArray[idx++] = startIndex + 0;
//        indexArray[idx++] = startIndex + 1;
//        indexArray[idx++] = startIndex + 2;
//        indexArray[idx++] = startIndex + 0;
//        indexArray[idx++] = startIndex + 2;
//        indexArray[idx++] = startIndex + 3;

        //Face 1
        indexArray[idx++] = startIndex+3;
        indexArray[idx++] = startIndex+1;
        indexArray[idx++] = startIndex;

        //Face2
        indexArray[idx++] = startIndex+3;
        indexArray[idx++] = startIndex+2;
        indexArray[idx++] = startIndex+1;

    }

    this.quadBuffer = quadBuffer;   
    this.floatArray = floatArray;

    //create the point sprite vertex buffer
    this.vb = gl.createBuffer();
    this.ib = gl.createBuffer();
    
    //set the size of the vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vb);
    gl.bufferData(gl.ARRAY_BUFFER, quadBuffer, gl.DYNAMIC_DRAW);

    //set the size of the index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexArray, gl.STATIC_DRAW);

    this.initParticles();  
}

ParticleSystemNode.prototype =new CL3D.SceneNode(); // derivate from SceneNode

ParticleSystemNode.prototype.OnRegisterSceneNode = function (scene) {
    scene.registerNodeForRendering(this, CL3D.Scene.RENDER_MODE_DEFAULT);
    CL3D.SceneNode.prototype.OnRegisterSceneNode.call(this, scene); // call base class
}

///@private
ParticleSystemNode.prototype.initParticles = function(){
     this.particles = new Array(this.maxParticles);
     for (var i = 0; i < this.particles.length; i++) {
        this.particles[i] = new Particle();
     }
}

ParticleSystemNode.prototype.OnAnimate = function (scene, currentTime) {
    //Advance system (update particles)
    if (this.baseTime < 0)
	  this.baseTime = currentTime;

    var deltaT = 1/60;

    if(this.start){		
	this.emitParticles();			
    }
    this.updateParticles(deltaT);

}

ParticleSystemNode.prototype.render = function (renderer) {
    //Render particles billboards
    if(!this.start) return;
	
    var floatArray = this.floatArray;
    var ptcPosIdx = 7;
    var alphaIdx = 6;
    var sizeIdx = this.sizeIdx;
    for (var i = 0; i < this.maxParticles; i++) {
        var ptc = this.particles[i];
        if(ptc.Life >= 0){
            floatArray[(i * floatQuadVertexSize) + ptcPosIdx] = ptc.Position.X;     //x
            floatArray[(i * floatQuadVertexSize)+ ptcPosIdx + 1] = ptc.Position.Y; //y
            floatArray[(i * floatQuadVertexSize)+ ptcPosIdx + 2] = ptc.Position.Z; //z
            floatArray[(i * floatQuadVertexSize) + sizeIdx]= ptc.Size;
            floatArray[(i * floatQuadVertexSize) + alphaIdx] = ptc.Alpha;

            floatArray[((i+1) * floatQuadVertexSize) + ptcPosIdx] = ptc.Position.X;    //x
            floatArray[((i+1) * floatQuadVertexSize) + ptcPosIdx + 1] = ptc.Position.Y; //y
            floatArray[((i+1) * floatQuadVertexSize) + ptcPosIdx + 2] = ptc.Position.Z; //z
            floatArray[((i+1) * floatQuadVertexSize) + sizeIdx]= ptc.Size;
            floatArray[((i+1) * floatQuadVertexSize) + alphaIdx] = ptc.Alpha;

            floatArray[((i+2) * floatQuadVertexSize) + ptcPosIdx] = ptc.Position.X;     //x
            floatArray[((i+2) * floatQuadVertexSize) + ptcPosIdx + 1] = ptc.Position.Y; //y
            floatArray[((i+2) * floatQuadVertexSize) + ptcPosIdx + 2] = ptc.Position.Z; //z
            floatArray[((i+2) * floatQuadVertexSize) + sizeIdx]= ptc.Size;
            floatArray[((i+2) * floatQuadVertexSize) + alphaIdx] = ptc.Alpha;

            floatArray[((i+3) * floatQuadVertexSize)+ ptcPosIdx] = ptc.Position.X;     //x
            floatArray[((i+3) * floatQuadVertexSize) + ptcPosIdx + 1] = ptc.Position.Y; //y
            floatArray[((i+3) * floatQuadVertexSize) + ptcPosIdx + 2] = ptc.Position.Z; //z
            floatArray[((i+3) * floatQuadVertexSize) + sizeIdx]= ptc.Size;
            floatArray[((i+3) * floatQuadVertexSize) + alphaIdx] = ptc.Alpha;
        }
    }   

    var gl = this.gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);    
    gl.disable(gl.CULL_FACE);

    var program = this.program;

    //set the shader program
    gl.useProgram(program); 

     //set uniforms
     var up = cam.getUpVector();
     var view = renderer.getView();
     var proj = renderer.getProjection();
     gl.uniform3f(this.hCamPos,cam.Pos.X,cam.Pos.Y,cam.Pos.Z);
     gl.uniform3f(this.hCamUp,up.X,up.Y,up.Z);
     gl.uniformMatrix4fv(this.hView, false, new Float32Array(view.asArray()));
     gl.uniformMatrix4fv(this.hProj, false, new Float32Array(proj.asArray()));

    //set texture
     var glTex = this.texture.getWebGLTexture();
     gl.activeTexture(gl.TEXTURE0);
     gl.bindTexture(gl.TEXTURE_2D, glTex);
     gl.uniform1i(this.hSampler, 0);

 // set the vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vb);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.quadBuffer);
   
    //set the vertex attribute (vertex declaration)
     var sizeofFloat = 4;
     var stride = sizeofFloat * floatQuadVertexSize;    
     gl.vertexAttribPointer(this.hPosition, 3, gl.FLOAT, false, stride, 0);
     gl.enableVertexAttribArray(this.hPosition);

     gl.vertexAttribPointer(this.hTexCoord, 2, gl.FLOAT, false, stride, 3 * sizeofFloat);
     gl.enableVertexAttribArray(this.hTexCoord);

     gl.vertexAttribPointer(this.hSize, 1, gl.FLOAT, false, stride, 5 * sizeofFloat);
     gl.enableVertexAttribArray(this.hSize);
     
     gl.vertexAttribPointer(this.hAlpha, 1, gl.FLOAT, false, stride, 6 * sizeofFloat);
     gl.enableVertexAttribArray(this.hAlpha);

     gl.vertexAttribPointer(this.hParticlePos, 3, gl.FLOAT, false, stride, 7 * sizeofFloat);
     gl.enableVertexAttribArray(this.hParticlePos);

     //set index buffer
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ib);

     //draw indexed geometry
     gl.drawElements(gl.TRIANGLES, this.maxParticles * 6, gl.UNSIGNED_SHORT,0);
     
     gl.disableVertexAttribArray(this.hPosition);
     gl.disableVertexAttribArray(this.hTexCoord);
     gl.disableVertexAttribArray(this.hSize);
     gl.disableVertexAttribArray(this.hAlpha);
     gl.disableVertexAttribArray(this.hParticlePos);

      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.enable(gl.CULL_FACE);
}

///@private
ParticleSystemNode.prototype.emitParticles = function () { 
        for (var i = 0; i < this.particles.length && this.particlesToEmit > 0; i++) {
            this.emitter.emitParticle(this.particles[i]);
            this.particlesToEmit--;
        }
    }
///@private
ParticleSystemNode.prototype.updateParticles = function (deltaT) {

        var force = this.force;
        var particleLifeSpand = this.particleLifeSpand;
        var particleMinSize = this.particleMinSize;
        var particleMaxSize = this.particleMaxSize;
        var particleFadeIn = this.particleFadeIn;
        var particleFadeOff = this.particleFadeOff;
        var particleFade = this.particleFade;
        var stepIn = 0;
        var count = 0;
        for (var i = 0; i < this.particles.length; i++) {
            var ptc = this.particles[i];
            if(ptc.Life > 1){
                ptc.Life = -1;
                count++;
            }
            if(ptc.Life >= 0){
                var acceleration = force.multiplyWithScal(1.0 / ptc.Weight);
                ptc.Velocity.addToThis(acceleration.multiplyWithScal(deltaT));
                ptc.Position.addToThis(ptc.Velocity.multiplyWithScal(deltaT));
                ptc.Life += particleLifeSpand > 0 ? deltaT / particleLifeSpand : 0;
                ptc.Size = particleMinSize + ptc.Life * (particleMaxSize - particleMinSize);
                ptc.Alpha = particleFadeIn < 0 ? 1.0 : 0.0;

                if (ptc.Life >= particleFadeIn) {
                    stepIn = ptc.Life - particleFadeIn;
                    ptc.Alpha = Math.min(1, stepIn / particleFade);
                }
                if (particleFadeOff > 0 && ptc.Life >= particleFadeOff) {
                    stepIn = Math.max(0, ptc.Life - particleFadeOff);
                    ptc.Alpha = 1 - Math.min(1, stepIn / particleFade);
                }
            }
        }

        if(count == this.maxParticles)
            this.reset();
    }

ParticleSystemNode.prototype.reset = function () {
    this.particlesToEmit = this.maxParticles;
    this.start = false;
    this.baseTime = -1;
}
///@public
ParticleSystemNode.prototype.setShaders = function(vs_src, fs_src){
    var gl = this.gl;
    //create the vertex shader
    var vs = this.createShader(gl.VERTEX_SHADER, vs_src);
    if(vs == null) return;
    
    //create fragment shader
    var fs = this.createShader(gl.FRAGMENT_SHADER, fs_src);
    if(fs == null) return;

    var program = gl. createProgram();
    program.vs = vs;
    program.ps = fs;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      alert("Could not initialise shaders");
    }

    // get vertex attribute registers
    this.hPosition = gl.getAttribLocation(program, "vPosition");
    this.hTexCoord = gl.getAttribLocation(program, "vTexCoord");
    this.hSize = gl.getAttribLocation(program, "fSize");
    this.hAlpha = gl.getAttribLocation(program, "fAlpha");
    this.hParticlePos = gl.getAttribLocation(program, "fParticlePos");

    //get uniforms  registers
    this.hCamPos = gl.getUniformLocation(program, "camPos");
    this.hCamUp =  gl.getUniformLocation(program, "camUp");
    this.hSampler = gl.getUniformLocation(program, "s0");
    this.hView = gl.getUniformLocation(program, "view");
    this.hProj = gl.getUniformLocation(program, "proj");
    
    this.program = program;    
   
}
ParticleSystemNode.prototype.startSystem = function(){
    this.start = true;  
    this.baseTime = -1;
}

///@private
ParticleSystemNode.prototype.createShader = function(shaderType, src){
    var gl = this.gl;
    var shader = gl.createShader(shaderType);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          alert(gl.getShaderInfoLog(shader));
          return null;
    }
    return shader;
}

Emitter = function (){
    this.emitPosition = new CL3D.Vect3d(0, 0, 0); // vec3d
    this.linearVelocity = 0; // float
    this.emitDirection = new Spherical(0, 0); // spherical
    this.emitDirectionWindow = new Spherical(0, 0); //spherical
    this.radius = 1;
}
Emitter.prototype = {    
    emitParticle: function (ptc) {
        var jitHeading = -this.emitDirectionWindow.Phi + Math.random() * (2 * this.emitDirectionWindow.Phi);
        var jitPith = -this.emitDirectionWindow.Theta + Math.random() * (2 * this.emitDirectionWindow.Theta);
        var direction = Spherical.toCartesian(this.emitDirection.Theta + jitPith, this.emitDirection.Phi + jitHeading);

        ptc.Life = 0;
        ptc.Velocity = direction.multiplyWithScal(this.linearVelocity);
        direction.multiplyThisWithScal(this.radius);
        ptc.Position = this.emitPosition.add(direction);
    }
}
