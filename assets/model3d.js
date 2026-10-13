/* Original procedural WebGL pouf. Artistic study, not manufacturer geometry.
   No remote library, cookies, analytics, network request or product specification. */
(() => {
 'use strict';
 const TAU = Math.PI * 2;
 const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
 const signedPow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
 function surface(u, v) {
   const ring = signedPow(Math.cos(v), .44);
   const ripple = 1; // Ribbed material is rendered separately; keep the silhouette smooth.
   return [1.02 * ring * signedPow(Math.cos(u), .36) * ripple,
     .70 * signedPow(Math.sin(v), .44),
     .87 * ring * signedPow(Math.sin(u), .36) * ripple];
 }
 function cross(a,b) {return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
 function normalized(v) {const l=Math.hypot(...v)||1;return v.map(x=>x/l);}
 function meshData() {
   const rows=96,cols=240,p=[],n=[],idx=[],h=.0005;
   for(let j=0;j<=rows;j++){
     const v=-Math.PI/2+j/rows*Math.PI;
     for(let i=0;i<=cols;i++){
       const u=i/cols*TAU,pos=surface(u,v);p.push(...pos);
       if(j===0||j===rows){n.push(0,j===0?-1:1,0);continue;}
       const a=surface(u+h,v),b=surface(u-h,v),c=surface(u,v+h),d=surface(u,v-h);
       const du=a.map((x,k)=>x-b[k]),dv=c.map((x,k)=>x-d[k]);
       n.push(...normalized(cross(dv,du)));
     }
   }
   for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
     const a=j*(cols+1)+i,b=a+cols+1;
     idx.push(a,b,a+1,a+1,b,b+1);
   }
   return {p:new Float32Array(p),n:new Float32Array(n),idx:new Uint16Array(idx)};
 }
 const vert=`attribute vec3 aPosition;attribute vec3 aNormal;
 uniform mat4 uMVP;uniform mat4 uModel;
 varying vec3 vNormal;varying vec3 vLocalNormal;varying vec3 vPosition;varying vec3 vWorld;
 void main(){vPosition=aPosition;vLocalNormal=aNormal;vNormal=mat3(uModel)*aNormal;vWorld=(uModel*vec4(aPosition,1.0)).xyz;gl_Position=uMVP*vec4(aPosition,1.0);}`;
 const frag=`precision highp float;
 uniform vec3 uColor;uniform float uLabel;
 varying vec3 vNormal;varying vec3 vLocalNormal;varying vec3 vPosition;varying vec3 vWorld;
 float grain(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
 void main(){
  vec3 N=normalize(vNormal);vec3 LN=normalize(vLocalNormal);
  vec3 L=normalize(vec3(-2.7,4.5,4.0));vec3 R=normalize(vec3(3.3,1.1,-2.0));
  float coord=mix(vPosition.x,vPosition.z,smoothstep(.42,.87,abs(LN.x)));
  float rib=pow(.5+.5*cos(coord*105.0),.62);
  float fibers=(grain(vPosition*1700.0)-.5)*.075;
  float weave=.89+.12*rib+fibers;
  float key=max(dot(N,L),0.0);float rim=max(dot(N,R),0.0);
  float hemi=.46+.12*N.y;
  vec3 V=normalize(vec3(0.0,1.0,4.6)-vWorld);
  float sheen=pow(1.0-max(dot(N,V),0.0),3.0)*.15;
  vec3 color=uColor*weave*(hemi+.55*key)+vec3(.95,.90,.85)*rim*.13+sheen*vec3(.78,.83,.86);
  float fineRib=(sin(coord*105.0)*.035)*key;
  color+=fineRib;
  if(uLabel>.5){color=vec3(.065,.063,.065)*(hemi+.55*key);}
  gl_FragColor=vec4(clamp(color,0.0,1.0),1.0);
 }`;
 function identity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);}
 function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
 function rotX(t){const a=identity(),c=Math.cos(t),s=Math.sin(t);a[5]=c;a[6]=s;a[9]=-s;a[10]=c;return a;}
 function rotY(t){const a=identity(),c=Math.cos(t),s=Math.sin(t);a[0]=c;a[2]=-s;a[8]=s;a[10]=c;return a;}
 function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),a=new Float32Array(16);a[0]=f/aspect;a[5]=f;a[10]=(far+near)/(near-far);a[11]=-1;a[14]=2*far*near/(near-far);return a;}
 // A real geometry-based Canvas 2D renderer keeps the object rotatable even
 // on school PCs that disable WebGL. This is not a flat-image rotation.
 function createSoftware(canvas) {
  const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)throw new Error('Canvas unavailable');
  const rows=48,cols=96,faces=[];
  function normalAt(u,v){if(Math.abs(v)>1.569)return [0,Math.sign(v),0];const h=.0008,a=surface(u+h,v),b=surface(u-h,v),c=surface(u,v+h),d=surface(u,v-h);return normalized(cross(c.map((x,k)=>x-d[k]),a.map((x,k)=>x-b[k])));}
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
   const u=i/cols*TAU,v=-Math.PI/2+j/rows*Math.PI,du=TAU/cols,dv=Math.PI/rows;
   faces.push({points:[surface(u,v),surface(u+du,v),surface(u+du,v+dv),surface(u,v+dv)],normal:normalAt(u+du/2,v+dv/2),grain:1+Math.sin(i*77+j*181)*.003});
  }
  const ribs=[],arc=[0],samples=2400;let previous=surface(0,0),length=0;
  for(let i=1;i<=samples;i++){const current=surface(i/samples*TAU,0);length+=Math.hypot(current[0]-previous[0],current[2]-previous[2]);arc.push(length);previous=current;}
  let arcIndex=0;
  for(let i=0;i<112;i++){const target=(i+.3)/112*length;while(arcIndex<samples&&arc[arcIndex]<target)arcIndex++;const u=arcIndex/samples*TAU,line=[];for(let j=0;j<=52;j++){const v=-1.52+j/52*3.04;line.push({p:surface(u,v),n:normalAt(u,v)});}ribs.push(line);}
  let yaw=-.48,pitch=.26,color=[137,145,151],enabled=true,reduced=false,inView=false,dragging=false,lx=0,ly=0,lastInteract=0,frame=0,lastDraw=0,destroyed=false;
  const key=normalized([-2.7,4.5,4]),rim=normalized([3.3,1.1,-2]);
  function draw(now=performance.now()){
   if(destroyed||!enabled)return;
   const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
   const dpr=Math.min(devicePixelRatio||1,1.5);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
   const cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch),cam=w/h<.8?5.45:w/h<1?4.85:4.35,scale=h*1.45;
   const rotate=p=>{const x=p[0]*cy+p[2]*sy,z=-p[0]*sy+p[2]*cy;return [x,p[1]*cx-z*sx,p[1]*sx+z*cx];};
   const project=p=>[w*.5+p[0]*scale/(cam-p[2]),h*.475-p[1]*scale/(cam-p[2])];
   const visible=[];
   for(const f of faces){const n=rotate(f.normal),pts=f.points.map(rotate),center=pts.reduce((a,p)=>a.map((v,k)=>v+p[k]/4),[0,0,0]);if(n[0]*(-center[0])+n[1]*(-center[1])+n[2]*(cam-center[2])<-.06)continue;visible.push({f,n,pts,z:center[2]});}
   visible.sort((a,b)=>a.z-b.z);
   for(const {f,n,pts} of visible){
    const light=(.48+.12*n[1]+.54*Math.max(0,n[0]*key[0]+n[1]*key[1]+n[2]*key[2]))*f.grain;
    const rimLight=.085*Math.max(0,n[0]*rim[0]+n[1]*rim[1]+n[2]*rim[2]);
    const rgb=color.map(c=>Math.round(clamp(c*light+rimLight*220,0,255)));ctx.fillStyle=ctx.strokeStyle=`rgb(${rgb.join(',')})`;ctx.lineWidth=.7;ctx.beginPath();pts.forEach((p,i)=>{const q=project(p);i?ctx.lineTo(...q):ctx.moveTo(...q);});ctx.closePath();ctx.fill();ctx.stroke();
   }
   // Corduroy grooves follow the curved surface, including the top.
   ctx.strokeStyle='rgba(30,32,35,.19)';ctx.lineWidth=Math.max(.65,w/670);ctx.lineJoin='round';
   for(const line of ribs){let pen=false;ctx.beginPath();for(const point of line){const p=rotate(point.p),n=rotate(point.n);if(n[0]*(-p[0])+n[1]*(-p[1])+n[2]*(cam-p[2])>.03){const q=project(p);if(pen)ctx.lineTo(...q);else{ctx.moveTo(...q);pen=true;}}else pen=false;}ctx.stroke();}
   const front=rotate([0,0,1]);if(front[2]>.03){ctx.fillStyle='#29292b';ctx.beginPath();[[-.43,-.27,.875],[-.14,-.27,.875],[-.14,-.185,.879],[-.43,-.185,.879]].map(rotate).map(project).forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill();}
   canvas.dataset.rendered='true';canvas.dataset.renderer='software-3d';
  }
  function tick(now){frame=0;if(!enabled||!inView||document.hidden||destroyed)return;if(now-lastDraw>38){if(!dragging&&!reduced&&now-lastInteract>1900)yaw+=.006;draw(now);lastDraw=now;}if(!reduced||dragging)frame=requestAnimationFrame(tick);}
  function wake(){if(!frame&&enabled&&inView&&!document.hidden)frame=requestAnimationFrame(tick);}
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;dragging=true;lx=e.clientX;ly=e.clientY;canvas.setPointerCapture?.(e.pointerId);lastInteract=performance.now();wake();});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;yaw+=(e.clientX-lx)*.009;pitch=clamp(pitch+(e.clientY-ly)*.005,-.55,.78);lx=e.clientX;ly=e.clientY;lastInteract=performance.now();draw();});
  const release=()=>{dragging=false;lastInteract=performance.now();wake();};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
  canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')yaw-=.16;if(e.key==='ArrowRight')yaw+=.16;if(e.key==='ArrowUp')pitch=clamp(pitch-.1,-.55,.78);if(e.key==='ArrowDown')pitch=clamp(pitch+.1,-.55,.78);if(e.key==='Home'){yaw=-.48;pitch=.26;}lastInteract=performance.now();draw();});
  const observer=new IntersectionObserver(([e])=>{inView=e.isIntersecting;if(inView)wake();else{cancelAnimationFrame(frame);frame=0;}},{threshold:.03});observer.observe(canvas);
  const resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>draw()):null;resize?.observe(canvas);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else wake();});draw();
  return {setColor(name){color=({grey:[137,145,151],sand:[193,171,139],light:[195,195,189]})[name]||color;draw();},setEnabled(v){enabled=v;if(v){draw();wake();}else{cancelAnimationFrame(frame);frame=0;}},setReducedMotion(v){reduced=v;draw();wake();},reset(){yaw=-.48;pitch=.26;lastInteract=performance.now();draw();},render:draw,destroy(){destroyed=true;cancelAnimationFrame(frame);observer.disconnect();resize?.disconnect();}};
 }

 function create(canvas,{onError=()=>{}}={}) {
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true,powerPreference:'low-power'});
  if(!gl)return createSoftware(canvas);
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const e=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(e);}return s;};
  const vs=shader(gl.VERTEX_SHADER,vert),fs=shader(gl.FRAGMENT_SHADER,frag),program=gl.createProgram();
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  const loc={p:gl.getAttribLocation(program,'aPosition'),n:gl.getAttribLocation(program,'aNormal'),mvp:gl.getUniformLocation(program,'uMVP'),model:gl.getUniformLocation(program,'uModel'),color:gl.getUniformLocation(program,'uColor'),label:gl.getUniformLocation(program,'uLabel')};
  const allBuffers=[];
  function makeBuffer(target,data){const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,data,gl.STATIC_DRAW);allBuffers.push(b);return b;}
  function upload(data){return {p:makeBuffer(gl.ARRAY_BUFFER,data.p),n:makeBuffer(gl.ARRAY_BUFFER,data.n),idx:makeBuffer(gl.ELEMENT_ARRAY_BUFFER,data.idx),count:data.idx.length};}
  const body=upload(meshData());
  const label=upload({p:new Float32Array([-.43,-.27,.872,-.14,-.27,.872,-.14,-.185,.876,-.43,-.185,.876]),n:new Float32Array([0,0,1,0,0,1,0,0,1,0,0,1]),idx:new Uint16Array([0,1,2,0,2,3])});
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);
  let yaw=-.48,pitch=.24,color=[.53,.57,.60],enabled=true,reduced=false,inView=false,dragging=false,lastX=0,lastY=0,velocity=0,lastInteraction=0,frame=0,lastFrame=0,destroyed=false,lost=false;
  const dpr=()=>Math.min(window.devicePixelRatio||1,1.7);
  function draw(now=performance.now()){
   if(destroyed||lost)return;
   const w=Math.max(1,Math.round(canvas.clientWidth*dpr())),h=Math.max(1,Math.round(canvas.clientHeight*dpr()));
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);
   gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
   const aspect=w/h,proj=perspective(38*Math.PI/180,aspect,.1,100),view=identity();
   view[14]=aspect<.8?-5.45:aspect<1?-4.85:-4.35;view[13]=.04;
   const model=mul(rotX(pitch),rotY(yaw));
   gl.uniformMatrix4fv(loc.model,false,model);gl.uniformMatrix4fv(loc.mvp,false,mul(mul(proj,view),model));gl.uniform3fv(loc.color,new Float32Array(color));
   function renderMesh(m,isLabel){gl.bindBuffer(gl.ARRAY_BUFFER,m.p);gl.vertexAttribPointer(loc.p,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(loc.p);gl.bindBuffer(gl.ARRAY_BUFFER,m.n);gl.vertexAttribPointer(loc.n,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(loc.n);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.idx);gl.uniform1f(loc.label,isLabel);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_SHORT,0);}
   renderMesh(body,0);renderMesh(label,1);
   canvas.dataset.rendered='true';
  }
  function tick(now){frame=0;if(destroyed||!enabled||!inView||document.hidden||lost)return;
   const dt=Math.min((now-lastFrame)||16,34);lastFrame=now;
   if(!dragging&&!reduced){if(Math.abs(velocity)>.00003){yaw+=velocity*dt;velocity*=.94;}else if(now-lastInteraction>1900){yaw+=dt*.00016;}}
   draw(now);if(!reduced||dragging)frame=requestAnimationFrame(tick);
  }
  function wake(){if(!frame&&enabled&&inView&&!document.hidden&&!lost)frame=requestAnimationFrame(tick);}
  function pointerDown(e){if(e.pointerType==='mouse'&&e.button!==0)return;dragging=true;lastX=e.clientX;lastY=e.clientY;velocity=0;lastInteraction=performance.now();canvas.setPointerCapture?.(e.pointerId);wake();}
  function pointerMove(e){if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;yaw+=dx*.009;pitch=clamp(pitch+dy*.005,-.55,.78);velocity=dx*.00045;lastX=e.clientX;lastY=e.clientY;lastInteraction=performance.now();draw();}
  function pointerUp(){dragging=false;lastInteraction=performance.now();wake();}
  function keydown(e){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();lastInteraction=performance.now();velocity=0;if(e.key==='ArrowLeft')yaw-=.16;if(e.key==='ArrowRight')yaw+=.16;if(e.key==='ArrowUp')pitch=clamp(pitch-.1,-.55,.78);if(e.key==='ArrowDown')pitch=clamp(pitch+.1,-.55,.78);if(e.key==='Home'){yaw=-.48;pitch=.24;}draw();}
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerUp);canvas.addEventListener('keydown',keydown);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;if(frame)cancelAnimationFrame(frame);frame=0;onError();});
  const observer=new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;if(inView)wake();else{cancelAnimationFrame(frame);frame=0;}},{threshold:.03});observer.observe(canvas);
  const resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{draw();wake();}):null;resize?.observe(canvas);
  const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else wake();};document.addEventListener('visibilitychange',visibility);
  draw();
  return {setColor(name){color=({grey:[.53,.57,.60],sand:[.76,.68,.56],light:[.75,.76,.74]})[name]||color;lastInteraction=performance.now();draw();},setEnabled(value){enabled=value;if(enabled){draw();wake();}else{cancelAnimationFrame(frame);frame=0;}},setReducedMotion(value){reduced=value;velocity=0;draw();wake();},reset(){yaw=-.48;pitch=.24;velocity=0;lastInteraction=performance.now();draw();},render:draw,destroy(){destroyed=true;cancelAnimationFrame(frame);observer.disconnect();resize?.disconnect();document.removeEventListener('visibilitychange',visibility);for(const b of allBuffers)gl.deleteBuffer(b);gl.deleteProgram(program);}};
 }
 window.Pouf3D={create};
})();
