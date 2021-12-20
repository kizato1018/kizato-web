var VSHADER_SOURCE = `
        attribute vec4 a_Position;
        attribute vec4 a_Color;
        varying vec4 v_Color;
        uniform mat4 u_modelMatrix;
        void main(){
            gl_Position = u_modelMatrix * a_Position;
            v_Color = a_Color;
        }    
    `;

var FSHADER_SOURCE = `
        precision mediump float;
        varying vec4 v_Color;
        void main(){
            gl_FragColor = v_Color;
        }
    `;

function createProgram(gl, vertexShader, fragmentShader){
    //create the program and attach the shaders
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    //if success, return the program. if not, log the program info, and delete it.
    if(gl.getProgramParameter(program, gl.LINK_STATUS)){
        return program;
    }
    alert(gl.getProgramInfoLog(program) + "");
    gl.deleteProgram(program);
}

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

function initArrayBuffer( gl, data, num, type, attribute){
    var buffer = gl.createBuffer();
    if(!buffer){
        console.log("failed to create the buffere object");
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    var a_attribute = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), attribute);

    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);

    return true;
}

var mdlMatrix = new Matrix4();
var matStack = [];
var u_modelMatrix;
function pushMatrix(){
    matStack.push(new Matrix4(mdlMatrix));
}
function popMatrix(){
    mdlMatrix = matStack.pop();
}
//variables for tx, red,green and yellow arms angle 
var rx = 0;
var ry = 0;
var joint1 = 0;
var joint2 = 0;
var joint3 = 0;
var rsize = 0.2;

function main(){
    //////Get the canvas context
    var canvas = document.getElementById('webgl');
    var gl = canvas.getContext('webgl2');
    if(!gl){
        console.log('Failed to get the rendering context for WebGL');
        return ;
    }

    program = compileShader(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    redraw(gl); //call redarw here to show the initial image

    //setup the call back function of tx Sliders
    var rxSlider = document.getElementById("robotX");
    rxSlider.oninput = function() {
        rx = this.value / 100.0; //convert sliders value to -1 to +1
        redraw(gl);
    }
  
    var rySlider = document.getElementById("robotY");
    rySlider.oninput = function() {
        ry = this.value / 100.0; //convert sliders value to -1 to +1
        redraw(gl);
    }

    var jointSlider1 = document.getElementById("joint-1");
    jointSlider1.oninput = function() {
        joint1 = this.value; //convert sliders value to 0 to 90 degrees
        redraw(gl);
    }

    var jointSlider2 = document.getElementById("joint-2");
    jointSlider2.oninput = function() {
        joint2 = this.value; //convert sliders value to 0 to 90 degrees
        redraw(gl);
    }

    var jointSlider3 = document.getElementById("joint-3");
    jointSlider3.oninput = function() {
        joint3 = this.value; //convert sliders value to 0 to 90 degrees
        redraw(gl);
    }
  
    var rsizeSlider = document.getElementById("robotSize");
    rsizeSlider.oninput = function() {
        rsize = this.value / 100.0; //convert sliders value to 0 to +1
        redraw(gl);
    }
}

function getCircleVertices(r, n) {
    v = [0.0, 0.0]
    for(i = 0; i <= n; ++i) {
        v.push(r*Math.sin(2*Math.PI*i/n));
        v.push(r*Math.cos(2*Math.PI*i/n));
    }
    return v;
}

function getColor(color, n) {
    c = []
    for(i = 0; i < n; ++i)
        c = c.concat(color)
    return c
}

//Call this funtion when we have to update the screen (eg. user input happens)
function redraw(gl)
{
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    u_modelMatrix = gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'u_modelMatrix');
    var redColor = [0.9, 0.0, 0.0];
    var greenColor = [0.0, 0.9, 0.0];
    var blueColor = [0.0, 0.0, 0.9];
    var yellowColor = [0.9, 0.9, 0.0];
    var pinkColor = [0.9, 0.0, 0.9];
    var whiteColor = [0.9, 0.9, 0.9];
    circleVertices = getCircleVertices(0.1, 36);
    triVertices = [-0.2, -0.115, 0.2, -0.115, 0, 0.23]
    rectVertices = [-0.5, 0.3, 0.5, 0.3, -0.5, -0.3, 0.5, -0.3];
   
    buffer0 = initArrayBuffer(gl, new Float32Array(rectVertices), 2, gl.FLOAT, 'a_Position');
    buffer1 = initArrayBuffer(gl, new Float32Array(getColor(greenColor, 4)), 3, gl.FLOAT, 'a_Color');

    mdlMatrix.setIdentity();
    
  
    //TODO-1: translate whole robot here
    mdlMatrix.translate(rx, ry, 0.0);
    mdlMatrix.scale(rsize, rsize, 1.0);
    pushMatrix();
    gl.uniformMatrix4fv(u_modelMatrix, false, mdlMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, rectVertices.length/2);//draw the blue one

    popMatrix();
    buffer0 = initArrayBuffer(gl, new Float32Array(triVertices), 2, gl.FLOAT, 'a_Position');
    buffer1 = initArrayBuffer(gl, new Float32Array(getColor(yellowColor, 3)), 3, gl.FLOAT, 'a_Color');
    //TODO-2: make the red arm rotate
    pushMatrix();
    mdlMatrix.translate(0, 0.415, 0.0);
    gl.uniformMatrix4fv(u_modelMatrix, false, mdlMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, 0, triVertices.length/2);//draw the red one

    popMatrix();
    buffer0 = initArrayBuffer(gl, new Float32Array(circleVertices), 2, gl.FLOAT, 'a_Position');
    buffer1 = initArrayBuffer(gl, new Float32Array(getColor(redColor, 38)), 3, gl.FLOAT, 'a_Color');
    mdlMatrix.translate(-0.2, -0.4, 0.0);
    pushMatrix();
    gl.uniformMatrix4fv(u_modelMatrix, false, mdlMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, circleVertices.length/2);//draw the blue one

    popMatrix();
    buffer0 = initArrayBuffer(gl, new Float32Array(circleVertices), 2, gl.FLOAT, 'a_Position');
    buffer1 = initArrayBuffer(gl, new Float32Array(getColor(redColor, 38)), 3, gl.FLOAT, 'a_Color');
    mdlMatrix.translate(0.4, 0.0, 0.0);
    pushMatrix();
    gl.uniformMatrix4fv(u_modelMatrix, false, mdlMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, circleVertices.length/2);//draw the blue one
    
    popMatrix();
    buffer0 = initArrayBuffer(gl, new Float32Array(circleVertices), 2, gl.FLOAT, 'a_Position');
    buffer1 = initArrayBuffer(gl, new Float32Array(getColor(pinkColor, 38)), 3, gl.FLOAT, 'a_Color');
    mdlMatrix.translate(-0.2, 1.14, 0.0);
    mdlMatrix.rotate(joint1, 0.0, 0.0, 1.0);
    pushMatrix();
    pushMatrix();
    gl.uniformMatrix4fv(u_modelMatrix, false, mdlMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, circleVertices.length/2);//draw the blue one
    
    // popMatrix();
    buffer0 = initArrayBuffer(gl, new Float32Array(rectVertices), 2, gl.FLOAT, 'a_Position');
    buffer1 = initArrayBuffer(gl, new Float32Array(getColor(whiteColor, 38)), 3, gl.FLOAT, 'a_Color');
    mdlMatrix.translate(0.0, 0.45, 0.0);
    mdlMatrix.scale(0.2, 1.15, 1)
    // pushMatrix();
    gl.uniformMatrix4fv(u_modelMatrix, false, mdlMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, rectVertices.length/2);//draw the blue one

    popMatrix();
    buffer0 = initArrayBuffer(gl, new Float32Array(circleVertices), 2, gl.FLOAT, 'a_Position');
    buffer1 = initArrayBuffer(gl, new Float32Array(getColor(pinkColor, 38)), 3, gl.FLOAT, 'a_Color');
    mdlMatrix.translate(0.0, 0.9, 0.0);
    mdlMatrix.rotate(joint2, 0.0, 0.0, 1.0);
    pushMatrix();
    gl.uniformMatrix4fv(u_modelMatrix, false, mdlMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, circleVertices.length/2);
    
    // popMatrix();
    buffer0 = initArrayBuffer(gl, new Float32Array(rectVertices), 2, gl.FLOAT, 'a_Position');
    buffer1 = initArrayBuffer(gl, new Float32Array(getColor(whiteColor, 38)), 3, gl.FLOAT, 'a_Color');
    mdlMatrix.translate(0.0, 0.45, 0.0);
    mdlMatrix.scale(0.2, 1.15, 1)
    // pushMatrix();
    gl.uniformMatrix4fv(u_modelMatrix, false, mdlMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, rectVertices.length/2);//draw the blue one
    
    popMatrix();
    buffer0 = initArrayBuffer(gl, new Float32Array(circleVertices), 2, gl.FLOAT, 'a_Position');
    buffer1 = initArrayBuffer(gl, new Float32Array(getColor(pinkColor, 38)), 3, gl.FLOAT, 'a_Color');
    mdlMatrix.translate(0.0, 0.9, 0.0);
    mdlMatrix.rotate(joint3, 0.0, 0.0, 1.0);
    pushMatrix();
    gl.uniformMatrix4fv(u_modelMatrix, false, mdlMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, circleVertices.length/2);
    

    buffer0 = initArrayBuffer(gl, new Float32Array(triVertices), 2, gl.FLOAT, 'a_Position');
    buffer1 = initArrayBuffer(gl, new Float32Array(getColor(redColor, 3)), 3, gl.FLOAT, 'a_Color');
    //TODO-2: make the red arm rotate
    mdlMatrix.translate(0, 0.33, 0.0);
    mdlMatrix.rotate(60, 0.0, 0.0, 1.0);
    gl.uniformMatrix4fv(u_modelMatrix, false, mdlMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, 0, triVertices.length/2);//draw the red one

}
