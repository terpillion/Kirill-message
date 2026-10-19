(() => {
  'use strict';
  const clamp = value => Math.min(1,Math.max(0,value));
  const smooth = value => { const p=clamp(value); return p*p*(3-2*p); };

  function sampleCampaign(progress, width, height, photoHeight, arrowWidth) {
    const p=clamp(progress);
    const flight=smooth((p-.30)/.70);
    return {
      progress:p,
      flight,
      photoY:-((height+photoHeight)/2+48)*flight,
      arrowX:(width+arrowWidth)*flight,
      arrowY:height*.8*flight,
      arrowRotation:72*flight,
      background:1-smooth((flight-.62)/.38),
      phase:p>=1?'complete':p>.30?'exiting':'holding',
    };
  }
  if(typeof module==='object' && module.exports){module.exports={sampleCampaign};return;}

  const section=document.querySelector('.campaign');
  const photo=section?.querySelector('.campaign-image');
  const image=photo?.querySelector('img');
  if(!section || !photo || !image || !('IntersectionObserver' in window)) return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const runway=document.createElement('div');runway.className='campaign-runway';
  const view=document.createElement('div');view.className='campaign-view';
  photo.before(runway);runway.append(view);view.append(photo);
  photo.classList.remove('reveal','is-visible');
  image.src='p10-01.jpg';image.width=986;image.height=1085;image.loading='eager';
  image.alt='Фотография из раздела «Информационная кампания»';
  section.classList.add('campaign-spotlight');
  const arrows=[];
  for(const side of [-1,1]){
    for(let row=0;row<3;row++){
      const arrow=document.createElement('div');
      arrow.className='campaign-arrow';arrow.setAttribute('aria-hidden','true');
      arrow.innerHTML='<svg viewBox="0 0 160 60" focusable="false"><path d="M0 25H115V10L160 30L115 50V35H0Z"/></svg>';
      view.append(arrow);arrows.push({element:arrow,side,row,baseAngle:side===-1?(1-row)*12:180-(1-row)*12});
    }
  }
  let geometry={width:1,height:1,photoHeight:1,arrowWidth:1,travel:1};
  let frame=0;
  const reveal=new IntersectionObserver(entries=>{
    if(entries.some(entry=>entry.isIntersecting)){
      view.classList.add('is-revealed');reveal.disconnect();
    }
  },{threshold:.22});
  reveal.observe(view);

  function measure(){
    const width=view.clientWidth,height=view.clientHeight;
    const photoWidth=photo.offsetWidth,photoHeight=photo.offsetHeight;
    const arrowWidth=Math.min(170,Math.max(70,width*.15));
    const photoLeft=(width-photoWidth)/2,photoTop=(height-photoHeight)/2;
    const arrowHeight=arrowWidth*60/160;
    arrows.forEach(arrow=>{
      const {element,side,row,baseAngle}=arrow;
      const x=side===-1?Math.max(8,photoLeft-arrowWidth*.80):Math.min(width-arrowWidth-8,photoLeft+photoWidth-arrowWidth*.20);
      arrow.exitX=side===-1?-(x+arrowWidth+32):width-x+32;
      element.style.width=`${arrowWidth}px`;
      element.style.left=`${x}px`;
      element.style.top=`${photoTop+photoHeight*(.22+.28*row)-arrowHeight/2}px`;
      element.style.rotate=`${baseAngle}deg`;
    });
    geometry={width,height,photoHeight,arrowWidth,travel:Math.max(1,runway.offsetHeight-height)};
    requestRender();
  }
  function render(){
    frame=0;
    const progress=reduced.matches?0:clamp(-runway.getBoundingClientRect().top/geometry.travel);
    const pose=sampleCampaign(progress,geometry.width,geometry.height,geometry.photoHeight,geometry.arrowWidth);
    section.dataset.campaignPhase=pose.phase;
    section.dataset.campaignProgress=progress.toFixed(4);
    photo.style.transform=`translate3d(0,${pose.photoY.toFixed(3)}px,0)`;
    view.style.backgroundColor=`rgba(0,0,0,${pose.background.toFixed(4)})`;
    arrows.forEach(({element,side,row,baseAngle,exitX})=>{
      element.style.translate=`${(exitX*pose.flight).toFixed(3)}px ${((row-1)*pose.arrowY).toFixed(3)}px`;
      element.style.rotate=`${(baseAngle+side*pose.arrowRotation).toFixed(3)}deg`;
    });
  }
  function requestRender(){if(!frame)frame=requestAnimationFrame(render);}
  addEventListener('scroll',requestRender,{passive:true});
  addEventListener('resize',measure,{passive:true});
  addEventListener('load',measure,{once:true});
  reduced.addEventListener('change',measure);
  measure();
})();
