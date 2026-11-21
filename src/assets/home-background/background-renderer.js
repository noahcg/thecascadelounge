import { vertexShader, fragmentShader } from './scene-shaders.js';
import { SOURCE } from './scene-config.js';

// Background canvas only. This helper does not create or modify site content.
export class PhotoRenderer {
  constructor(canvas, image) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', {
      alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false,
      preserveDrawingBuffer: false, powerPreference: 'low-power'
    });
    if (!this.gl) throw new Error('WebGL unavailable');
    const gl = this.gl;
    this.shaders = [];
    try {
      const compile = (type, text) => {
        const shader = gl.createShader(type);
        this.shaders.push(shader);
        gl.shaderSource(shader, text);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          throw new Error(gl.getShaderInfoLog(shader));
        }
        return shader;
      };
      this.program = gl.createProgram();
      gl.attachShader(this.program, compile(gl.VERTEX_SHADER, vertexShader));
      gl.attachShader(this.program, compile(gl.FRAGMENT_SHADER, fragmentShader));
      gl.linkProgram(this.program);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error('Shader link failed');
      gl.useProgram(this.program);
      this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(this.program, 'a_position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      this.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      canvas.width = SOURCE.width;
      canvas.height = SOURCE.height;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1i(gl.getUniformLocation(this.program, 'u_image'), 0);
      this.time = gl.getUniformLocation(this.program, 'u_time');
      this.amount = gl.getUniformLocation(this.program, 'u_amount');
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  render(time, amount) {
    const gl = this.gl;
    gl.uniform1f(this.time, time);
    gl.uniform1f(this.amount, amount);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  destroy() {
    const gl = this.gl;
    if (!gl) return;
    if (this.texture) gl.deleteTexture(this.texture);
    if (this.buffer) gl.deleteBuffer(this.buffer);
    if (this.program) gl.deleteProgram(this.program);
    for (const shader of this.shaders || []) gl.deleteShader(shader);
  }
}
