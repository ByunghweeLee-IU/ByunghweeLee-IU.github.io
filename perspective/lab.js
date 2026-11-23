'use strict';
    function renderScene(ctx,w,h,state,{annotations=true,observerX=0,observerZ=0,architecture='piazza',showVP=true,showHorizon=true}={}){
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
      const yaw=(state.yaw||0)*Math.PI/180,cyaw=Math.cos(yaw),syaw=Math.sin(yaw);
      const f=h/(2*Math.tan((state.fov||58)/2*Math.PI/180)), cx=w/2,cy=h/2;
      const horizon=cy+f*Math.tan(pitch);
      function cameraDepth(x,y,z){return ((x-observerX)*syaw+(z-observerZ)*cyaw)*cp+(y-state.height)*sp}
      function proj(x,y,z){
        const relativeX=x-observerX,relativeY=y-state.height;
        const relativeZ=z-observerZ;
        const cameraX=relativeX*cyaw-relativeZ*syaw,cameraZ=relativeX*syaw+relativeZ*cyaw;
        const depth=cameraZ*cp+relativeY*sp;
        if(depth<=0.13)return null;
        return {x:cx+f*cameraX/depth,y:cy-f*(relativeY*cp-cameraZ*sp)/depth,depth};
      }
      // Clip world geometry at the camera before projecting a forward-moving view.
      function crossing(a,b,da,db){const t=(.14-da)/(db-da);return a.map((v,i)=>v+t*(b[i]-v))}
      function projectedFace(corners){
        const clipped=[];
        for(let i=0;i<corners.length;i++){
          const a=corners[i],b=corners[(i+1)%corners.length],da=cameraDepth(...a),db=cameraDepth(...b);
          if(da>=.14)clipped.push(a);
          if((da>=.14)!==(db>=.14))clipped.push(crossing(a,b,da,db));
        }
        return clipped.map(p=>proj(...p));
      }
      function worldSegment(a,b,...style){
        const da=cameraDepth(...a),db=cameraDepth(...b);
        if(da<.14&&db<.14)return;
        if(da<.14)a=crossing(a,b,da,db);
        else if(db<.14)b=crossing(a,b,da,db);
        segment(proj(...a),proj(...b),...style);
      }
      ctx.clearRect(0,0,w,h);
      const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#dce5ea');sky.addColorStop(1,'#f0f3f4');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
      if(horizon<h){const ground=ctx.createLinearGradient(0,Math.max(0,horizon),0,h);ground.addColorStop(0,'#e7dec9');ground.addColorStop(1,'#c8c4ab');ctx.fillStyle=ground;ctx.fillRect(0,Math.max(0,horizon),w,h)}
      // Idealized ground grid, forward (z) lines and transverse (x) lines.
      for(let x=-90;x<=90;x+=6)worldSegment([x,0,2],[x,0,320],'rgba(100,134,122,.32)',1);
      for(let z=3;z<=300;z+=z<36?6:z<100?14:35)worldSegment([-120,0,z],[120,0,z],'rgba(100,134,122,.25)',1);
      // Ground path highlights the horizontal lines converging toward the vanishing point.
      worldSegment([-4,0,2],[-4,0,360],'rgba(255,255,255,.74)',2.8);
      worldSegment([4,0,2],[4,0,360],'rgba(255,255,255,.74)',2.8);
      for(let z=7;z<175;z+=12)worldSegment([0,0,z],[0,0,z+4],'rgba(255,255,255,.8)',2.5);
      // Build every face from shared world-space corners. Only surfaces facing
      // the observer are visible; camera pitch does not reveal a hidden roof.
      const buildingFaces = [];
      function block(x,z,bw,bz,bh,light,dark){
        const a=[x,0,z], b=[x+bw,0,z], c=[x+bw,0,z+bz], d=[x,0,z+bz];
        const at=[x,bh,z], bt=[x+bw,bh,z], ct=[x+bw,bh,z+bz], dt=[x,bh,z+bz];
        function face(corners,fill,panels=[]){
          const points=projectedFace(corners);
          if(points.length<3||points.some(p=>!p))return;
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
          const points=projectedFace(corners);
          if(points.length<3||points.some(p=>!p))return;
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
        face.panels.forEach(([a,b])=>worldSegment(a,b,'rgba(80,120,136,.35)',.9));
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
      return {horizon,forwardVP:{x:cx-f*Math.tan(yaw)/cp,y:horizon},crossVP:Math.abs(syaw)<1e-8?null:{x:cx+f*cyaw/syaw/cp,y:horizon},focal:f,observerZ,project:proj};
    }

const el=id=>document.getElementById(id);
const base={height:1.6,pitch:0,distance:22,person:1.72};
function prepare(id){const canvas=el(id),w=Math.max(280,Math.round(canvas.getBoundingClientRect().width)),h=Math.max(200,Math.round(canvas.getBoundingClientRect().height)),dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return {canvas,ctx,w,h}}
function guides(ctx,w,h,{vp=false,horizon=false,offset=0,height=1.6}={}){
 if(horizon){ctx.save();ctx.strokeStyle='#ad5b3c';ctx.lineWidth=1.8;ctx.setLineDash([9,6]);ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#80513c';ctx.font='bold 12px system-ui,sans-serif';ctx.fillText('Horizon',18,h/2-12);ctx.restore()}
 if(vp){ctx.save();ctx.strokeStyle='#436f7e';ctx.lineWidth=1.8;ctx.setLineDash([6,5]);for(const x of [-4,4]){ctx.beginPath();ctx.moveTo(w/2+(x-offset)*h/2/height,h);ctx.lineTo(w/2,h/2);ctx.stroke()}ctx.setLineDash([]);ctx.beginPath();ctx.arc(w/2,h/2,6,0,Math.PI*2);ctx.fillStyle='#fffdf7';ctx.fill();ctx.strokeStyle='#334b40';ctx.stroke();ctx.fillStyle='#334b40';ctx.font='bold 12px system-ui,sans-serif';ctx.fillText('V · forward VP',w/2+13,h/2-13);ctx.restore()}
}
function drawHeight(){const {canvas,ctx,w,h}=prepare('height-scene'),height=Number(el('eye-height').value);renderScene(ctx,w,h,{...base,height},{showVP:false,showHorizon:true});el('eye-height-value').value=height.toFixed(2)+' m';canvas.setAttribute('aria-label',`Step 1: eye height ${height.toFixed(2)} meters, viewing direction level. Horizon stays at image center.`)}
function sideView(id,pitch,height=1.6){
 const eyeX=38,eyeY=92-(height-1.6)*1.6,ground=119,angle=pitch*Math.PI/180;
 let length=170,endY=eyeY-length*Math.tan(angle);
 if(endY>ground){length=(ground-eyeY)/(-Math.tan(angle));endY=ground}
 if(endY<26){length=(eyeY-26)/Math.tan(angle);endY=26}
 const radius=21,endAngle=-angle,arcX=eyeX+radius*Math.cos(endAngle),arcY=eyeY+radius*Math.sin(endAngle);
 const arc=Math.abs(pitch)<.1?'':`<path d="M ${eyeX+radius} ${eyeY} A ${radius} ${radius} 0 0 ${pitch>0?0:1} ${arcX} ${arcY}" fill="none" stroke="#436f7e" stroke-width="1.3"/>`;
 el(id).innerHTML=`<title>Side view: gaze ${Math.abs(pitch)} degrees ${pitch>0?'above':pitch<0?'below':'along'} the horizontal</title><rect x="1" y="1" width="238" height="148" rx="10" fill="#fffdf7" fill-opacity=".95" stroke="#ddd7c9"/><g font-family="system-ui,sans-serif"><text x="13" y="18" font-size="9" letter-spacing=".8" fill="#697267">SIDE VIEW · PITCH ONLY</text><path d="M15 ${ground}H224" stroke="#bdc3b3" stroke-width="1.5"/><rect x="176" y="48" width="39" height="71" fill="#e4dfcc" stroke="#889b85"/><path d="m171 48 24-17 25 17Z" fill="#b97953" stroke="#889b85"/><path d="M186 119V101Q195 91 204 101V119M176 72H215M176 87H215" fill="none" stroke="#889b85"/><circle cx="${eyeX}" cy="${eyeY}" r="5" fill="#334b40"/><path d="M${eyeX} ${eyeY+7}V${ground-12}m0 0-8 12m8-12 8 12" fill="none" stroke="#334b40" stroke-width="2.6" stroke-linecap="round"/><path d="M${eyeX} ${eyeY}H224" stroke="#ad5b3c" stroke-width="1.2" stroke-dasharray="4 4"/><path d="M${eyeX} ${eyeY}L${eyeX+length} ${endY}" stroke="#436f7e" stroke-width="2" stroke-dasharray="5 3"/>${arc}<text x="69" y="${pitch>0?eyeY-11:eyeY+17}" font-size="11" font-weight="700" fill="#436f7e">${pitch>0?'+':''}${pitch}°</text><text x="18" y="138" font-size="9" fill="#697267">Eye</text><text x="174" y="138" font-size="9" fill="#697267">Building</text></g>`;
}
function pitchAngle(ctx,w,h,pitch,horizon){
 const compact=w<=500,x=w/2+(compact?18:28),y=h/2;
 ctx.save();ctx.strokeStyle='#526d61';ctx.lineWidth=1.5;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,horizon);ctx.stroke();ctx.setLineDash([]);
 for(const yy of [y,horizon]){ctx.beginPath();ctx.moveTo(x-4,yy);ctx.lineTo(x+4,yy);ctx.stroke()}
 const text=`${pitch>0?'+':pitch<0?'−':''}${Math.abs(pitch)}°`;
 const yy=pitch===0?y+(compact?16:22):(y+horizon)/2;
 ctx.font=compact?'600 10px system-ui,sans-serif':'bold 12px system-ui,sans-serif';const tw=ctx.measureText(text).width;
 ctx.fillStyle=compact?'rgba(255,253,247,.65)':'rgba(255,253,247,.85)';ctx.fillRect(x+(compact?6:8),yy-(compact?10:13),tw+(compact?8:12),compact?16:22);ctx.fillStyle='#334b40';ctx.fillText(text,x+(compact?10:14),yy+(compact?1:2));ctx.restore();
}
function drawPitch(){const {canvas,ctx,w,h}=prepare('pitch-scene'),pitch=Number(el('view-pitch').value);const {horizon}=renderScene(ctx,w,h,{...base,pitch},{showVP:false,showHorizon:true});pitchAngle(ctx,w,h,pitch,horizon);sideView('pitch-side',pitch);el('view-pitch-value').value=pitch===0?'Level · 0°':`${pitch>0?'Up':'Down'} · ${Math.abs(pitch)}°`;canvas.setAttribute('aria-label',`Step 2: fixed eye height 1.60 meters, camera pitch ${pitch} degrees. The horizon is ${Math.abs(pitch)} degrees ${pitch>0?'below':pitch<0?'above':'level with'} the central gaze direction.`)}

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
const FAMILY_A='#286b83',FAMILY_B='#92517a';
function cameraGuides(ctx,w,h,{horizon,forwardVP:vp,crossVP,project,observerZ=0},{showVP=true,showB=false,showHorizon=true}={}){
 if(showHorizon){ctx.save();ctx.strokeStyle='#9b8d70';ctx.lineWidth=1.5;ctx.setLineDash([9,6]);ctx.beginPath();ctx.moveTo(0,horizon);ctx.lineTo(w,horizon);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#756448';ctx.font='bold 12px system-ui,sans-serif';ctx.fillText('Horizon',18,horizon>25?horizon-12:horizon+20);ctx.restore()}
 if(showVP||showB){
  function family(target,color,lines,label,dy){
   ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;ctx.setLineDash([5,5]);
   for(const [a,b] of lines){const p=project(...a),q=project(...b);if(!p||!q)continue;
    ctx.beginPath();if(target){const far=Math.hypot(p.x-target.x,p.y-target.y)>Math.hypot(q.x-target.x,q.y-target.y)?p:q;ctx.moveTo(far.x,far.y);ctx.lineTo(target.x,target.y)}
    else{ctx.moveTo(0,p.y);ctx.lineTo(w,p.y)}ctx.stroke();
   }
   ctx.setLineDash([]);ctx.font='bold 12px system-ui,sans-serif';
   if(!target){ctx.textAlign='right';ctx.fillText('B · parallel here (VP at ∞)',w-14,Math.min(h-12,horizon+24))}
   else if(target.x>=10&&target.x<=w-10){ctx.beginPath();ctx.arc(target.x,target.y,6,0,Math.PI*2);ctx.fillStyle='#fffdf7';ctx.fill();ctx.stroke();ctx.fillStyle=color;const right=target.x>w-150;ctx.textAlign=right?'right':'left';ctx.fillText(label,target.x+(right?-12:12),target.y+dy)}
   else{const left=target.x<w/2,x=left?9:w-9;ctx.beginPath();ctx.moveTo(x,target.y);ctx.lineTo(x+(left?10:-10),target.y-6);ctx.lineTo(x+(left?10:-10),target.y+6);ctx.closePath();ctx.fill();ctx.textAlign=left?'left':'right';ctx.fillText((left?'← ':'')+label+' outside'+(left?'':' →'),left?22:w-22,target.y+dy)}ctx.restore();
  }
  if(showVP)family(vp,FAMILY_A,[[[-4,0,observerZ+16],[-4,0,observerZ+150]],[[4,0,observerZ+16],[4,0,observerZ+150]],[[-11,24,118],[-11,24,161]]],'VP A · street',-13);
  if(showB)family(crossVP,FAMILY_B,[[[-11,0,118],[11,0,118]],[[-11,13,118],[11,13,118]],[[-11,24,118],[11,24,118]]],'VP B · across',24);
 }
 ctx.save();ctx.strokeStyle='#334b40';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(w/2-8,h/2);ctx.lineTo(w/2+8,h/2);ctx.moveTo(w/2,h/2-8);ctx.lineTo(w/2,h/2+8);ctx.stroke();ctx.restore();
}
function yawPlan(yaw){
 const a=yaw*Math.PI/180,x=120,y=112,r=23,endX=x+r*Math.sin(a),endY=y-r*Math.cos(a);
 const arc=yaw===0?'':`<path d="M ${x} ${y-r} A ${r} ${r} 0 0 ${yaw>0?1:0} ${endX} ${endY}" fill="none" stroke="#436f7e" stroke-width="1.4"/>`;
 el('yaw-plan').innerHTML=`<title>Top view: gaze turned ${Math.abs(yaw)} degrees ${yaw>0?'right':yaw<0?'left':'straight ahead'}</title><rect x="1" y="1" width="238" height="148" rx="10" fill="#fffdf7" fill-opacity=".96" stroke="#ddd7c9"/><g font-family="system-ui,sans-serif"><text x="12" y="18" font-size="9" letter-spacing=".8" fill="#697267">TOP VIEW · TURNING ONLY</text><path d="M82 29V141M158 29V141" stroke="#bac0ae" stroke-width="2"/><path d="M120 112V32m-5 7 5-7 5 7" stroke="#286b83" stroke-width="1.5" stroke-dasharray="4 3" fill="none"/><text x="130" y="39" font-size="9" fill="#286b83">A · Street</text><path d="M50 112H198m-7-5 7 5-7 5" fill="none" stroke="#92517a" stroke-width="1.3" stroke-dasharray="4 3"/><text x="13" y="108" font-size="9" fill="#92517a">B</text><path d="M120 112L${120+72*Math.sin(a)} ${112-72*Math.cos(a)}" stroke="#436f7e" stroke-width="2"/>${arc}<circle cx="120" cy="112" r="4" fill="#334b40"/><text x="${yaw<0?55:164}" y="78" font-size="11" font-weight="700" fill="#436f7e">${yaw>0?'+':''}${yaw}°</text><text x="12" y="136" font-size="9" fill="#436f7e">Gaze</text><text x="99" y="136" font-size="9" fill="#697267">Observer</text></g>`;
}
function drawYaw(){
 const {canvas,ctx,w,h}=prepare('yaw-scene'),yaw=Number(el('view-yaw').value);
 const result=renderScene(ctx,w,h,{...base,yaw,fov:100},{annotations:false,architecture:'cathedral'});cameraGuides(ctx,w,h,result,{showVP:el('yaw-a').checked,showB:el('yaw-b').checked});
 el('view-yaw-value').value=yaw===0?'Straight ahead · 0°':`${yaw>0?'Right':'Left'} · ${Math.abs(yaw)}°`;yawPlan(yaw);
 el('yaw-status').textContent=yaw===0?'One-point alignment: A is centered; B is at infinity.':`Two finite horizontal VPs: A (blue) and B (purple) share the horizon. ${Math.abs(yaw)===45?'Both fit in this wide-angle view.':'A point may be outside the image.'}`;
 canvas.setAttribute('aria-label',`Step 5: gaze turned ${Math.abs(yaw)} degrees ${yaw>0?'right':yaw<0?'left':'straight ahead'}; the street vanishing point moves ${yaw>0?'left':yaw<0?'right':'to center'} on the horizon.`);
}
el('view-yaw').addEventListener('input',drawYaw);['yaw-a','yaw-b'].forEach(id=>el(id).addEventListener('input',drawYaw));
el('yaw-two-point').addEventListener('click',()=>{el('view-yaw').value=45;el('yaw-a').checked=true;el('yaw-b').checked=true;drawYaw()});
const DEFAULT_TRAVEL=20;
const travel={preview:DEFAULT_TRAVEL,duomo:DEFAULT_TRAVEL};
function drawDuomo(prefix='duomo'){
 const {canvas,ctx,w,h}=prepare(prefix+'-scene');
 const height=Number(el(prefix+'-height').value),offset=Number(el(prefix+'-offset').value),pitch=Number(el(prefix+'-pitch').value),yaw=Number(el(prefix+'-yaw').value);
 const result=renderScene(ctx,w,h,{...base,height,pitch,yaw,fov:100,distance:90},{annotations:false,observerX:offset,observerZ:travel[prefix],architecture:'cathedral'});
 const {horizon,forwardVP:vp,crossVP,project}=result;
 const inside=vp.x>=0&&vp.x<=w;
 cameraGuides(ctx,w,h,result,{showVP:el(prefix+'-vp').checked,showB:el(prefix+'-vpb').checked,showHorizon:el(prefix+'-horizon').checked});
 el(prefix+'-height-value').value=height.toFixed(2)+' m';el(prefix+'-offset-value').value=offset===0?'Centered':`${offset>0?'Right':'Left'} · ${Math.abs(offset).toFixed(1)} m`;
 el(prefix+'-pitch-value').value=pitch===0?'Level · 0°':`${pitch>0?'Up':'Down'} · ${Math.abs(pitch)}°`;el(prefix+'-yaw-value').value=yaw===0?'Ahead · 0°':`${yaw>0?'Right':'Left'} · ${Math.abs(yaw)}°`;
 if(el(prefix+'-horizon').checked)pitchAngle(ctx,w,h,pitch,horizon);
 sideView(prefix+'-side',pitch,height);
 el(prefix+'-status').textContent=`Tilt: ${Math.abs(pitch)}°. ${yaw===0?'A centered; B at infinity.':'A & B share the horizon; VPs may be offscreen.'}`;
 el(prefix+'-travel').value=Number((118-travel[prefix]).toFixed(1))+' m away';
 el(prefix+'-forward').disabled=travel[prefix]>=90;el(prefix+'-back').disabled=travel[prefix]<=-80;
 canvas.setAttribute('aria-label',`Duomo exploration: eye height ${height.toFixed(2)} meters, sideways position ${offset.toFixed(1)} meters, distance to facade ${118-travel[prefix]} meters, pitch ${pitch} degrees, yaw ${yaw} degrees. Horizon ${pitch===0?'at':pitch>0?'below':'above'} center.`);
}
for(const prefix of ['preview','duomo']){
 const canvas=el(prefix+'-scene');
 const setRange=(suffix,value)=>{const input=el(prefix+'-'+suffix),step=Number(input.step)||1;input.value=Math.max(Number(input.min),Math.min(Number(input.max),Math.round(value/step)*step))};
 const moveForward=step=>{travel[prefix]=Math.max(-80,Math.min(90,Math.round((travel[prefix]+step)*10)/10));drawDuomo(prefix)};
 el(prefix+'-forward').addEventListener('click',()=>moveForward(10));
 el(prefix+'-back').addEventListener('click',()=>moveForward(-10));
 let drag=null;
 canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0||!event.isPrimary)return;
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,yaw:Number(el(prefix+'-yaw').value),pitch:Number(el(prefix+'-pitch').value)};
  canvas.setPointerCapture(event.pointerId);canvas.classList.add('is-dragging');canvas.focus({preventScroll:true});
 });
 canvas.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.id)return;
  const bounds=canvas.getBoundingClientRect();
  setRange('yaw',drag.yaw-(event.clientX-drag.x)*160/bounds.width);
  setRange('pitch',drag.pitch+(event.clientY-drag.y)*80/bounds.height);
  drawDuomo(prefix);
 });
 const endDrag=()=>{drag=null;canvas.classList.remove('is-dragging')};
 ['pointerup','pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,endDrag));
 canvas.addEventListener('wheel',event=>{
  if(event.ctrlKey)return;
  event.preventDefault();
  const pixels=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?canvas.clientHeight:1);
  moveForward(-Math.max(-100,Math.min(100,pixels))*.1);
 },{passive:false});
 canvas.addEventListener('keydown',event=>{
  const arrows={ArrowLeft:['yaw',-2],ArrowRight:['yaw',2],ArrowUp:['pitch',2],ArrowDown:['pitch',-2]};
  if(arrows[event.key]){event.preventDefault();const [suffix,delta]=arrows[event.key];setRange(suffix,Number(el(prefix+'-'+suffix).value)+delta);drawDuomo(prefix)}
  else if(event.key==='+'||event.key==='='){event.preventDefault();moveForward(10)}
  else if(event.key==='-'){event.preventDefault();moveForward(-10)}
 });
 el(prefix+'-two-point').addEventListener('click',()=>{el(prefix+'-pitch').value=0;el(prefix+'-yaw').value=45;el(prefix+'-vpb').checked=true;el(prefix+'-vp').checked=true;el(prefix+'-horizon').checked=true;drawDuomo(prefix)});
 el(prefix+'-center').addEventListener('click',()=>{el(prefix+'-pitch').value=0;el(prefix+'-yaw').value=0;drawDuomo(prefix)});
 ['height','offset','pitch','yaw','vp','vpb','horizon'].forEach(suffix=>el(prefix+'-'+suffix).addEventListener('input',()=>drawDuomo(prefix)));
 el(prefix+'-reset').addEventListener('click',()=>{travel[prefix]=DEFAULT_TRAVEL;for(const [suffix,value] of Object.entries({height:1.6,offset:0,pitch:0,yaw:0}))el(prefix+'-'+suffix).value=value;el(prefix+'-vpb').checked=false;el(prefix+'-vp').checked=true;el(prefix+'-horizon').checked=true;drawDuomo(prefix)});
}
document.querySelectorAll('[data-range-reset]').forEach(button=>button.addEventListener('click',()=>{const input=el(button.dataset.rangeReset);input.value=input.defaultValue;input.dispatchEvent(new Event('input',{bubbles:true}))}));
function drawAll(){drawHeight();drawPitch();drawVP();drawMirror();drawYaw();drawDuomo();drawDuomo('preview')}window.addEventListener('resize',drawAll,{passive:true});drawAll();

let layoutFrame;const sceneResize=new ResizeObserver(()=>{cancelAnimationFrame(layoutFrame);layoutFrame=requestAnimationFrame(drawAll)});document.querySelectorAll('.experiment-view').forEach(view=>sceneResize.observe(view));

// Follow the reading position without changing the URL while scrolling.
const contents=el('contents-nav'),contentsSummary=contents.querySelector('summary');
const sectionLinks=[...contents.querySelectorAll('a[data-section]')];
const readingSections=sectionLinks.map(link=>el(link.dataset.section));
const compactContents=window.matchMedia('(max-width:1179px)');
function sizeContents(){contents.open=!compactContents.matches;contentsSummary.tabIndex=compactContents.matches?0:-1}
sizeContents();compactContents.addEventListener('change',sizeContents);
sectionLinks.forEach(link=>link.addEventListener('click',()=>{if(compactContents.matches)contents.open=false}));
let readingFrame=0;
function markReadingSection(){
 readingFrame=0;
 const threshold=Math.min(160,window.innerHeight*.25);
 let active=0;
 readingSections.forEach((section,index)=>{if(section.getBoundingClientRect().top<=threshold)active=index});
 if(window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-2)active=readingSections.length-1;
 sectionLinks.forEach((link,index)=>{if(index===active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')});
 el('contents-current').textContent=sectionLinks[active].lastElementChild.textContent;
}
function queueReadingSection(){if(!readingFrame)readingFrame=requestAnimationFrame(markReadingSection)}
window.addEventListener('scroll',queueReadingSection,{passive:true});
window.addEventListener('resize',queueReadingSection,{passive:true});
window.addEventListener('load',queueReadingSection);
contents.addEventListener('toggle',queueReadingSection);
markReadingSection();

