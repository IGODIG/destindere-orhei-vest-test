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
    if(id==="stats"&&started&&(cfg.stats?.afterStart||"hide")==="hide")return false;
    if(id==="participation"){
      const mode=cfg.participation?.visibility||"untilEvent";
      const afterStart=cfg.participation?.afterStart||"hide";
      if(mode==="alwaysOff")return false;
      if(started&&(mode==="untilEvent"||afterStart==="hide"))return false;
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
    const heroImage=String(cfg.event?.heroImage||"").trim();
    const heroStyle=heroImage
      ? ' style="background-image:linear-gradient(rgba(20,20,20,.45),rgba(20,20,20,.45)),url(\''+attr(heroImage)+'\')"'
      : "";
    const hero= '<section class="hero" id="home"'+heroStyle+'><div class="container"><h2>'+esc(formatDate(cfg.event?.date))+'</h2><h1>'+esc(cfg.event?.heroTitle||cfg.event?.name||"DESTINDERE")+'</h1><h2>'+esc(cfg.event?.heroSubtitle||"")+'</h2><p class="hero-bible-ref">'+esc(cfg.event?.heroVerse||"")+'</p></div></section>';
    const renderers={
      countdown:()=>section("countdown","countdown",`<h2 class="section-title">${esc(cfg.countdown?.title||"Countdown")}</h2><div class="countdown-grid"><div class="countdown-card"><span id="days">00</span><small>Zile</small></div><div class="countdown-card"><span id="hours">00</span><small>Ore</small></div><div class="countdown-card"><span id="minutes">00</span><small>Minute</small></div><div class="countdown-card"><span id="seconds">00</span><small>Secunde</small></div></div>`),
      features:()=>section("event","features",`<h2 class="section-title">${esc(started?(cfg.features?.titleAfter||"Cum a fost?"):(cfg.features?.titleBefore||"Ce am pregătit?"))}</h2><div class="features-grid">${(cfg.features?.items||[]).filter(x=>x.enabled!==false).map(x=>`<div class="feature-card"><div class="icon">${esc(x.icon)}</div><h3>${esc(x.title)}</h3></div>`).join("")}</div>`),
      gallery:()=>section("gallery","gallery",`<h2 class="section-title">${esc(cfg.gallery?.title||"Galerie")}</h2><div class="gallery-grid">${(cfg.gallery?.images||[]).map((x,i)=>{const has=!!x.src;return `<div class="gallery-card ${has?"":"gallery-placeholder-card"}">${has?`<img src="${attr(x.src)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">`:""}<div class="gallery-missing" style="display:${has?"none":"grid"}"><span>🖼️</span><small>${esc(x.title||"Imagine indisponibilă")}</small></div>${has&&x.showTitle!==false&&x.title?`<div class="gallery-title">${esc(x.title)}</div>`:""}</div>`}).join("")}</div>${cfg.gallery?.driveEnabled&&cfg.gallery?.driveUrl?`<div class="gallery-drive"><a href="${attr(cfg.gallery.driveUrl)}" target="_blank" rel="noopener noreferrer" class="btn">${esc(cfg.gallery.driveText||"Vezi toate fotografiile")}</a></div>`:""}`),
      memories:()=>section("memories","memories",`<h2 class="section-title">${esc(cfg.memories?.title||"Amintiri")}</h2><p class="memories-text">${esc(cfg.memories?.text||"")}</p><div class="upload-card"><div class="upload-icon">📸</div><h3>Încarcă fotografii și videoclipuri</h3><p>Fotografii până la 10 MB și videoclipuri până la 50 MB.</p><label for="memoryFiles" class="upload-button">📁 Selectează fișiere</label><input type="file" id="memoryFiles" accept="image/*,video/*" multiple hidden><div id="selectedFiles"></div><button type="button" id="uploadMemories" class="btn upload-submit" disabled>Încarcă</button><div id="uploadStatus"></div><div id="uploadProgressContainer" style="display:none"><div id="uploadProgressBar"></div></div><div id="uploadProgressText"></div></div>`),
      participation:()=>section("register","register",`<h2 class="section-title">${esc(cfg.participation?.title||"Confirmă participarea")}</h2><p style="text-align:center;margin-bottom:20px">${esc(cfg.participation?.description||"")}</p><form id="registrationForm">${cfg.participation?.fields?.name!==false?`<select id="guestSelect" name="nume_complet" required><option value="">Se încarcă lista...</option></select>`:""}${cfg.participation?.fields?.participation!==false?`<select name="participa" required><option value="">Particip?</option><option value="Da">Da</option><option value="Nu">Nu</option></select>`:""}${cfg.participation?.fields?.persons!==false?`<select name="persoane" required><option value="">Număr persoane</option>${Array.from({length:10},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join("")}</select>`:""}${cfg.participation?.fields?.products!==false?`<div><strong>Contribuție</strong>${[1,2].map(i=>`<div class="product-row"><select name="productId${i}" data-product-select="${i}"><option value="">${i===1?"Ce dorești să aduci?":"Ce dorești să mai aduci?"}</option></select><input type="hidden" name="ceAduce${i}" value=""><input type="text" name="cantitate${i}" inputmode="decimal" autocomplete="off" placeholder="Cantitate (ex. 2 kg)"></div>`).join("")}</div>`:""}${cfg.participation?.fields?.notes!==false?`<textarea name="observatii" rows="5" placeholder="Informații suplimentare"></textarea>`:""}<button type="submit">${esc(cfg.participation?.buttonText||"Confirmă participarea")}</button></form>`),
      stats:()=>section("stats","stats",`<h2 class="section-title">${esc(cfg.stats?.title||"Statistici")}</h2><div class="stats-grid">${(cfg.stats?.cards||[]).filter(x=>x.enabled!==false).map((x,i)=>`<div class="stat-card"><h3>${esc(x.label||"")}</h3><span id="${attr(x.id||["invited","confirmed","declined","waiting","persons"][i]||("stat"+i))}">0</span></div>`).join("")}</div>`),
      food:()=>section("food","food",`<h2 class="section-title">${esc(cfg.food?.title||"Vreau să contribui")}</h2>${cfg.food?.description?`<p class="food-description">${esc(cfg.food.description)}</p>`:""}<div id="foodProgress" class="food-grid">${(cfg.food?.products||[]).filter(x=>x.enabled!==false).map((p,index)=>`<article class="food-card" data-product-id="${attr(p.id||"")}" data-product-name="${attr(p.name||"")}" data-product-index="${index}"><div class="food-card-icon" aria-hidden="true">${esc(p.icon||"🍂")}</div><div class="food-card-content"><h3>${esc(p.name||"Produs")}</h3><p class="food-required-text">Necesar: ${esc(p.required||0)} ${esc(p.unit||"")}</p><div class="food-card-bottom"><span class="food-progress-label">PROGRES</span><strong class="food-progress-number">0 / ${esc(p.required||0)} ${esc(p.unit||"")}</strong></div><div class="food-progress" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" aria-label="Progres ${attr(p.name||"")}"><div class="food-progress-bar" style="width:0%"></div></div></div></article>`).join("")}</div>`),
      location:()=>section("location","location",`<h2 class="section-title">${esc(cfg.location?.title||"Locația evenimentului")}</h2><p style="text-align:center">${esc(cfg.location?.name||cfg.event?.location||"")}</p><div class="map"><iframe src="${attr(cfg.location?.mapUrl||"")}" width="100%" height="460" style="border:0" allowfullscreen loading="lazy"></iframe></div>`)
    };
    app.innerHTML=hero+mods.map(m=>renderers[m.id]?renderers[m.id](): "").join("");
    window.dispatchEvent(new CustomEvent("site:rendered"));
    nav.innerHTML='<li><a href="#home">Acasă</a></li>'+mods.filter(m=>m.showInMenu!==false&&m.id!=="countdown").map(m=>'<li><a href="#'+(m.id==="features"?"event":(m.id==="participation"?"register":m.id))+'">'+esc(m.id==="features"?(started?cfg.features.menuAfter:cfg.features.menuBefore):(m.id==="food"?cfg.food.title:(m.id==="participation"?"Confirmă participarea":m.label)))+"</a></li>").join("");
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
        const events=d.events||[];
        const active=events.find(e=>e.status==="ACTIV");
        if(active){
          eventId=active.id;
        }else{
          const planned=events
            .filter(e=>e.status==="PLANIFICAT")
            .sort((a,b)=>{
              const aDate=a.date||a.config?.event?.date||"";
              const bDate=b.date||b.config?.event?.date||"";
              const aTime=a.time||a.config?.event?.time||"00:00";
              const bTime=b.time||b.config?.event?.time||"00:00";
              const da=new Date(aDate+"T"+aTime).getTime();
              const db=new Date(bDate+"T"+bTime).getTime();
              return da-db;
            });
          const next=planned.find(e=>{
            const date=e.date||e.config?.event?.date||"";
            const time=e.time||e.config?.event?.time||"00:00";
            const t=new Date(date+"T"+time).getTime();
            return !Number.isNaN(t) && t>=Date.now();
          }) || planned[0];
          if(next){
            const eventName=next.name||next.config?.event?.name||"Următorul eveniment";
            const congregation=next.congregation||next.config?.event?.congregation||"Congregația Orhei-Vest";
            const dateValue=next.date||next.config?.event?.date||"";
            const date=formatDate(dateValue);
            const time=next.time||next.config?.event?.time||"";
            const location=next.location||next.config?.event?.location||"";
            window.CONFIG=normalizeConfig({
              event:{name:eventName,congregation:congregation,date:dateValue,time:time,location:location},
              modules:[]
            });
            document.title=eventName+" • "+congregation;
            document.getElementById("footerText").textContent=next.config?.event?.footer||"";
            document.getElementById("navLogo").textContent="🍂 "+String(congregation).replace("Congregația ","");
            nav.innerHTML='<li><a href="#home">Acasă</a></li>';
            app.innerHTML='<section class="hero planned-event" id="home"><div class="container"><p class="hero-bible-ref">URMĂTORUL EVENIMENT</p><h2>'+esc(eventName)+'</h2><h1>În curând</h1><p class="planned-event-date">📅 '+esc(date)+(time?' &nbsp; 🕐 '+esc(time):"")+'</p>'+(location?'<p class="planned-event-location">📍 '+esc(location)+'</p>':"")+'<p class="planned-event-message">Evenimentul va fi disponibil în curând.</p></div></section>';
            return;
          }
        }
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