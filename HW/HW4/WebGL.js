var VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec4 a_Normal;
    attribute vec2 a_TexCoord;
    uniform mat4 u_MvpMatrix;
    uniform mat4 u_modelMatrix;
    uniform mat4 u_normalMatrix;
    uniform mat4 u_LightMatrix;
    uniform vec4 u_LightPosition;
    varying vec3 v_Normal;
    varying vec3 v_PositionInWorld;
    varying vec2 v_TexCoord;
    varying vec3 v_LightPosition;
    void main(){
        gl_Position = u_MvpMatrix * a_Position;
        v_PositionInWorld = (u_modelMatrix * a_Position).xyz; 
        v_LightPosition = (u_LightMatrix * u_LightPosition).xyz;
        v_Normal = normalize(vec3(u_normalMatrix * a_Normal));
        v_TexCoord = a_TexCoord;
    }    
`;

var FSHADER_SOURCE = `
    precision mediump float;
    // uniform vec3 u_LightPosition;
    uniform vec3 u_ViewPosition;
    uniform float u_Ka;
    uniform float u_Kd;
    uniform float u_Ks;
    uniform float u_shininess;
    uniform int u_istex;
    uniform sampler2D u_Sampler;
    uniform vec3 u_Color;
    varying vec3 v_Normal;
    varying vec3 v_PositionInWorld;
    varying vec3 v_LightPosition;
    varying vec2 v_TexCoord;
    void main(){
        // let ambient and diffuse color are u_Color 
        // (you can also input them from ouside and make them different)
        vec3 ambientLightColor;
        vec3 diffuseLightColor;
        if(u_istex == 1) {
            vec3 texColor = texture2D( u_Sampler, v_TexCoord ).rgb;
            ambientLightColor = texColor;
            diffuseLightColor = texColor;
        }
        else {
            ambientLightColor = u_Color;
            diffuseLightColor = u_Color;
        }
        
        // assume white specular light (you can also input it from ouside)
        vec3 specularLightColor = vec3(1.0, 1.0, 1.0);        

        vec3 ambient = ambientLightColor * u_Ka;

        vec3 normal = normalize(v_Normal);
        vec3 lightDirection = normalize(v_LightPosition - v_PositionInWorld);
        float nDotL = max(dot(lightDirection, normal), 0.0);
        vec3 diffuse = diffuseLightColor * u_Kd * nDotL;

        vec3 specular = vec3(0.0, 0.0, 0.0);
        if(nDotL > 0.0) {
            vec3 R = reflect(-lightDirection, normal);
            // V: the vector, point to viewer       
            vec3 V = normalize(u_ViewPosition - v_PositionInWorld); 
            float specAngle = clamp(dot(R, V), 0.0, 1.0);
            specular = u_Ks * pow(specAngle, u_shininess) * specularLightColor; 
        }

        gl_FragColor = vec4( ambient + diffuse + specular, 1.0 );
    }
`;

var VSHADER_SOURCE_ENVCUBE = `
  attribute vec4 a_Position;
  varying vec4 v_Position;
  void main() {
    v_Position = a_Position;
    gl_Position = a_Position;
  } 
`;

var FSHADER_SOURCE_ENVCUBE = `
  precision mediump float;
  uniform samplerCube u_envCubeMap;
  uniform mat4 u_viewDirectionProjectionInverse;
  varying vec4 v_Position;
  void main() {
    vec4 t = u_viewDirectionProjectionInverse * v_Position;
    gl_FragColor = textureCube(u_envCubeMap, normalize(t.xyz / t.w));
  }
`;

function compileShader(gl, vShaderText, fShaderText){
    //////Build vertex and fragment shader objects
    var vertexShader = gl.createShader(gl.VERTEX_SHADER)
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
    //The way to  set up shader text source
    gl.shaderSource(vertexShader, vShaderText)
    gl.shaderSource(fragmentShader, fShaderText)
    //compile vertex shader
    gl.compileShader(vertexShader)
    if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)){
        console.log('vertex shader ereror');
        var message = gl.getShaderInfoLog(vertexShader); 
        console.log(message);//print shader compiling error message
    }
    //compile fragment shader
    gl.compileShader(fragmentShader)
    if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)){
        console.log('fragment shader ereror');
        var message = gl.getShaderInfoLog(fragmentShader);
        console.log(message);//print shader compiling error message
    }

    /////link shader to program (by a self-define function)
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    //if not success, log the program info, and delete it.
    if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
        alert(gl.getProgramInfoLog(program) + "");
        gl.deleteProgram(program);
    }

    return program;
}

/////BEGIN:///////////////////////////////////////////////////////////////////////////////////////////////
/////The folloing three function is for creating vertex buffer, but link to shader to user later//////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////
function initAttributeVariable(gl, a_attribute, buffer){
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
  gl.enableVertexAttribArray(a_attribute);
}

function initArrayBufferForLaterUse(gl, data, num, type) {
  // Create a buffer object
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return null;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  // Store the necessary information to assign the object to the attribute variable later
  buffer.num = num;
  buffer.type = type;

  return buffer;
}

function initVertexBufferForLaterUse(gl, vertices, normals, texCoords){
  var nVertices = vertices.length / 3;

  var o = new Object();
  o.vertexBuffer = initArrayBufferForLaterUse(gl, new Float32Array(vertices), 3, gl.FLOAT);
  if( normals != null ) o.normalBuffer = initArrayBufferForLaterUse(gl, new Float32Array(normals), 3, gl.FLOAT);
  if( texCoords != null ) o.texCoordBuffer = initArrayBufferForLaterUse(gl, new Float32Array(texCoords), 2, gl.FLOAT);
  //you can have error check here
  o.numVertices = nVertices;

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return o;
}
/////END://///////////////////////////////////////////////////////////////////////////////////////////////
/////The folloing three function is for creating vertex buffer, but link to shader to user later//////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////

///// normal vector calculation (for the cube)
function getNormalOnVertices(vertices){
  var normals = [];
  var nTriangles = vertices.length/9;
  for(let i=0; i < nTriangles; i ++ ){
      var idx = i * 9 + 0 * 3;
      var p0x = vertices[idx+0], p0y = vertices[idx+1], p0z = vertices[idx+2];
      idx = i * 9 + 1 * 3;
      var p1x = vertices[idx+0], p1y = vertices[idx+1], p1z = vertices[idx+2];
      idx = i * 9 + 2 * 3;
      var p2x = vertices[idx+0], p2y = vertices[idx+1], p2z = vertices[idx+2];

      var ux = p1x - p0x, uy = p1y - p0y, uz = p1z - p0z;
      var vx = p2x - p0x, vy = p2y - p0y, vz = p2z - p0z;

      var nx = uy*vz - uz*vy;
      var ny = uz*vx - ux*vz;
      var nz = ux*vy - uy*vx;

      var norm = Math.sqrt(nx*nx + ny*ny + nz*nz);
      nx = nx / norm;
      ny = ny / norm;
      nz = nz / norm;

      normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  }
  return normals;
}

var mouseLastX, mouseLastY;
var mouseDragging = false;
var angleX = 0, angleY = 0;
var gl, canvas;
var mvpMatrix;
var modelMatrix;
var normalMatrix;
var lightMatrix;
var lightX = 0, lightY = 2, lightZ = 5
var nVertex;
var cameraX = 3, cameraY = 3, cameraZ = 7;
var objScale = 0.1;
var cube = [];
var pyramid = [];
var sphere = [];
var trump = [];
var meat = [];
var textures = {};
var cubeObj = [];
var quadObj;
var cubeMapTex;
var imgNames = ["trumpLPcolors.png"];
var objCompImgIndex = ["trumpLPcolors.png"];
var texCount = 0;
var numTextures = imgNames.length;
var moveDistance = 0;
var rotateAngle = 0;
var zoom = 1;
var rx = 0;
var ry = 0;
var slide1 = 0, joint1 = 0, flag = true;
var slide2 = 0, joint2 = 0, flag2 = true;
var slide3 = 0, joint3 = 0;
var delta = 0;

async function main(){
    canvas = document.getElementById('webgl');
    gl = canvas.getContext('webgl2');
    if(!gl){
        console.log('Failed to get the rendering context for WebGL');
        return ;
    }

    program = compileShader(gl, VSHADER_SOURCE, FSHADER_SOURCE);

    gl.useProgram(program);

    program.a_Position = gl.getAttribLocation(program, 'a_Position'); 
    program.a_TexCoord = gl.getAttribLocation(program, 'a_TexCoord'); 
    program.a_Normal = gl.getAttribLocation(program, 'a_Normal'); 
    program.u_MvpMatrix = gl.getUniformLocation(program, 'u_MvpMatrix'); 
    program.u_modelMatrix = gl.getUniformLocation(program, 'u_modelMatrix'); 
    program.u_normalMatrix = gl.getUniformLocation(program, 'u_normalMatrix');
    program.u_LightMatrix = gl.getUniformLocation(program, 'u_LightMatrix');
    program.u_LightPosition = gl.getUniformLocation(program, 'u_LightPosition');
    program.u_ViewPosition = gl.getUniformLocation(program, 'u_ViewPosition');
    program.u_Ka = gl.getUniformLocation(program, 'u_Ka'); 
    program.u_Kd = gl.getUniformLocation(program, 'u_Kd');
    program.u_Ks = gl.getUniformLocation(program, 'u_Ks');
    program.u_shininess = gl.getUniformLocation(program, 'u_shininess');
    program.u_istex = gl.getUniformLocation(program, 'u_istex'); 
    program.u_Sampler = gl.getUniformLocation(program, "u_Sampler")
    program.u_Color = gl.getUniformLocation(program, 'u_Color');

    response = await fetch('trump.obj');
    text = await response.text();
    obj = parseOBJ(text);

    for( let i=0; i < obj.geometries.length; i ++ ){
      let o = initVertexBufferForLaterUse(gl, 
                                          obj.geometries[i].data.position,
                                          obj.geometries[i].data.normal, 
                                          obj.geometries[i].data.texcoord);
      trump.push(o);
    }

    let image = new Image();
    image.onload = function(){initTexture(gl, image, "trumpLPcolors.png");};
    image.src = "trumpLPcolors.png";

    response = await fetch('meat.obj');
    text = await response.text();
    obj = parseOBJ(text);

    for( let i=0; i < obj.geometries.length; i ++ ){
      let o = initVertexBufferForLaterUse(gl, 
                                          obj.geometries[i].data.position,
                                          obj.geometries[i].data.normal, 
                                          obj.geometries[i].data.texcoord);
      meat.push(o);
    }
    
    cubeVertices = [
      1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, //front
      1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, //right
      1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, //up
      -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, //left
      -1.0, -1.0, 1.0, -1.0, -1.0, -1.0, 1.0, -1.0, -1.0,  1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, //bottom
      1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0 //back        
    ];
    cubeNormals = getNormalOnVertices(cubeVertices);
    let o = initVertexBufferForLaterUse(gl, cubeVertices, cubeNormals, null);
    cube.push(o);

    pyramidVertices = [
        1.0, 0.0, 1.0, 1.0, 0.0, -1.0, 0.0, 1.0, 0.0,
        1.0, 0.0, -1.0, -1.0, 0.0, -1.0, 0.0, 1.0, 0.0,
        -1.0, 0.0, -1.0, -1.0, 0.0, 1.0, 0.0, 1.0, 0.0,
        -1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0,
        -1.0, 0.0, 1.0, -1.0, 0.0, -1.0, 1.0, 0.0, -1.0,  1.0, 0.0, -1.0, 1.0, 0.0, 1.0, -1.0, 0.0, 1.0
    ];
    pyramidNormals = getNormalOnVertices(pyramidVertices);
    o = initVertexBufferForLaterUse(gl, pyramidVertices, pyramidNormals, null);
    pyramid.push(o);

    sphereVertices = getsphereVertices()
    sphereNormals = getNormalOnVertices(sphereVertices);
    o = initVertexBufferForLaterUse(gl, sphereVertices, sphereNormals, null);
    sphere.push(o);

    mvpMatrix = new Matrix4();
    modelMatrix = new Matrix4();
    normalMatrix = new Matrix4();
    lightMatrix = new Matrix4();

    gl.enable(gl.DEPTH_TEST);

    // var quad = new Float32Array(
    //     [
    //       -1, -1, 1,
    //        1, -1, 1,
    //       -1,  1, 1,
    //       -1,  1, 1,
    //        1, -1, 1,
    //        1,  1, 1
    //     ]); //just a quad
  
    // programEnvCube = compileShader(gl, VSHADER_SOURCE_ENVCUBE, FSHADER_SOURCE_ENVCUBE);
    // programEnvCube.a_Position = gl.getAttribLocation(programEnvCube, 'a_Position'); 
    // programEnvCube.u_envCubeMap = gl.getUniformLocation(programEnvCube, 'u_envCubeMap'); 
    // programEnvCube.u_viewDirectionProjectionInverse = 
    //             gl.getUniformLocation(programEnvCube, 'u_viewDirectionProjectionInverse'); 

    // quadObj = initVertexBufferForLaterUse(gl, quad);

    // cubeMapTex = initCubeTexture("skybox/right.JPG", "skybox/left.JPG", "skybox/up.JPG", "skybox/down.JPG", 
    //                                 "skybox/front.JPG", "skybox/back.JPG", 512, 512)

    console.warn("test");
    console.error("here")
    canvas.onmousedown = function(ev){mouseDown(ev)};
    canvas.onmousemove = function(ev){mouseMove(ev)};
    canvas.onmouseup = function(ev){mouseUp(ev)};
    canvas.onwheel = function(ev){wheelscroll(ev)}
    var rxSlider = document.getElementById("robotX");
    rxSlider.oninput = function() {
        rx = this.value / 100.0; //convert sliders value to -1 to +1
        if(flag) {
            joint1++;
            joint2++;
            if(joint1 >= 90)
                flag = false;
        }
        else{
            joint1--;
            joint2--;
            if(joint1 <= 0)
                flag = true;
        }
        joint3 = (joint3 + 1) % 360
        draw(gl);
    }
  
    var rySlider = document.getElementById("robotY");
    rySlider.oninput = function() {
        ry = this.value / 100.0; //convert sliders value to -1 to +1
        if(flag) {
            joint1++;
            joint2++;
            if(joint1 >= 90)
                flag = false;
        }
        else{
            joint1--;
            joint2--;
            if(joint1 <= 0)
                flag = true;
        }
        draw(gl);
    }

}

function getsphereVertices() {
    var SPHERE_DIV = 360;
    var i, ai, si, ci;
    var j, aj, sj, cj;
    var p1, p2;
    var vertices = [],sphereVertices = [];
    for (j = 0; j <= SPHERE_DIV; j++) 
    {
        aj = j *  Math.PI / SPHERE_DIV;
        sj = Math.sin(aj);
        cj = Math.cos(aj);
        for (i = 0; i <= SPHERE_DIV; i++) 
        {
            ai = i * 2 * Math.PI / SPHERE_DIV;
            si = Math.sin(ai);
            ci = Math.cos(ai);
            vertices.push(si * sj);  // X
            vertices.push(cj);       // Y
            vertices.push(ci * sj);  // Z
        }
        
    }
    console.log(vertices)

    for (j = 0; j < SPHERE_DIV; j++)
    {
        for (i = 0; i < SPHERE_DIV; i++)
        {
            p1 = (j * (SPHERE_DIV+1) + i)*3;
            p2 = (j * (SPHERE_DIV+1) + i+1)*3;
            p3 = ((j+1) * (SPHERE_DIV+1) + i)*3;
            p4 = ((j+1) * (SPHERE_DIV+1) + i+1)*3;
            sphereVertices.push(vertices[p1]);
            sphereVertices.push(vertices[p1+1]);
            sphereVertices.push(vertices[p1+2]);
            sphereVertices.push(vertices[p3]);
            sphereVertices.push(vertices[p3+1]);
            sphereVertices.push(vertices[p3+2]);
            sphereVertices.push(vertices[p4]);
            sphereVertices.push(vertices[p4+1]);
            sphereVertices.push(vertices[p4+2]);
            sphereVertices.push(vertices[p2]);
            sphereVertices.push(vertices[p2+1]);
            sphereVertices.push(vertices[p2+2]);
            sphereVertices.push(vertices[p1]);
            sphereVertices.push(vertices[p1+1]);
            sphereVertices.push(vertices[p1+2]);
            sphereVertices.push(vertices[p4]);
            sphereVertices.push(vertices[p4+1]);
            sphereVertices.push(vertices[p4+2]);
        }
    }
    console.log(sphereVertices)
    return sphereVertices;
}

var mdlMatrix = new Matrix4();
var matStack = [];
function pushMatrix(){
    matStack.push(new Matrix4(mdlMatrix));
}
function popMatrix(){
    mdlMatrix = matStack.pop();
}

function draw(){
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // let mdlMatrix = new Matrix4();
    mdlMatrix.setIdentity()
    mdlMatrix.scale(zoom, zoom, zoom);
    pushMatrix()
    mdlMatrix.translate(lightX, lightY, lightZ);
    drawOneObject(sphere, mdlMatrix, 1.0, 1.0, 1.0);
    popMatrix();
    
    pushMatrix();
    mdlMatrix.scale(2, 0.1, 2);
    drawOneObject(cube, mdlMatrix, 1.0, 0.4, 0.4);
    popMatrix();
    
    pushMatrix();
    mdlMatrix.translate(-0.5, 0.1, -0.5);
    mdlMatrix.scale(0.3, 0.3, 0.3);
    drawOneObject(trump, mdlMatrix);
    
    mdlMatrix.translate(-0.2, 1, -0.3);
    mdlMatrix.rotate(90, 1, 0, 0);
    drawOneObject(meat, mdlMatrix, 1.0, 0.4, 0.0);
    mdlMatrix.rotate(-90, 1, 0, 0);
    popMatrix();

    mdlMatrix.translate(rx, 0, ry);
    mdlMatrix.scale(0.1, 0.1, 0.1);
    mdlMatrix.translate(0, 4, 0);
    pushMatrix()
    mdlMatrix.scale(2, 2, 2);
    drawOneObject(cube, mdlMatrix, 0.0, 0.4, 1.0);
    popMatrix()
    mdlMatrix.translate(0, 3, 0);
    mdlMatrix.scale(0.5, 0.5, 0.5);
    // mdlMatrix.scale(0.5, 0.5, 0.5);
    pushMatrix();
    mdlMatrix.scale(1, 2, 1);
    drawOneObject(cube, mdlMatrix, 0.0, 0.4, 1.0);
    popMatrix();
    mdlMatrix.translate(0, 3, 0);
    mdlMatrix.rotate(joint1, 1, 0, 0)
    drawOneObject(sphere, mdlMatrix, 0.0, 0.4, 1.0);
    mdlMatrix.translate(0, 3, 0);
    pushMatrix();
    mdlMatrix.scale(1, 2, 1);
    drawOneObject(cube, mdlMatrix, 0.0, 0.4, 1.0);
    popMatrix();
    pushMatrix();
    mdlMatrix.scale(1, 2, 1);
    drawOneObject(cube, mdlMatrix, 0.0, 0.4, 1.0);
    popMatrix();
    mdlMatrix.translate(0, 3, 0);
    mdlMatrix.rotate(joint2, 1, 0, 0)
    mdlMatrix.rotate(joint3, 0, 1, 0)
    drawOneObject(sphere, mdlMatrix, 0.0, 0.4, 1.0);
    mdlMatrix.translate(0, 3, 0);
    pushMatrix();
    mdlMatrix.scale(1, 2, 1);
    drawOneObject(cube, mdlMatrix, 0.0, 0.4, 1.0);
    popMatrix();
    mdlMatrix.translate(0, 2, 0);
    pushMatrix();
    mdlMatrix.scale(1, 2, 1);
    drawOneObject(pyramid, mdlMatrix, 0.0, 0.4, 1.0);
    popMatrix();

    // mdlMatrix.translate(lightX, lightY, lightZ);
    // drawOneObject(sphere, mdlMatrix, 1.0, 1.0, 1.0);
     

}

//obj: the object components
//mdlMatrix: the model matrix without mouse rotation
//colorR, G, B: object color
function drawOneObject(obj, mdlMatrix, colorR, colorG, colorB){
    //model Matrix (part of the mvp matrix)
    modelMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
    modelMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
    modelMatrix.multiply(mdlMatrix);
    lightMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
    lightMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
    lightMatrix.scale(zoom, zoom, zoom);
    // lightMatrix.multiply(mdlMatrix);
    //mvp: projection * view * model matrix  
    mvpMatrix.setPerspective(30, 1, 1, 100);
    mvpMatrix.lookAt(cameraX, cameraY, cameraZ, 0, 0, 0, 0, 1, 0);
    mvpMatrix.multiply(modelMatrix);

    //normal matrix
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();

    gl.uniform4f(program.u_LightPosition, lightX, lightY, lightZ, 1);
    gl.uniform3f(program.u_ViewPosition, cameraX, cameraY, cameraZ);
    gl.uniform1f(program.u_Ka, 0.2);
    gl.uniform1f(program.u_Kd, 0.7);
    gl.uniform1f(program.u_Ks, 1.0);
    gl.uniform1f(program.u_shininess, 10.0);

    gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
    gl.uniformMatrix4fv(program.u_modelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(program.u_normalMatrix, false, normalMatrix.elements);
    gl.uniformMatrix4fv(program.u_LightMatrix, false, lightMatrix.elements);
    
    if(arguments.length == 5) {
        gl.uniform1i(program.u_istex, 0)
        gl.uniform3f(program.u_Color, colorR, colorG, colorB);
    }

    for( let i=0; i < obj.length; i ++ ){
        if(arguments.length == 2) {
            gl.uniform1i(program.u_istex, 1)
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, textures[objCompImgIndex[i]]);
            gl.uniform1i(program.u_Sampler, 0);
            initAttributeVariable(gl, program.a_Position, obj[i].vertexBuffer);
            initAttributeVariable(gl, program.a_TexCoord, obj[i].texCoordBuffer);
            initAttributeVariable(gl, program.a_Normal, obj[i].normalBuffer);
        }
        else if(arguments.length == 5) {
            initAttributeVariable(gl, program.a_Position, obj[i].vertexBuffer);
            initAttributeVariable(gl, program.a_Normal, obj[i].normalBuffer);
        }
  
        gl.drawArrays(gl.TRIANGLES, 0, obj[i].numVertices);
      }
}

function parseOBJ(text) {
  // because indices are base 1 let's just fill in the 0th data
  const objPositions = [[0, 0, 0]];
  const objTexcoords = [[0, 0]];
  const objNormals = [[0, 0, 0]];

  // same order as `f` indices
  const objVertexData = [
    objPositions,
    objTexcoords,
    objNormals,
  ];

  // same order as `f` indices
  let webglVertexData = [
    [],   // positions
    [],   // texcoords
    [],   // normals
  ];

  const materialLibs = [];
  const geometries = [];
  let geometry;
  let groups = ['default'];
  let material = 'default';
  let object = 'default';

  const noop = () => {};

  function newGeometry() {
    // If there is an existing geometry and it's
    // not empty then start a new one.
    if (geometry && geometry.data.position.length) {
      geometry = undefined;
    }
  }

  function setGeometry() {
    if (!geometry) {
      const position = [];
      const texcoord = [];
      const normal = [];
      webglVertexData = [
        position,
        texcoord,
        normal,
      ];
      geometry = {
        object,
        groups,
        material,
        data: {
          position,
          texcoord,
          normal,
        },
      };
      geometries.push(geometry);
    }
  }

  function addVertex(vert) {
    const ptn = vert.split('/');
    ptn.forEach((objIndexStr, i) => {
      if (!objIndexStr) {
        return;
      }
      const objIndex = parseInt(objIndexStr);
      const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
      webglVertexData[i].push(...objVertexData[i][index]);
    });
  }

  const keywords = {
    v(parts) {
      objPositions.push(parts.map(parseFloat));
    },
    vn(parts) {
      objNormals.push(parts.map(parseFloat));
    },
    vt(parts) {
      // should check for missing v and extra w?
      objTexcoords.push(parts.map(parseFloat));
    },
    f(parts) {
      setGeometry();
      const numTriangles = parts.length - 2;
      for (let tri = 0; tri < numTriangles; ++tri) {
        addVertex(parts[0]);
        addVertex(parts[tri + 1]);
        addVertex(parts[tri + 2]);
      }
    },
    s: noop,    // smoothing group
    mtllib(parts, unparsedArgs) {
      // the spec says there can be multiple filenames here
      // but many exist with spaces in a single filename
      materialLibs.push(unparsedArgs);
    },
    usemtl(parts, unparsedArgs) {
      material = unparsedArgs;
      newGeometry();
    },
    g(parts) {
      groups = parts;
      newGeometry();
    },
    o(parts, unparsedArgs) {
      object = unparsedArgs;
      newGeometry();
    },
  };

  const keywordRE = /(\w*)(?: )*(.*)/;
  const lines = text.split('\n');
  for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
    const line = lines[lineNo].trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const m = keywordRE.exec(line);
    if (!m) {
      continue;
    }
    const [, keyword, unparsedArgs] = m;
    const parts = line.split(/\s+/).slice(1);
    const handler = keywords[keyword];
    if (!handler) {
      console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
      continue;
    }
    handler(parts, unparsedArgs);
  }

  // remove any arrays that have no entries.
  for (const geometry of geometries) {
    geometry.data = Object.fromEntries(
        Object.entries(geometry.data).filter(([, array]) => array.length > 0));
  }

  return {
    geometries,
    materialLibs,
  };
}

function mouseDown(ev){ 
    var x = ev.clientX;
    var y = ev.clientY;
    var rect = ev.target.getBoundingClientRect();
    if( rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom){
        mouseLastX = x;
        mouseLastY = y;
        mouseDragging = true;
    }
}

function mouseUp(ev){ 
    mouseDragging = false;
}

function mouseMove(ev){ 
    var x = ev.clientX;
    var y = ev.clientY;
    if( mouseDragging ){
        var factor = 100/canvas.height; //100 determine the spped you rotate the object
        var dx = factor * (x - mouseLastX);
        var dy = factor * (y - mouseLastY);

        angleX += dx; //yes, x for y, y for x, this is right
        angleY += dy;
    }
    mouseLastX = x;
    mouseLastY = y;
    draw();
}

function wheelscroll(ev) {
    zoom += ev.deltaY * -0.0005;
    zoom = Math.min(Math.max(.125, zoom), 4);
    draw();
}

function initTexture(gl, img, imgName){
  var tex = gl.createTexture();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.bindTexture(gl.TEXTURE_2D, tex);

  // Set the parameters so we can render any size image.
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  // Upload the image into the texture.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

  textures[imgName] = tex;

  texCount++;
  if( texCount == numTextures)draw();
}
