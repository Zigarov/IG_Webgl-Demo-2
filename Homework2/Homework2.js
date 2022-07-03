"use strict";

// Ambient Variables:
	var canvas;
	var gl;
	var program;

// Transformation Matrices:
	var projectionMatrix = ortho(-5.0,5.0,-5.0,5.0,-100,100);
	var modelViewMatrix;
  	var nMatrix;

// Uniform Variables:
	var modelViewMatrixLoc;
	var colorLoc;

// Camera Settings:
	var radius = 0.5;															// 	Camera distance from Origin.
	var phi = [15,15];															// 	[Angle between Y and XZ plane, (Z,X) Angle].
	const at = vec3(0.0, 0.0, 0.0); 	 										// 	Set where the camera is pointed in the object space.
	const up = vec3(0.0, 1.0, 0.0); 											// 	Set the up direction of the camera view.

	function eye(){																//	function that compute the camera coordinates.
		var theta = [radians(phi[0]),radians(phi[1])];
		var eye = vec3(
			radius * Math.cos(theta[0]) * Math.sin(theta[1]),
			radius * Math.sin(theta[0]),
			radius * Math.cos(theta[0]) * Math.cos(theta[1]),
		);
		return eye;
	}

//	Camera Rotarion Parameters:
	var flagCam = false;														// 	Flag to control the camera motion.
	var camPos = [0,0];															// 	State variable to animate the camera.
	var dPhi = [0,0];															//	Camera angles increment.

// LIGHT:
	const lightPosition = vec4(5, 10, 10, 1.0);

//  GEOMETRY:
	var nVertices = 36;
	function cube() {
		var symbol = {
			Points: [],
			Normals: [],
			Tangents: [],
			Texture: []
	//		Colors: []
		};
	    quad( 1, 0, 3, 2 );
	    quad( 2, 3, 7, 6 );
	    quad( 3, 0, 4, 7 );
	    quad( 6, 5, 1, 2 );
	    quad( 4, 5, 6, 7 );
	    quad( 5, 4, 0, 1 );
		return symbol;

		function quad(a, b, c, d) {
			var vertices = [
				vec4( -0.5, -0.5,  0.5, 1.0 ),
				vec4( -0.5,  0.5,  0.5, 1.0 ),
				vec4( 0.5,  0.5,  0.5, 1.0 ),
				vec4( 0.5, -0.5,  0.5, 1.0 ),
				vec4( -0.5, -0.5, -0.5, 1.0 ),
				vec4( -0.5,  0.5, -0.5, 1.0 ),
				vec4( 0.5,  0.5, -0.5, 1.0 ),
				vec4( 0.5, -0.5, -0.5, 1.0 )
		];
			var texCoord = [
		  		vec2(0, 0),
		  		vec2(0, 1),
		  		vec2(1, 1),
		  		vec2(1, 0)
			];
			var quadIndex = [a,b,c, a,c,d];
			var texIndex = [0,1,2, 0,2,3];

			var t1 = subtract(vertices[b], vertices[a]);
			var t2 = subtract(vertices[c], vertices[b]);
			var normal = cross(t1, t2);
			normal = vec3(normal[0],normal[1],normal[2]);
			var tangent = vec3(t1[0],t1[1],t1[2]);

			for(var i = 0; i<6; i++){
				symbol.Points.push(vertices[quadIndex[i]]);
				symbol.Texture.push(texCoord[texIndex[i]]);
				symbol.Normals.push(normal);
				symbol.Tangents.push(tangent);
			}
		}
	}
	function vertexColors(color, n){
		var colorsArray = []
		for(var i = 0; i<n; i++){
			colorsArray.push(color);
		}
		return colorsArray;
	}

// Texture Parameters:
	var textureColors = [vec4(0.0, 0.6, 0.0, 1.0), vec4(0.55,0.45,0.39, 1.0), vec4(0.8, 0.8, 0.8, 1.0)];
	var texSize = 256;
	function roughTextureMap(texSize){
	//  Bump Data:
	    var data = new Array()
	    for (var i = 0; i<= texSize; i++)  data[i] = new Array();
	    for (var i = 0; i<= texSize; i++) for (var j=0; j<=texSize; j++)
	        data[i][j] = Math.random();
	//  Bump Map Normals:
	    var normalst = new Array()
	    for (var i=0; i<texSize; i++)  normalst[i] = new Array();
	    for (var i=0; i<texSize; i++) for ( var j = 0; j < texSize; j++)
	        normalst[i][j] = new Array();
	    for (var i=0; i<texSize; i++) for ( var j = 0; j < texSize; j++) {
	        normalst[i][j][0] = data[i][j]-data[i+1][j];
	        normalst[i][j][1] = data[i][j]-data[i][j+1];
	        normalst[i][j][2] = 1;
		}
	// 	Scale to Texture Coordinates..
	    for (var i=0; i<texSize; i++) for (var j=0; j<texSize; j++) {
	        var d = 0;
	        for(k=0;k<3;k++) d+=normalst[i][j][k]*normalst[i][j][k];
	        d = Math.sqrt(d);
	        for(k=0;k<3;k++) normalst[i][j][k]= 0.5*normalst[i][j][k]/d + 0.5;
	    }
	    var normals = new Uint8Array(3*texSize*texSize);
	    for ( var i = 0; i < texSize; i++ ){
	        for ( var j = 0; j < texSize; j++ ) {
	              for(var k =0; k<3; k++){
	                  normals[3*texSize*i+3*j+k] = 255*normalst[i][j][k];
	              }
	        }
	    }
    	return normals;
	}
	function faceTexture(texSize){
		var texels = new Uint8Array(3*texSize*texSize);
	    for(var i= 0; i<3*texSize*texSize; i+=3){
			var c = 255;
          	texels[i] = c;
			texels[i+1] = c;
			texels[i+1] = c;
	    }
	    return texels;
	}

	function configureTexture(image) {
		var texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, texSize, texSize, 0, gl.RGB, gl.UNSIGNED_BYTE, image);
		gl.generateMipmap(gl.TEXTURE_2D);
		return texture;
	}

// 	Hierarchical Model:
	const nNodes = 13;
	var stack = [];
	var figure = [];

//  Nodes ID:
	const BODY = 0;
	const HEAD = 1;
	const TAIL = 2;
	const LEG_LAU = 3;
	const LEG_RAU = 4;
	const LEG_LPU = 5;
	const LEG_RPU = 6;
	const LEG_LAD = 7;
	const LEG_RAD = 8;
	const LEG_LPD = 9;
	const LEG_RPD = 10;
	const GRASS = 11;
	const FENCE = 12;

//  Nodes Parameters:
//			[BODY,HEAD,TAIL,LEGU,LEGU,LEGU,LEGU,LEGD,LEGD,LEGD,LEGD,GRASS,FENCE]
	var h = [0.8, 0.6, 0.4, 0.4, 0.4, 0.4, 0.4, 0.2, 0.2, 0.2, 0.2, .1, 1.0];		// y
	var w = [1.0, 0.4, 0.25, 0.2, 0.2, 0.2, 0.2, 0.1, 0.1, 0.1, 0.1, 15.0, 10.0];	// z
	var l = [1.5, 0.6, 0.25, 0.2, 0.2, 0.2, 0.2, 0.1, 0.1, 0.1, 0.1, 15.0, 0.2];    // x
	var theta = [0, 0, 0, -15, -15, -15, -15, -15, -15, -15, -15, 0, 0];			// alfa

	const root = vec3(-4, (h[BODY]*.5 + h[LEG_LAU] + h[LEG_LAD]+h[GRASS]), 0.0);// Center point of the Sheep body, where the translation is computed.
	var roots = [																// All the centers relative distances.
		vec3(root[0], root[1], root[2]),
		vec3(l[BODY]*0.45, h[BODY]*0.5, 0.0),
		vec3(-l[BODY]*0.5, h[BODY]*0.5, 0.0),
		vec3(l[BODY]*0.25, -(h[BODY]+h[LEG_RAU])*0.5, -w[BODY]*0.4),
		vec3(l[BODY]*0.25, -(h[BODY]+h[LEG_RAU])*0.5, w[BODY]*0.4),
		vec3(-l[BODY]*0.25, -(h[BODY]+h[LEG_LPU])*0.5, -w[BODY]*0.4),
		vec3(-l[BODY]*0.25, -(h[BODY]+h[LEG_RPU])*0.5, w[BODY]*0.4),
		vec3(0.0,-(h[LEG_LAU]+h[LEG_LAD])*0.5, 0.0),
		vec3(0.0,-(h[LEG_RAU]+h[LEG_RAD])*0.5, 0.0),
		vec3(0.0,-(h[LEG_LPU]+h[LEG_LPD])*0.5, 0.0),
		vec3(0.0,-(h[LEG_RPU]+h[LEG_RPD])*0.5, 0.0),
		vec3(0.0,0.1,0.0),
		vec3(0.0, h[FENCE]/2, 0.0)
	];
	var children = [HEAD, null, null, LEG_LAD, LEG_RAD, LEG_LPD, LEG_RPD, null, null, null, null, FENCE, null];
	var siblings = [GRASS, TAIL, LEG_LAU, LEG_RAU, LEG_LPU, LEG_RPU, null, null, null, null, null, null];
	var colors = [2,2,2, 2,2,2,2, 1,1,1,1, 0, 1];

	function createNode(Id){													// Create a node of the hierarchical model.
		var node = {
			id: Id,
		   	transform: null,
			child: children[Id],
			sibling: siblings[Id],
			render: function(){
// 				Scale ModelViewMatrix..
				var m = scale(l[Id],h[Id],w[Id]);
				m = mult(modelViewMatrix, m);
				gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(m));

//				Link the color..
				gl.uniform4fv(colorLoc, textureColors[colors[Id]]);

//				Draw..
				if (Id == HEAD){
					gl.drawArrays(gl.TRIANGLES, 0, 6);
					gl.uniform4fv(colorLoc, textureColors[1]);
					gl.activeTexture(gl.TEXTURE1);
					gl.uniform1i( gl.getUniformLocation(program, "uTextureMap"), 1);
					gl.uniform1i( gl.getUniformLocation(program, "uBump"), false);
					gl.drawArrays(gl.TRIANGLES, 6, 6);
					gl.uniform4fv(colorLoc, textureColors[colors[Id]]);
					gl.activeTexture(gl.TEXTURE0);
					gl.uniform1i( gl.getUniformLocation(program, "uTextureMap"), 0);
					gl.uniform1i( gl.getUniformLocation(program, "uBump"), true);
					gl.drawArrays(gl.TRIANGLES, 12, 24);
				}
				if (Id == GRASS){
					gl.activeTexture(gl.TEXTURE2);
					gl.uniform1i( gl.getUniformLocation(program, "uTextureMap"), 2);
					gl.drawArrays(gl.TRIANGLES, 0, nVertices);
					gl.activeTexture(gl.TEXTURE0);
					gl.uniform1i( gl.getUniformLocation(program, "uTextureMap"), 0);
				}
				else gl.drawArrays(gl.TRIANGLES, 0, nVertices);
			},
	    }
	    return node;
	}
	function transformNode(Id) {												// Compute the current transformation Matrix for ID node.
		var m = translate(roots[Id][0],roots[Id][1],roots[Id][2]);
		m = mult(m,rotate(theta[Id], vec3(0,0,1)));
		figure[Id].transform = m;
	}
	function traverse(Id) {														// Traverse the tree structure.
	   if(Id == null) return;
	   stack.push(modelViewMatrix);
	   modelViewMatrix = mult(modelViewMatrix, figure[Id].transform);
	   figure[Id].render();
	   if(figure[Id].child != null) traverse(figure[Id].child);
	   modelViewMatrix = stack.pop();
	   if(figure[Id].sibling != null) traverse(figure[Id].sibling);
	}

// 	Animation Parameters:
	var animation = true;														// Flag to control START/STOP of the animation.
	var keyFrames = [
		vec3(root[0]-2, root[1], root[2]),
		vec3(root[0]-1, root[1], root[2]),
		root,
		vec3(root[0]+1, root[1], root[2]),
		vec3(root[0]+2, root[1], root[2]),
		vec3(root[0]+4, root[1]+1.5, root[2]),
		vec3(root[0]+6, root[1], root[2]),
		vec3(root[0]+7, root[1], root[2]),
		vec3(root[0]+8, root[1], root[2]),
		vec3(root[0]+9, root[1], root[2]),
		vec3(root[0]+10, root[1], root[2])
	];														// Keyframes from one step to another.
	var nKeys = keyFrames.length;
	var currentFrameID = 2;														// ID of the last Keyframe traversed.
	var nFrames = 24;															// Number of frames for each step.
	var alfa = 30;																// Angle of animation for each step.
	var dx = 0.0;
	var dy = 0.0;
	var da = 0.0;

	function delta(nFrames) {													// Compute the increments for frame in each animated step.
//		Updates the step parameters (dx,dy,da)..
		dx = (keyFrames[currentFrameID+1][0] - keyFrames[currentFrameID][0])/nFrames;
		dy = (keyFrames[currentFrameID+1][1] - keyFrames[currentFrameID][1])/nFrames;
		da = (theta[LEG_LAU] < alfa/2) ? +alfa/nFrames: -alfa/nFrames;
	}
	function step(){															// Execute a single frame increment (1 of nFrames between two keyframes).
//		Translate the Sheep Root Vertex..
		roots[0][0] += dx;
		roots[0][1] += dy;

//		Rotate Nodes..
		theta[BODY] -= da*0.1;
		for(var leg = LEG_LAU; leg<LEG_RPD; leg++) {
			theta[leg] += da;
		}
//		Update Nodes transformation matrices..
		for(var i=0; i<nNodes; i++) {
			transformNode(i);
		}
//		Check for the nex keyFrame..
		if (roots[0][0]>keyFrames[currentFrameID+1][0]){
			currentFrameID = (currentFrameID < nKeys-2) ?  currentFrameID+1 : 0;
			roots[0][0] = keyFrames[currentFrameID][0];
			roots[0][1] = keyFrames[currentFrameID][1];
			delta(nFrames);
		}

	}

window.onload = function init() {
//  Inizialization..
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) { alert( "WebGL 2.0 isn't available");}
    gl.viewport( 0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);

//	Load Shaders..
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

// 	Set the Camera..
	modelViewMatrix = lookAt(eye(),at,up);

//	Initialize Uniform/Attribute Variables..
	modelViewMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");
	colorLoc = gl.getUniformLocation(program, "uColor");
	gl.uniformMatrix4fv(gl.getUniformLocation( program, "uProjectionMatrix"), false, flatten(projectionMatrix));
	gl.uniform4fv(gl.getUniformLocation( program, "uLightPosition"), lightPosition);

// 	Initialize buffers..
	var myCube = cube();
	initBuffers();

// 	Configure Textures:
	configureTexture(roughTextureMap(texSize));
	configureTexture(faceTexture(texSize));
	configureTexture(roughTextureMap(texSize*4));

// 	Set default texture (Sheep Body)
	gl.activeTexture(gl.TEXTURE0);
	gl.uniform1i( gl.getUniformLocation(program, "uTextureMap"), 0);
	gl.uniform1i( gl.getUniformLocation(program, "uBump"), true);

// 	Configure the scene..
    for(var i=0; i<nNodes; i++) {
		figure[i] = createNode(i);
		transformNode(i);
	}
//	Initialize Animation Parameters..
	delta(nFrames);

// 	Configure Interactions:
	initInteractions();

//	Draw the scene..
    render();

	function render() {
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
//		Update Camera Position..
		if (flagCam){
			phi[0] += dPhi[0];
			phi[1] += dPhi[1];
		}
		modelViewMatrix = lookAt(eye(),at,up);

//		Animation..:
		if (animation) step();

//		Update Matrices..
		gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
		nMatrix = normalMatrix(modelViewMatrix, true);
		gl.uniformMatrix3fv( gl.getUniformLocation(program, "uNormalMatrix"), false, flatten(nMatrix));

//		Draw the scene..
		traverse(BODY);

		requestAnimationFrame(render);
	}
	function initBuffers(){
// 		VerticesBuffers:
		var vBuffer = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(myCube.Points), gl.STATIC_DRAW);

		var positionLoc = gl.getAttribLocation(program, "aPosition");
		gl.vertexAttribPointer( positionLoc, 4, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( positionLoc );

//		NormalsBuffer:
		var nBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(myCube.Normals), gl.STATIC_DRAW);

		var normalLoc = gl.getAttribLocation(program, "aNormal");
		gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(normalLoc);

//		TangentsBuffer:
		var tBuffer = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer);
		gl.bufferData( gl.ARRAY_BUFFER, flatten(myCube.Tangents), gl.STATIC_DRAW);

		var tangentLoc = gl.getAttribLocation( program, "aTangent");
		gl.vertexAttribPointer(tangentLoc, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(tangentLoc);

// 		TextureBuffer:
		var texBuffer = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, texBuffer);
		gl.bufferData( gl.ARRAY_BUFFER, flatten(myCube.Texture), gl.STATIC_DRAW);

		var texCoordLoc = gl.getAttribLocation( program, "aTexCoord");
		gl.vertexAttribPointer( texCoordLoc, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(texCoordLoc);
	}
	function initInteractions() {
		document.getElementById("Animation").onclick = function() {animation = !animation;};

		document.getElementById("buttonL").onmouseup =  function() { flagCam = false;};
		document.getElementById("buttonL").onmousedown = function() { flagCam = true; dPhi = [0,-1]};

		document.getElementById("buttonR").onmouseup =  function() {flagCam = false;}
		document.getElementById("buttonR").onmousedown =  function() {flagCam = true; dPhi = [0,+1]};

		document.getElementById("buttonU").onmouseup =  function() {flagCam = false;}
		document.getElementById("buttonU").onmousedown =  function() {flagCam = true; dPhi = [1,0]};

		document.getElementById("buttonD").onmouseup =  function() { flagCam = false;}
		document.getElementById("buttonD").onmousedown =  function() {flagCam = true; dPhi = [-1,0]};

		canvas.addEventListener("mousedown",
			function(event) {
				var x = 2*event.clientX/canvas.width-1;
				var y = 2*(canvas.height-event.clientY)/canvas.height-1;
				flagCam = true;
				camPos = [x,y];
			}
		);
		canvas.addEventListener("mouseup",
			function(event){
				flagCam = false;
			}
		);
		canvas.addEventListener("mousemove",
			function(event){
				var x = 2*event.clientX/canvas.width-1;
				var y = 2*(canvas.height-event.clientY)/canvas.height-1;
				if (flagCam) {
					dPhi[1] = 45*(x - camPos[0]);
					dPhi[0] = 45*(y - camPos[1]);
					camPos = [x,y];
				}
			}
		);
	}

}
