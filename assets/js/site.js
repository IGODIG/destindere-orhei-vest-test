(function(){
  const app=document.getElementById("app"),nav=document.getElementById("mainNav");
  const esc=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const attr=v=>esc(v).replace(/'/g,"&#39;");
  const formatDate=v=>v?new Intl.DateTimeFormat("ro-RO",{day:"numeric",month:"long",year:"numeric"}).format(new Date(v+"T12:00:00")):"";
  const eventStarted=cfg=>Date.now()>=new Date((cfg.event?.date||"")+"T"+(cfg.event?.time||"00:00")+":00").getTime();
  const section=(id,cl,inner)=>'<section class="'+cl+'" id="'+id+'"><div class="container">'+inner+"</div></section>";

  function moduleEnabled(cfg,id){
    const m=(cfg.modules||[]).find(x=>x.id===id);
    if(!m||!m.enabled)return false;
    const started=eventStarted(cfg);
    if(id==="countdown"&&started&&cfg.countdown?.hideAfterStart)return false;
    if(id==="stats"&&started)return false;
    if(id==="participation"){
      const mode=cfg.participation?.visibility||"untilEvent";
      if(mode==="alwaysOff"||(mode==="untilEvent"&&started))return false;
    }
    if(id==="food"){
      const cutoff=new Date((cfg.event?.date||"")+"T"+(cfg.event?.time||"00:00")+":00").getTime()+Number(cfg.food?.autoDisableHoursAfterStart||24)*3600000;
      if(Date.now()>=cutoff&&!cfg.food?.manualAfterAutoDisable)return false;
    }
    return true;
  }

  function render(cfg){
    const started=eventStarted(cfg);
    const mods=(cfg.modules||[]).filter(m=>m.id!=="hero"&&moduleEnabled(cfg,m.id));
    const hero= '<section class="hero" id="home"><div class="container"><h2>'+esc(formatDate(cfg.event?.date))+'</h2><h1>'+esc(cfg.event?.heroTitle||cfg.event?.name||"DESTINDERE")+'</h1><h2>'+esc(cfg.event?.heroSubtitle||"")+'</h2><p class="hero-bible-ref">'+esc(cfg.event?.heroVerse||"")+'</p></div></section>';
    const renderers={
      countdown:()=>section("countdown","countdown",'<h2 class="section-title">'+esc(cfg.countdown?.title||"Countdown")+'</h2><div class="countdown-grid"><div class="countdown-card"><span id="days">00</span><small>Zile</small></div><div class="countdown-card"><span id="hours">00</span><small>Ore</small></div><div class="countdown-card"><span id="minutes">00</span><small>Minute</small></div><div class="countdown-card"><span id="seconds">00</span><small>Secunde</small></div></div>'),
      features:()=>section("event","features",'<h2 class="section-title">'+esc(started?(cfg.features?.titleAfter||"Cum a fost?"):(cfg.features?.titleBefore||"Ce am pregătit?"))+'</h2><div class="features-grid">'+(cfg.features?.items||[]).filter(x=>x.enabled!==false).map(x=>'<div class="feature-card"><div class="icon">'+esc(x.icon)+'</div><h3>'+esc(x.title)+'</h3></div>').join("")+"</div>"),
      gallery:()=>section("gallery","gallery",'<h2 class="section-title">'+esc(cfg.gallery?.title||"Galerie")+'</h2><div class="gallery-grid">'+(cfg.gallery?.images||[]).map(x=>'<div class="gallery-card"><img src="'+attr(x.src||"")+'" alt="'+attr(x.alt||x.title||"Amintire")+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'"><div class="gallery-missing"><span>🖼️</span><small>'+esc(x.title||"Imagine indisponibilă")+'</small></div></div>').join("")+'</div>'+(cfg.gallery?.driveEnabled&&cfg.gallery?.driveUrl?'<div style="text-align:center;margin-top:25px"><a class="btn" href="'+attr(cfg.gallery.driveUrl)+'" target="_blank" rel="noopener">'+esc(cfg.gallery.driveText||"Vezi toate fotografiile")+"</a></div>":"")),
      memories:()=>section("memories","memories",'<h2 class="section-title">'+esc(cfg.memories?.title||"Amintiri")+'</h2><p class="memories-text">'+esc(cfg.memories?.text||"")+'</p><div class="upload-card"><div class="upload-icon">📸</div><h3>Încarcă fotografii și videoclipuri</h3><label for="memoryFiles" class="upload-button">📁 Selectează fișiere</label><input type="file" id="memoryFiles" accept="image/*,video/*" multiple hidden><div id="selectedFiles"></div><button type="button" id="uploadMemories" class="btn upload-submit" disabled>Încarcă</button><div id="uploadStatus"></div><div id="uploadProgressContainer" style="display:none"><div id="uploadProgressBar"></div></div><div id="uploadProgressText"></div></div>'),
      location:()=>section("location","location",'<h2 class="section-title">'+esc(cfg.location?.title||"Locația evenimentului")+'</h2><p style="text-align:center">'+esc(cfg.location?.name||cfg.event?.location||"")+'</p><div class="map"><iframe src="'+attr(cfg.location?.mapUrl||"")+'" width="100%" height="460" style="border:0" allowfullscreen loading="lazy"></iframe></div>')
    };
    app.innerHTML=hero+mods.map(m=>renderers[m.id]?renderers[m.id](): "").join("");
    nav.innerHTML='<li><a href="#home">Acasă</a></li>'+mods.filter(m=>m.showInMenu!==false&&m.id!=="countdown").map(m=>'<li><a href="#'+(m.id==="features"?"event":m.id)+'">'+esc(m.id==="features"?(started?cfg.features.menuAfter:cfg.features.menuBefore):(m.id==="food"?cfg.food.title:m.label))+"</a></li>").join("");
    document.title=(cfg.event?.name||"Destindere")+" • "+(cfg.event?.congregation||"");
    document.getElementById("footerText").textContent=cfg.event?.footer||"";
    document.getElementById("navLogo").textContent="🍂 "+String(cfg.event?.congregation||"Orhei-Vest").replace("Congregația ","");
    startCountdownIfNeeded(cfg);
  }

  function startCountdownIfNeeded(cfg){
    if(!moduleEnabled(cfg,"countdown")||!document.getElementById("countdown"))return;
    const root=document.getElementById("countdown");
    const target=new Date((cfg.event?.date||"")+"T"+(cfg.event?.time||"00:00")+":00").getTime();
    const tick=()=>{const d=target-Date.now();if(d<=0){if(cfg.countdown?.hideAfterStart){root.remove();return}const card=root.querySelector(".countdown-grid");if(card)card.innerHTML='<div class="countdown-card" style="grid-column:1/-1"><h2>'+esc(cfg.countdown?.startedMessage||"Evenimentul a început.")+"</h2></div>";return}["days","hours","minutes","seconds"].forEach((id,i)=>{const e=document.getElementById(id);if(!e)return;const n=i===0?Math.floor(d/86400000):i===1?Math.floor(d/3600000)%24:i===2?Math.floor(d/60000)%60:Math.floor(d/1000)%60;e.textContent=String(n).padStart(2,"0")})};
    tick();window.setInterval(tick,1000);
  }

  async function load(){
    const params=new URLSearchParams(location.search),preview=params.get("previewEvent");
    let eventId=preview;
    try{
      if(!eventId){
        const d=await apiGet({type:"events"});
        const active=(d.events||[]).find(e=>e.status==="ACTIV");
        eventId=active?.id;
      }
      if(eventId){
        const d=await apiGet({type:"event",eventId});
        const cfg=normalizeConfig(d.event?.config||{});
        window.CONFIG=cfg;
        render(cfg);
        return;
      }
    }catch(e){console.error("Nu s-a putut încărca evenimentul:",e)}
    const empty=normalizeConfig({
      event:{name:"Niciun eveniment activ",congregation:"Congregația Orhei-Vest"},
      modules:[]
    });
    window.CONFIG=empty;
    app.innerHTML='<section class="hero" id="home"><div class="container"><h1>Niciun eveniment activ</h1><p class="hero-bible-ref">Evenimentele planificate și arhivate nu sunt afișate public.</p></div></section>';
  }
  load();
})();