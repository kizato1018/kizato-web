var VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    varying vec4 v_Color;
    void main(){
        gl_Position = a_Position;
        gl_PointSize = 10.0;
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

function main(){
    var canvas = document.getElementById('webgl');

    var gl = canvas.getContext('webgl2');
    if(!gl){
        console.log('Failed to get the rendering context for WebGL');
        return ;
    }
    let renderProgram = compileShader(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    gl.useProgram(renderProgram);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    //mouse event
    canvas.onmousedown = function(ev){click(ev, gl, renderProgram)}
    window.onkeydown = function(ev){change(ev)}
}

const shapes = ["triangle", "square", "pentagon", "circle"];
const colors = ["red", "green", "blue"];
const rgba = {"red": [1.0, 0.0, 0.0], "green": [0.0, 1.0, 0.0], "blue": [0.0, 0.0, 1.0]};
current_shape = "triangle";
current_color = "red";
ga_index = {"triangle": 0, "square": 0, "pentagon": 0, "circle": 0};
ga_points = {"triangle": [], "square": [], "pentagon": [], "circle": []}; // store all clicked positions
ga_colors = {"triangle": [], "square": [], "pentagon": [], "circle": []}; // store colors of each points
for(let shape of shapes) {
  ga_points[shape] = new Array(3);
  ga_colors[shape] = new Array(3);
}
g_points = []
g_colors = []
function click(ev, gl, renderProgram){
    var x = ev.clientX;
    var y = ev.clientY;
    var rect = ev.target.getBoundingClientRect();
    console.log("x: " + x);
    console.log("y: " + y);
    console.log("rect. left, top, width, height: " + rect.left + " "  + rect.top + " " + rect.width + " " + rect.height );

    //Todo-1: convert x and y to canvas space and normal them to (-1, 1) for webgl to use
    x = -1 + (x - rect.left) / rect.width * 2
    y = 1 - (y - rect.top) / rect.height * 2

    //put mouse click position to g_points
    var index = ga_index[current_shape];
    ga_points[current_shape][index] = {"x": x, "y": y};
    ga_colors[current_shape][index] = current_color;
    ga_index[current_shape] = (index+1)%3;
    draw(gl, renderProgram)
}

function change(ev) {
    var key = ev.key;
    // console.log(key);
    switch(key){
        case 't':
            current_shape = "triangle";
            break;
        case 's':
            current_shape = "square";
            break;
        case 'p':
            current_shape = "pentagon";
            break;
        case 'c':
            current_shape = "circle";
            break;    
        case 'r':
            current_color = "red";
            break;
        case 'g':
            current_color = "green";
            break;
        case 'b':
            current_color = "blue";
            break;
        default:
            break;
    }
}

function point2vertices() {
    var vertices = []
    for(let shape of shapes) {
        var n = 0;
        var radius = 0.1;
        var radian = 0;
        var theata = 0;
        // console.log(shape)
        switch(shape) {
            case "triangle":
                n = 3;
                theata = Math.PI*2 / n;
                radian = Math.PI / 2;
                break;
            case "square":
                n = 4;
                theata = Math.PI*2 / n;
                radian = Math.PI / 4;
                break;
            case "pentagon":
                n = 5;
                theata = Math.PI*2 / n;
                radian = Math.PI / 2 - theata;
                break;
            case "circle":
                n = 360;
                theata = Math.PI*2 / n;
                radian = 0;
                break;
            default:
                console.log("shape error!");
                break;
        }
        for(let shape_index = 0; shape_index < 3; ++shape_index) {
            if(!ga_points[shape][shape_index]) break;
            let point = [ga_points[shape][shape_index].x, ga_points[shape][shape_index].y].concat(rgba[ga_colors[shape][shape_index]]);
            let tmp_vertices = []
            for(let shape_vertice = 0; shape_vertice < n; ++shape_vertice) {
                let x = ga_points[shape][shape_index].x + Math.cos(radian+theata*shape_vertice) * radius;
                let y = ga_points[shape][shape_index].y + Math.sin(radian+theata*shape_vertice) * radius;
                let [r,g,b] = rgba[ga_colors[shape][shape_index]];
                tmp_vertices[shape_vertice] = [x,y,r,g,b]; 
            }
            // console.log(point)
            // console.log(tmp_vertices);
            for(let i = 0; i < n; ++i) {
                vertices = vertices.concat(point);
                vertices = vertices.concat(tmp_vertices[i]);
                vertices = vertices.concat(tmp_vertices[(i+1)%n])
            }
            // console.log(vertices);
        }

    }
    
    return vertices;
}

function initVertexBuffers(gl, program){
    var vertices = new Float32Array(point2vertices());
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    var FSIZE = vertices.BYTES_PER_ELEMENT;

    var a_Position = gl.getAttribLocation(program, 'a_Position');
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE*5, 0);
    gl.enableVertexAttribArray(a_Position);

    var a_Color = gl.getAttribLocation(program, 'a_Color');
    gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE*5, FSIZE*2);
    gl.enableVertexAttribArray(a_Color);
    return vertices.length
}

function draw(gl ,renderProgram) {
    var n = initVertexBuffers(gl, renderProgram);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, n);
}