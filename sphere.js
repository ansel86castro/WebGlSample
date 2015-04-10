/// <reference name="copperlicht.js"/>

// our own scene node implementation
SphereSceneNode = function (engine, stacks, slices, radius, texturefile) {
    this.init();  // init scene node specific members

    this.stacks = stacks;
    this.slices = slices;
    this.radius = radius;
    this.Velocity = new CL3D.Vect3d(0, 0, 0);

    // create a 3d mesh with one mesh buffer

    this.MyMesh = new CL3D.Mesh();
    var buf = new CL3D.MeshBuffer();
    this.MyMesh.AddMeshBuffer(buf);

    // set indices and vertices
    this.fillBuffer(buf, stacks, slices, radius);

    // set the texture of the material
    buf.Mat.Tex1 = engine.getTextureManager().getTexture(texturefile, true);
    this.setMesh(this.MyMesh);
}

SphereSceneNode.prototype = new CL3D.MeshSceneNode(); // derive from SceneNode

SphereSceneNode.prototype.OnRegisterSceneNode = function(scene){
        scene.registerNodeForRendering(this, CL3D.Scene.RENDER_MODE_DEFAULT);
        CL3D.SceneNode.prototype.OnRegisterSceneNode.call(this, scene); // call base class
}

SphereSceneNode.prototype.render = function(renderer){
        renderer.setWorld(this.getAbsoluteTransformation());
        renderer.drawMesh(this.MyMesh);
}

SphereSceneNode.prototype.fillBuffer = function fillBuffer(buff ,stacks , slices ,radius){		
        var vertices =  new Array((stacks - 1) * (slices + 1) + 2);
        var indices = new Array((stacks - 2) * slices * 6 + slices * 6);

        var phiStep = Math.PI / stacks;
        var thetaStep = 2.0 * Math.PI / slices;
        // do not count the poles as rings
        var numRings = stacks - 1;

        // Compute vertices for each stack ring.
        var k = 0;
        for (var i = 1; i <= numRings; ++i){
                var phi = i * phiStep;
                // vertices of ring
                for (var j = 0; j <= slices; ++j){
                        var theta = j * thetaStep;
                        var v = new CL3D.Vertex3D(true);
                        // spherical to cartesian
                        v.Pos = sphericalToCartesian(phi, theta, radius);
                        v.Normal = v.Pos.getNormalized();
                        v.TCoords = new CL3D.Vect3d(1.0 - theta / (2.0 * Math.PI), phi / Math.PI,0);

                        vertices[k++] = v;
                }
        }

        var northPoleIndex = vertices.length - 1;
        var southPoleIndex = vertices.length - 2;

        // poles: note that there will be texture coordinate distortion
        vertices[southPoleIndex] = new CL3D.Vertex3D(true);
        vertices[southPoleIndex].Pos = new CL3D.Vect3d(0.0, -radius, 0.0);
        vertices[southPoleIndex].Normal = new CL3D.Vect3d(0.0, -1.0, 0.0);
        vertices[southPoleIndex].TCoords = new CL3D.Vect3d(0.0, 1.0,0);

        vertices[northPoleIndex] = new CL3D.Vertex3D(true);
        vertices[northPoleIndex].Pos = new CL3D.Vect3d(0.0, radius, 0.0);
        vertices[northPoleIndex].Normal = new CL3D.Vect3d(0.0, 1.0, 0.0);
        vertices[northPoleIndex].TCoords =new CL3D.Vect3d(0.0, 0.0, 0);

        var numRingVertices = slices + 1;

        // Compute indices for inner stacks (not connected to poles).
        k = 0;
        for (var i = 0; i < stacks - 2; ++i){
                for (var j = 0; j < slices; ++j){
                        indices[k++] = (i + 1) * numRingVertices + j;
                        indices[k++] = i * numRingVertices + j + 1;
                        indices[k++] = i * numRingVertices + j;

                        indices[k++] = (i + 1) * numRingVertices + j + 1;
                        indices[k++] = i * numRingVertices + j + 1;
                        indices[k++] = (i + 1) * numRingVertices + j;

                }
        }

        // Compute indices for top stack.  The top stack was written
        // first to the vertex buffer.
        for (var i = 0; i < slices; ++i)
        {
                indices[k++] = i;
                indices[k++] = i + 1;
                indices[k++] = northPoleIndex;
        }

        // Compute indices for bottom stack.  The bottom stack was written
        // last to the vertex buffer, so we need to offset to the index
        // of first vertex in the last ring.
        var baseIndex = (numRings - 1) * numRingVertices;
        for (var i = 0; i < slices; ++i)
        {
                indices[k++] = baseIndex + (i + 1);
                indices[k++] = baseIndex + i;
                indices[k++] = southPoleIndex;
        }
        
        buff.Indices = indices;
        buff.Vertices = vertices;
}