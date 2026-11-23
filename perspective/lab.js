'use strict';
    function renderScene(ctx,w,h,state,{annotations=true,observerX=0,architecture='piazza',showVP=true,showHorizon=true}={}){
    function polygon(points,fill,stroke,width=1) {
      if(points.some(p=>!p))return;
      ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
      points.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.closePath();
      ctx.fillStyle=fill;ctx.fill();
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}
    }
    function segment(a,b,color,width=1,dash=[]) {
      if(!a||!b)return;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
      ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);
    }
    function circle(x,y,r,fill,stroke){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke()}}
      const pitch=state.pitch*Math.PI/180, cp=Math.cos(pitch),sp=Math.sin(pitch);
      const f=h/(2*Math.tan(29*Math.PI/180)), cx=w/2,cy=h/2;
      const horizon=cy+f*Math.tan(pitch);
      function proj(x,y,z){
        const relativeY=y-state.height,depth=z*cp+relativeY*sp;
        if(depth<=0.13)return null;
        return {x:cx+f*(x-observerX)/depth,y:cy-f*(relativeY*cp-z*sp)/depth,depth};
      }
      ctx.clearRect(0,0,w,h);
      const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#dce5ea');sky.addColorStop(1,'#f0f3f4');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
      if(horizon<h){const ground=ctx.createLinearGradient(0,Math.max(0,horizon),0,h);ground.addColorStop(0,'#e7dec9');ground.addColorStop(1,'#c8c4ab');ctx.fillStyle=ground;ctx.fillRect(0,Math.max(0,horizon),w,h)}
      // Idealized ground grid, forward (z) lines and transverse (x) lines.
      for(let x=-90;x<=90;x+=6){const a=proj(x,0,2),b=proj(x,0,320);segment(a,b,'rgba(100,134,122,.32)',1)}
      for(let z=3;z<=300;z+=z<36?6:z<100?14:35){segment(proj(-120,0,z),proj(120,0,z),'rgba(100,134,122,.25)',1)}
      // Ground path highlights the horizontal lines converging toward the vanishing point.
      segment(proj(-4,0,2),proj(-4,0,360),'rgba(255,255,255,.74)',2.8);
      segment(proj(4,0,2),proj(4,0,360),'rgba(255,255,255,.74)',2.8);
      for(let z=7;z<175;z+=12)segment(proj(0,0,z),proj(0,0,z+4),'rgba(255,255,255,.8)',2.5);
      // Build every face from shared world-space corners. Only surfaces facing
      // the observer are visible; camera pitch does not reveal a hidden roof.
      const buildingFaces = [];
      function block(x,z,bw,bz,bh,light,dark){
        const a=[x,0,z], b=[x+bw,0,z], c=[x+bw,0,z+bz], d=[x,0,z+bz];
        const at=[x,bh,z], bt=[x+bw,bh,z], ct=[x+bw,bh,z+bz], dt=[x,bh,z+bz];
        function face(corners,fill,panels=[]){
          const points=corners.map(v=>proj(...v));
          if(points.some(p=>!p))return;
          buildingFaces.push({points,fill,panels,
            depth:points.reduce((total,p)=>total+p.depth,0)/points.length});
        }
        const divisions=[.25,.5,.75];
        face([a,b,bt,at],light,divisions.map(t=>[[x+bw*t,0,z],[x+bw*t,bh,z]]));
        // On the left of the street we see the right wall; on the right,
        // we see the left wall. Never draw the wall facing away from us.
        if(x+bw<observerX){
          face([b,c,ct,bt],dark,divisions.map(t=>[[x+bw,0,z+bz*t],[x+bw,bh,z+bz*t]]));
        } else if(x>observerX){
          face([d,a,at,dt],dark,divisions.map(t=>[[x,0,z+bz*t],[x,bh,z+bz*t]]));
        }
        if(state.height>bh)face([at,bt,ct,dt],'#c38b69');
      }
      block(-16,42,7,11,10,'#ede3ce','#a3ae98');
      block(11,53,11,15,14,'#dec3a6','#a28a70');
      block(-24,91,11,14,19,'#ddd6bd','#8f9f88');
      block(21,111,10,18,27,'#d8b69c','#9b846f');
      if(architecture==='cathedral'){
        // An imagined Florentine cathedral: pale stone, green marble courses,
        // a gabled facade and an octagonal terracotta dome. All parts use the
        // same world coordinates and depth sorting as the surrounding piazza.
        function surface(corners,fill,panels=[]){
          const points=corners.map(v=>proj(...v));
          if(points.some(p=>!p))return;
          buildingFaces.push({points,fill,panels,depth:points.reduce((s,p)=>s+p.depth,0)/points.length});
        }
        block(-11,118,22,43,24,'#eee9db','#a8b6a6');
        surface([[-11,24,118],[11,24,118],[0,33,118]],'#eee9db');
        // Narrow marble bands sit on the facade instead of floating over it.
        for(const y of [3,8,13,18,23])surface([[-11,y,117.98],[11,y,117.98],[11,y+.5,117.98],[-11,y+.5,117.98]],'#678270');
        // Three inset doorways, with polygonal arches in the facade plane.
        for(const x of [-6,0,6]){
          const width=x===0?2:1.4, height=x===0?7:5;
          surface([[x-width,0,117.9],[x+width,0,117.9],[x+width,height-1,117.9],[x,height,117.9],[x-width,height-1,117.9]],'#536b60');
        }
        const rose=[];
        for(let i=0;i<24;i++){const a=i*Math.PI/12;rose.push([Math.cos(a)*2.5,21+Math.sin(a)*2.5,117.85])}
        surface(rose,'#a58354');
        const panes=[];
        for(let i=0;i<16;i++){const a=i*Math.PI/8;panes.push([Math.cos(a)*1.8,21+Math.sin(a)*1.8,117.8])}
        surface(panes,'#456775');
        // An octagonal drum and curved dome, built from shared rings.
        const rings=[[24,10],[30,10],[35,9.5],[40,7.8],[45,5.1],[48,1.8]];
        function ringPoint(i,y,r){const a=2*Math.PI*i/8+Math.PI/8;return [Math.cos(a)*r,y,145+Math.sin(a)*r]}
        const tiles=['#b96f4a','#c48056','#ab6042','#c98a60','#b56b49','#ae6444','#c47d55','#ce926a'];
        for(let j=0;j<rings.length-1;j++)for(let i=0;i<8;i++){
          const [y0,r0]=rings[j],[y1,r1]=rings[j+1];
          const a=ringPoint(i,y0,r0),b=ringPoint(i+1,y0,r0),c=ringPoint(i+1,y1,r1),d=ringPoint(i,y1,r1);
          surface([a,b,c,d],j===0?'#e5deca':tiles[i]);
        }
        // Small lantern crowning the dome.
        for(let i=0;i<8;i++)surface([ringPoint(i,48,1.8),ringPoint(i+1,48,1.8),ringPoint(i+1,51,1.8),ringPoint(i,51,1.8)],'#ede7d6');
        for(let i=0;i<8;i++)surface([ringPoint(i,51,2.3),ringPoint(i+1,51,2.3),[0,54,145]],'#9a7553');
      }
      // Paint far surfaces first so nearer buildings cover the ones behind.
      buildingFaces.sort((a,b)=>b.depth-a.depth).forEach(face=>{
        polygon(face.points,face.fill,'#7c8976',1);
        face.panels.forEach(([a,b])=>segment(proj(...a),proj(...b),'rgba(80,120,136,.35)',.9));
      });
      function person(x,z,height,color,caption,emphasis=false){
        const yEye=height-.12;
        const p=proj(x,0,z),top=proj(x,height,z),eye=proj(x,yEye,z),hip=proj(x,height*.5,z);
        if(!p||!top||!eye||!hip)return null;
        const ht=Math.abs(p.y-top.y),r=Math.max(1.4,ht*.095);
        const neck=proj(x,height*.78,z),shoulder=proj(x,height*.72,z),arms=proj(x,height*.45,z);
        if(!neck||!shoulder||!arms)return null;
        circle(top.x,top.y+r,r,color);
        segment(neck,hip,color,Math.max(1.2,ht*.067));
        segment({x:shoulder.x-r*1.7,y:shoulder.y},{x:arms.x-r*2,y:arms.y},color,Math.max(1,ht*.045));
        segment({x:shoulder.x+r*1.7,y:shoulder.y},{x:arms.x+r*2,y:arms.y},color,Math.max(1,ht*.045));
        segment(hip,{x:p.x-r*1.15,y:p.y},color,Math.max(1,ht*.052));
        segment(hip,{x:p.x+r*1.15,y:p.y},color,Math.max(1,ht*.052));
        if(eye.x>=-20&&eye.x<=w+20&&eye.y>=-20&&eye.y<=h+20){
          segment({x:eye.x-16,y:eye.y},{x:eye.x+16,y:eye.y},'#3c7894',2,[3,3]);
          if(emphasis){ctx.fillStyle='#285c73';ctx.font='bold 12px system-ui,sans-serif';ctx.textAlign='left';ctx.fillText(caption,Math.min(w-110,Math.max(9,eye.x+19)),Math.max(17,eye.y-10))}
        }
        return {eye,foot:p};
      }
      // Farther person is drawn first, so the scene follows approximate depth order.
      person(-3.3,Math.min(260,state.distance*2.2),state.person,'#6c8793','Far person');
      const focus=person(3.3,state.distance,state.person,'#254c65','Near person',annotations);
      if(annotations){
      // Horizon and vanishing point are separate teaching overlays.
      const inFrame=horizon>=0&&horizon<=h;
      if(showHorizon){
        if(inFrame){
          segment({x:0,y:horizon},{x:w,y:horizon},'#d47738',2,[9,6]);
          ctx.fillStyle='#95501f';ctx.font='bold 12px system-ui,sans-serif';ctx.textAlign='left';
          ctx.fillText('Horizon',13,horizon>28?horizon-11:horizon+20);
        }else{
          ctx.fillStyle='rgba(255,253,247,.9)';ctx.fillRect(12,12,230,33);
          ctx.font='bold 12px system-ui,sans-serif';ctx.fillStyle='#98531e';ctx.textAlign='left';
          ctx.fillText(horizon>h?'↓ Horizon below the image':'↑ Horizon above the image',22,33);
        }
      }
      if(showVP&&inFrame){
        circle(cx,horizon,6,'#526d61','#fffdf7');
        ctx.fillStyle='#334b40';ctx.font='bold 12px system-ui,sans-serif';ctx.textAlign='left';
        ctx.fillText('V · forward VP',cx+12,horizon>25?horizon-12:horizon+22);
      }
      // Optical axis indicator is always at screen center.
      segment({x:cx-9,y:cy},{x:cx+9,y:cy},'#2b4855',1.8);segment({x:cx,y:cy-9},{x:cx,y:cy+9},'#2b4855',1.8);

      }
      return {horizon};
    }

const el=id=>document.getElementById(id);
const base={height:1.6,pitch:0,distance:22,person:1.72};
function prepare(id){const canvas=el(id),w=Math.max(280,Math.round(canvas.getBoundingClientRect().width)),h=Math.round(w/(window.matchMedia('(max-width:700px)').matches?1.4:1.8)),dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return {canvas,ctx,w,h}}
function guides(ctx,w,h,{vp=false,horizon=false,offset=0,height=1.6}={}){
 if(horizon){ctx.save();ctx.strokeStyle='#ad5b3c';ctx.lineWidth=1.8;ctx.setLineDash([9,6]);ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#80513c';ctx.font='bold 12px system-ui,sans-serif';ctx.fillText('Horizon',18,h/2-12);ctx.restore()}
 if(vp){ctx.save();ctx.strokeStyle='#436f7e';ctx.lineWidth=1.8;ctx.setLineDash([6,5]);for(const x of [-4,4]){ctx.beginPath();ctx.moveTo(w/2+(x-offset)*h/2/height,h);ctx.lineTo(w/2,h/2);ctx.stroke()}ctx.setLineDash([]);ctx.beginPath();ctx.arc(w/2,h/2,6,0,Math.PI*2);ctx.fillStyle='#fffdf7';ctx.fill();ctx.strokeStyle='#334b40';ctx.stroke();ctx.fillStyle='#334b40';ctx.font='bold 12px system-ui,sans-serif';ctx.fillText('V · forward VP',w/2+13,h/2-13);ctx.restore()}
}
function drawHeight(){const {canvas,ctx,w,h}=prepare('height-scene'),height=Number(el('eye-height').value);renderScene(ctx,w,h,{...base,height},{showVP:false,showHorizon:true});el('eye-height-value').value=height.toFixed(2)+' m';canvas.setAttribute('aria-label',`Step 1: eye height ${height.toFixed(2)} meters, viewing direction level. Horizon stays at image center.`)}
function drawPitch(){const {canvas,ctx,w,h}=prepare('pitch-scene'),pitch=Number(el('view-pitch').value);renderScene(ctx,w,h,{...base,pitch},{showVP:false,showHorizon:true});el('view-pitch-value').value=pitch===0?'Level · 0°':`${pitch>0?'Up':'Down'} · ${Math.abs(pitch)}°`;canvas.setAttribute('aria-label',`Step 2: fixed eye height 1.60 meters, camera pitch ${pitch} degrees. Horizon moves ${pitch>0?'down':pitch<0?'up':'to center'}.`)}
function drawVP(){const {ctx,w,h}=prepare('vp-scene');renderScene(ctx,w,h,base,{annotations:false});guides(ctx,w,h,{vp:el('vp-visible').checked,horizon:el('horizon-visible').checked})}
let mirrorOn=true;
function drawMirror(){
 const {canvas,ctx,w,h}=prepare('mirror-scene'),offset=Number(el('mirror-offset').value),coverage=Number(el('mirror-reveal').value),share=mirrorOn?coverage/100:0;
 renderScene(ctx,w,h,base,{annotations:false,observerX:offset,architecture:'cathedral'});
 guides(ctx,w,h,{vp:el('mirror-vp').checked,horizon:el('mirror-horizon').checked,offset});
 if(share>0){ctx.save();ctx.beginPath();ctx.rect(0,0,w*share,h);ctx.clip();renderScene(ctx,w,h,base,{annotations:false,architecture:'cathedral'});ctx.fillStyle='rgba(181,130,66,.09)';ctx.fillRect(0,0,w,h);guides(ctx,w,h,{vp:el('mirror-vp').checked,horizon:el('mirror-horizon').checked});ctx.restore()}
 el('mirror-frame').style.setProperty('--mirror-share',`${share*100}%`);el('mirror-frame').classList.toggle('has-panel',share>0);el('mirror-divider').hidden=!mirrorOn;el('mirror-divider').setAttribute('aria-valuenow',coverage);el('mirror-divider').setAttribute('aria-valuetext',`${coverage} percent reflected painting`);el('mirror-badge').hidden=share<.18;el('mirror-direct-badge').hidden=share>.82;el('mirror-toggle').textContent=mirrorOn?'Hide mirror':'Show mirror';el('mirror-toggle').setAttribute('aria-pressed',mirrorOn);
 el('mirror-offset-value').value=offset===0?'Centered':`${offset>0?'Right':'Left'} · ${Math.abs(offset).toFixed(1)} m`;el('mirror-reveal-value').value=coverage+'%';el('mirror-status').textContent=offset===0?'Centered: the two views line up.':'Moved sideways: the direct view shifts; the painting stays fixed.';
 canvas.setAttribute('aria-label',`Step 4: ${Math.round(share*100)} percent fixed painting, current view shifted ${offset.toFixed(1)} meters sideways.`)
}
el('eye-height').addEventListener('input',drawHeight);el('view-pitch').addEventListener('input',drawPitch);['vp-visible','horizon-visible'].forEach(id=>el(id).addEventListener('change',drawVP));['mirror-offset','mirror-reveal','mirror-vp','mirror-horizon'].forEach(id=>el(id).addEventListener('input',drawMirror));el('mirror-toggle').addEventListener('click',()=>{mirrorOn=!mirrorOn;drawMirror()});el('mirror-reset').addEventListener('click',()=>{el('mirror-offset').value=0;el('mirror-reveal').value=50;mirrorOn=true;drawMirror()});
const divider=el('mirror-divider');let dragging=false;
function dragMirror(event){const r=el('mirror-frame').getBoundingClientRect();el('mirror-reveal').value=Math.round(Math.max(0,Math.min(100,(event.clientX-r.left)/r.width*100)));drawMirror()}
divider.addEventListener('pointerdown',event=>{if(event.button!==0)return;dragging=true;divider.setPointerCapture(event.pointerId);dragMirror(event)});divider.addEventListener('pointermove',event=>{if(dragging)dragMirror(event)});['pointerup','pointercancel','lostpointercapture'].forEach(type=>divider.addEventListener(type,()=>{dragging=false}));divider.addEventListener('keydown',event=>{const value=Number(el('mirror-reveal').value),step=event.shiftKey?10:1,next=event.key==='ArrowLeft'?value-step:event.key==='ArrowRight'?value+step:event.key==='Home'?0:event.key==='End'?100:null;if(next!==null){event.preventDefault();el('mirror-reveal').value=Math.max(0,Math.min(100,next));drawMirror()}});
function drawAll(){drawHeight();drawPitch();drawVP();drawMirror()}window.addEventListener('resize',drawAll,{passive:true});drawAll();
