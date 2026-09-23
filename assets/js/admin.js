(function(){
  const $=id=>document.getElementById(id);
  const user=(()=>{try{return JSON.parse(localStorage.getItem("destindereUser")||"null")}catch{return null}})();
  if(!user?.id){location.replace("login.html");return;}

  let events=[],currentEvent=null,cfg=normalizeConfig({});
  let selectionToken=0;

  const MODULE_IDS=["countdown","memories","features","gallery","participation","stats","food","location"];
  const META={
    countdown:["⏱","Countdown"],
    memories:["🖼","Amintiri / Adaugă poze"],
    features:["✨","Ce am pregătit? / Cum a fost?"],
    gallery:["📸","Galerie"],
    participation:["👥","Confirmă participarea"],
    stats:["📊","Statistici"],
    food:["🍎","Vreau să contribui"],
    location:["📍","Locație"]
  };

  const pad=n=>String(n).padStart(2,"0");
  const localValue=v=>{
    if(!v)return "";
    const d=new Date(v);
    if(Number.isNaN(d.getTime()))return "";
    return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes());
  };
  const isoValue=v=>v?new Date(v).toISOString():"";
  const esc=v=>String(v??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  const escAttr=v=>esc(v).replace(/'/g,"&#39;");
  const set=(id,v)=>{const e=$(id);if(e)e.value=v??""};
  const check=(id,v)=>{const e=$(id);if(e)e.checked=!!v};

  function ensureConfigShape(){
    cfg=normalizeConfig(cfg||{});
    cfg.modules=Array.isArray(cfg.modules)?cfg.modules:[];
    const byId=new Map(cfg.modules.map(m=>[m.id,m]));
    cfg.modules=MODULE_IDS.map(id=>{
      const existing=byId.get(id)||{};
      const legacyLabel=cfg[id]?.label;
      return {
        ...existing,
        id,
        label:String(existing.label||legacyLabel||META[id][1]),
        enabled:existing.enabled!==undefined?!!existing.enabled:cfg[id]?.enabled!==false,
        showInMenu:existing.showInMenu!==undefined?!!existing.showInMenu:id!=="countdown"
      };
    });
    MODULE_IDS.forEach(id=>{
      cfg[id]=cfg[id]||{};
      const m=cfg.modules.find(x=>x.id===id);
      cfg[id].enabled=!!m.enabled;
      cfg[id].label=m.label;
      cfg[id].showInMenu=m.showInMenu!==false;
    });
  }

  function getModule(id){return cfg.modules.find(m=>m.id===id)}
  function syncLegacyEnabled(){MODULE_IDS.forEach(id=>{const m=getModule(id);if(m){cfg[id].enabled=!!m.enabled;cfg[id].label=m.label;cfg[id].showInMenu=m.showInMenu!==false}})}
  function syncPanelOrder(){
    const wrap=$("settingsPanels");if(!wrap)return;
    const rank=new Map(cfg.modules.map((m,i)=>[m.id,i]));
    [...wrap.querySelectorAll(":scope > .accordion")].sort((a,b)=>(rank.get(a.dataset.panel)??999)-(rank.get(b.dataset.panel)??999)).forEach(p=>wrap.appendChild(p));
  }
  function syncPanelHeaders(){
    cfg.modules.forEach(m=>{
      const panel=document.querySelector('.accordion[data-panel="'+CSS.escape(m.id)+'"]');if(!panel)return;
      panel.classList.toggle("module-inactive",!m.enabled);
      const status=panel.querySelector(".module-status");
      if(status){status.textContent=m.enabled?"● ACTIV":"○ INACTIV";status.classList.toggle("is-off",!m.enabled)}
      const menu=panel.querySelector('[data-menu-for="'+CSS.escape(m.id)+'"]');if(menu)menu.checked=m.showInMenu!==false;
      panel.draggable=true;
    });
  }
  function bindAccordion(){
    document.querySelectorAll(".accordion-head").forEach(btn=>{
      if(btn.dataset.bound)return;btn.dataset.bound="1";
      btn.addEventListener("click",e=>{if(e.target.closest(".module-status,.menu-toggle"))return;btn.closest(".accordion")?.classList.toggle("open")});
    });
    document.querySelectorAll(".module-status").forEach(status=>{
      if(status.dataset.bound)return;status.dataset.bound="1";
      status.addEventListener("click",e=>{e.stopPropagation();const m=getModule(status.dataset.statusFor);if(!m)return;m.enabled=!m.enabled;syncLegacyEnabled();syncPanelHeaders()});
    });
    document.querySelectorAll(".menu-toggle").forEach(label=>{
      if(label.dataset.bound)return;label.dataset.bound="1";
      label.addEventListener("click",e=>e.stopPropagation());
      const input=label.querySelector("input");
      input?.addEventListener("change",e=>{const m=getModule(input.dataset.menuFor);if(m){m.showInMenu=e.target.checked;syncLegacyEnabled()}});
    });
  }
  function bindSortable(){
    const wrap=$("settingsPanels");if(!wrap)return;
    let dragging=null;
    wrap.querySelectorAll(":scope > .accordion").forEach(panel=>{
      if(panel.dataset.dragBound)return;panel.dataset.dragBound="1";
      panel.addEventListener("dragstart",e=>{dragging=panel;panel.classList.add("dragging-module");e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",panel.dataset.panel)});
      panel.addEventListener("dragend",()=>{panel.classList.remove("dragging-module");dragging=null;wrap.querySelectorAll(".drag-over-module").forEach(x=>x.classList.remove("drag-over-module"))});
      panel.addEventListener("dragover",e=>{e.preventDefault();if(!dragging||dragging===panel)return;panel.classList.add("drag-over-module")});
      panel.addEventListener("dragleave",()=>panel.classList.remove("drag-over-module"));
      panel.addEventListener("drop",e=>{e.preventDefault();panel.classList.remove("drag-over-module");if(!dragging||dragging===panel)return;const rect=panel.getBoundingClientRect();wrap.insertBefore(dragging,e.clientY<rect.top+rect.height/2?panel:panel.nextSibling);syncOrderFromDOM()});
    });
  }
  function syncOrderFromDOM(){
    const wrap=$("settingsPanels");if(!wrap)return;
    const ids=[...wrap.querySelectorAll(":scope > .accordion")].map(p=>p.dataset.panel);
    const byId=new Map(cfg.modules.map(m=>[m.id,m]));
    cfg.modules=ids.map(id=>byId.get(id)).filter(Boolean);
    syncLegacyEnabled();
  }
  function renderGallery(){
    const box=$("galleryList");if(!box)return;
    const images=Array.isArray(cfg.gallery.images)?cfg.gallery.images:[];
    box.innerHTML=images.map((x,i)=>`<div class="gallery-card-editor"><span class="row-drag">☰</span><div class="gallery-thumb-wrap"><img class="gallery-thumb" src="${escAttr(x.src)}" alt=""><span class="gallery-placeholder">🖼️</span></div><input class="img-src" placeholder="Imagine / cale" value="${esc(x.src)}"><input class="img-title" placeholder="Titlu" value="${esc(x.title)}"><input class="img-alt" placeholder="Descriere / alt text" value="${esc(x.alt)}"><button class="remove-btn remove-img" type="button">×</button></div>`).join("");
    box.querySelectorAll(".gallery-card-editor").forEach((row,i)=>{
      const thumb=row.querySelector(".gallery-thumb"),ph=row.querySelector(".gallery-placeholder");
      const sync=()=>{const src=cfg.gallery.images[i]?.src||"";if(src){thumb.style.display="block";ph.style.display="none";thumb.src=src}else{thumb.style.display="none";ph.style.display="grid"}};
      row.querySelector(".img-src").oninput=e=>{cfg.gallery.images[i].src=e.target.value;sync()};
      row.querySelector(".img-title").oninput=e=>cfg.gallery.images[i].title=e.target.value;
      row.querySelector(".img-alt").oninput=e=>cfg.gallery.images[i].alt=e.target.value;
      thumb.onerror=()=>{thumb.style.display="none";ph.style.display="grid"};
      row.querySelector(".remove-img").onclick=()=>{cfg.gallery.images.splice(i,1);renderGallery()};
      sync();
    });
  }
  function renderFeatures(){
    const box=$("featuresList");if(!box)return;
    const items=Array.isArray(cfg.features.items)?cfg.features.items:[];
    box.innerHTML=items.map((x,i)=>`<div class="feature-row"><span class="row-drag">☰</span><input class="feature-icon" value="${esc(x.icon)}"><input class="feat-title" value="${esc(x.title)}" placeholder="Titlu element"><label class="switch-line"><input type="checkbox" class="feat-check" ${x.enabled!==false?"checked":""}><span class="switch"></span></label><button class="remove-btn remove-feature" type="button">×</button></div>`).join("");
    box.querySelectorAll(".feature-row").forEach((row,i)=>{
      row.querySelector(".feature-icon").oninput=e=>cfg.features.items[i].icon=e.target.value;
      row.querySelector(".feat-title").oninput=e=>cfg.features.items[i].title=e.target.value;
      row.querySelector(".feat-check").onchange=e=>cfg.features.items[i].enabled=e.target.checked;
      row.querySelector(".remove-feature").onclick=()=>{cfg.features.items.splice(i,1);renderFeatures()};
    });
  }
  function renderFood(){
    const box=$("foodList");if(!box)return;
    const products=Array.isArray(cfg.food.products)?cfg.food.products:[];
    box.innerHTML=products.map((x,i)=>`<div class="food-row"><span class="row-drag">☰</span><input class="food-icon" value="${esc(x.icon)}" title="Icon"><input class="food-name" value="${esc(x.name)}" placeholder="Produs"><input class="food-required" type="number" min="0" step="0.1" value="${esc(x.required)}" placeholder="Necesar"><input class="food-unit" value="${esc(x.unit)}" placeholder="Unitate"><label class="switch-line food-active"><input type="checkbox" class="food-check" ${x.enabled!==false?"checked":""}><span class="switch"></span></label><button class="remove-btn remove-food" type="button">×</button></div>`).join("");
    box.querySelectorAll(".food-row").forEach((row,i)=>{
      row.querySelector(".food-icon").oninput=e=>cfg.food.products[i].icon=e.target.value;
      row.querySelector(".food-name").oninput=e=>cfg.food.products[i].name=e.target.value;
      row.querySelector(".food-required").oninput=e=>cfg.food.products[i].required=Number(e.target.value||0);
      row.querySelector(".food-unit").oninput=e=>cfg.food.products[i].unit=e.target.value;
      row.querySelector(".food-check").onchange=e=>cfg.food.products[i].enabled=e.target.checked;
      row.querySelector(".remove-food").onclick=()=>{cfg.food.products.splice(i,1);renderFood()};
    });
  }
  function renderStats(){
    const box=$("statsList");if(!box)return;
    const cards=Array.isArray(cfg.stats.cards)?cfg.stats.cards:[];
    box.innerHTML=cards.map((x,i)=>`<div class="stat-row"><span class="row-drag">☰</span><input class="stat-label" value="${esc(x.label)}"><label class="switch-line"><input type="checkbox" class="stat-check" ${x.enabled!==false?"checked":""}><span class="switch"></span><span>Activ</span></label></div>`).join("");
    box.querySelectorAll(".stat-row").forEach((row,i)=>{
      row.querySelector(".stat-label").oninput=e=>cfg.stats.cards[i].label=e.target.value;
      row.querySelector(".stat-check").onchange=e=>cfg.stats.cards[i].enabled=e.target.checked;
    });
  }
  function updateParticipationHint(){
    const e=$("participationVisibility"),note=$("participationVisibilityNote");if(!e||!note)return;
    note.textContent=e.value==="untilEvent"?"Formularul și intrarea din Header sunt vizibile până la data și ora evenimentului. După începere, dispar automat.":e.value==="manual"?"Vizibilitatea este controlată de statusul modulului și de setarea de mai jos.":"Formularul rămâne ascuns până când este activat manual.";
  }
  function renderEditor(){
    ensureConfigShape();
    const e=cfg.event||{};
    set("eventName",e.name);set("congregation",e.congregation);set("eventDate",e.date);set("eventTime",e.time);set("eventLocation",e.location);
    set("heroTitle",e.heroTitle);set("heroSubtitle",e.heroSubtitle);set("heroVerse",e.heroVerse);set("heroImage",e.heroImage);set("footerText",e.footer);
    set("countdownTitle",cfg.countdown?.title);set("startedMessage",cfg.countdown?.startedMessage);
    set("galleryTitle",cfg.gallery?.title);check("driveEnabled",cfg.gallery?.driveEnabled);set("driveText",cfg.gallery?.driveText);set("driveUrl",cfg.gallery?.driveUrl);
    set("featuresTitleBefore",cfg.features?.titleBefore);set("featuresTitleAfter",cfg.features?.titleAfter);set("featuresMenuBefore",cfg.features?.menuBefore);set("featuresMenuAfter",cfg.features?.menuAfter);
    set("memoriesTitle",cfg.memories?.title);set("memoriesText",cfg.memories?.text);
    set("locationTitle",cfg.location?.title);set("locationName",cfg.location?.name);set("mapUrl",cfg.location?.mapUrl);
    set("participationTitle",cfg.participation?.title);set("participationDescription",cfg.participation?.description);set("participationButtonText",cfg.participation?.buttonText);set("participationProductRows",cfg.participation?.productRows||2);set("participationVisibility",cfg.participation?.visibility||"manual");set("participationAfterStart",cfg.participation?.afterStart||"hide");
    const f=cfg.participation?.fields||{};
    check("fieldName",f.name);check("fieldParticipation",f.participation);check("fieldPersons",f.persons);check("fieldProducts",f.products);check("fieldNotes",f.notes);
    set("statsTitle",cfg.stats?.title);set("statsAfterStart",cfg.stats?.afterStart||"hide");set("foodTitle",cfg.food?.title);set("foodDescription",cfg.food?.description);check("foodHideCompleted",cfg.food?.hideCompleted);
    set("eventStatus",currentEvent?.status||"PLANIFICAT");set("activeFrom",localValue(currentEvent?.activeFrom));set("activeUntil",localValue(currentEvent?.activeUntil));
    const isActive=(currentEvent?.status||"PLANIFICAT")==="ACTIV";
    if($("activeFrom"))$("activeFrom").disabled=!isActive;
    if($("activeUntil"))$("activeUntil").disabled=!isActive;
    const preview=$("heroImagePreview"),placeholder=$("heroImagePlaceholder");
    if(preview&&placeholder){
      if(e.heroImage){preview.src=e.heroImage;preview.style.display="block";placeholder.style.display="none"}else{preview.style.display="none";placeholder.style.display="grid"}
      preview.onerror=()=>{preview.style.display="none";placeholder.style.display="grid"};
    }
    syncPanelOrder();syncPanelHeaders();renderGallery();renderFeatures();renderFood();renderStats();updateParticipationHint();bindAccordion();bindSortable();
    document.querySelectorAll(".module-label-input").forEach(input=>{
      const m=getModule(input.dataset.labelFor);
      if(m)input.value=m.label||META[m.id][1];
    });
  }
  function collect(){
    ensureConfigShape();syncOrderFromDOM();cfg.event=cfg.event||{};const e=cfg.event;
    e.eventId=currentEvent?.id||e.eventId||"";
    e.name=$("eventName")?.value||"";e.congregation=$("congregation")?.value||"";e.date=$("eventDate")?.value||"";e.time=$("eventTime")?.value||"";e.location=$("eventLocation")?.value||"";
    e.heroTitle=$("heroTitle")?.value||"";e.heroSubtitle=$("heroSubtitle")?.value||"";e.heroVerse=$("heroVerse")?.value||"";e.heroImage=$("heroImage")?.value||"";e.footer=$("footerText")?.value||"";
    cfg.countdown=cfg.countdown||{};cfg.countdown.title=$("countdownTitle")?.value||"";cfg.countdown.startedMessage=$("startedMessage")?.value||"";
    cfg.gallery=cfg.gallery||{};cfg.gallery.title=$("galleryTitle")?.value||"";cfg.gallery.driveEnabled=$("driveEnabled")?.checked||false;cfg.gallery.driveText=$("driveText")?.value||"";cfg.gallery.driveUrl=$("driveUrl")?.value||"";
    cfg.features=cfg.features||{};cfg.features.titleBefore=$("featuresTitleBefore")?.value||"";cfg.features.titleAfter=$("featuresTitleAfter")?.value||"";cfg.features.menuBefore=$("featuresMenuBefore")?.value||"";cfg.features.menuAfter=$("featuresMenuAfter")?.value||"";cfg.features.title=cfg.features.titleBefore;
    cfg.memories=cfg.memories||{};cfg.memories.title=$("memoriesTitle")?.value||"";cfg.memories.text=$("memoriesText")?.value||"";
    cfg.location=cfg.location||{};cfg.location.title=$("locationTitle")?.value||"";cfg.location.name=$("locationName")?.value||"";cfg.location.mapUrl=$("mapUrl")?.value||"";
    cfg.participation=cfg.participation||{};cfg.participation.visibility=$("participationVisibility")?.value||"manual";cfg.participation.afterStart=$("participationAfterStart")?.value||"hide";cfg.participation.title=$("participationTitle")?.value||"";cfg.participation.description=$("participationDescription")?.value||"";cfg.participation.buttonText=$("participationButtonText")?.value||"";cfg.participation.productRows=Number($("participationProductRows")?.value||2);
    cfg.participation.fields={name:$("fieldName")?.checked||false,participation:$("fieldParticipation")?.checked||false,persons:$("fieldPersons")?.checked||false,products:$("fieldProducts")?.checked||false,notes:$("fieldNotes")?.checked||false};
    cfg.stats=cfg.stats||{};cfg.stats.title=$("statsTitle")?.value||"";cfg.stats.afterStart=$("statsAfterStart")?.value||"hide";
    cfg.food=cfg.food||{};cfg.food.title=$("foodTitle")?.value||"";cfg.food.description=$("foodDescription")?.value||"";cfg.food.hideCompleted=$("foodHideCompleted")?.checked||false;cfg.food.autoDisableHoursAfterStart=24;
    document.querySelectorAll(".module-label-input").forEach(input=>{const id=input.dataset.labelFor;const m=getModule(id);if(m)m.label=input.value.trim()||META[id][1]});
    syncLegacyEnabled();
  }
  function renderEvents(){
    const selector=$("eventSelector"),list=$("eventsList");
    if(selector){
      selector.innerHTML=events.map(e=>"<option value=\""+esc(e.id)+"\">"+esc(e.name)+" • "+esc(e.status)+"</option>").join("");
      selector.value=currentEvent?.id||"";
    }
    if(list){
      list.innerHTML=events.map(e=>{
        // Lista centrală folosește metadata evenimentului ca sursă de adevăr
        // pentru dată, oră și locație. ConfigJSON rămâne pentru editor.
        const dateValue=e.date||"";
        const rawTime=e.config?.event?.time||e.time||"";
        const timeMatch=String(rawTime).match(/(?:^|\s)(\d{1,2}):(\d{2})(?::\d{2})?/);
        const timeValue=timeMatch
          ? String(timeMatch[1]).padStart(2,"0")+":"+timeMatch[2]
          : "00:00";
        const locationValue=e.location||"";
        const d=dateValue?new Date(dateValue+"T"+timeValue):null;
        const date=d&&!isNaN(d)?new Intl.DateTimeFormat("ro-RO",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(d):"Dată nespecificată";
        const del=e.status!=="ACTIV",act=e.status==="PLANIFICAT",arch=e.status==="ACTIV";
        return "<div class=\"event-manager-row "+(currentEvent?.id===e.id?"is-selected":"")+"\"><div class=\"event-manager-main\"><div class=\"event-manager-title\"><strong>"+esc(e.name||"Eveniment fără nume")+"</strong></div><div class=\"event-manager-meta\"><span>📅 "+esc(date)+"</span>"+(locationValue?"<span>📍 "+esc(locationValue)+"</span>":"")+"</div></div><span class=\"event-row-status "+esc(e.status)+"\">"+esc(e.status)+"</span><div class=\"event-manager-actions\"><button type=\"button\" data-open=\""+esc(e.id)+"\">👁 Vezi</button>"+(act?"<button type=\"button\" class=\"row-activate\" data-activate=\""+esc(e.id)+"\">🟢 Activează</button>":"")+(del?"<button type=\"button\" class=\"row-delete\" data-delete=\""+esc(e.id)+"\">🗑 Șterge</button>":"")+"</div></div>";
      }).join("");
      list.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>previewEvent(b.dataset.open));
      list.querySelectorAll("[data-activate]").forEach(b=>b.onclick=()=>activate(b.dataset.activate));
      list.querySelectorAll("[data-archive]").forEach(b=>b.onclick=()=>archiveEvent(b.dataset.archive));
      list.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteEvent(b.dataset.delete));
    }
    const a=$("activateEventBtn"),ar=$("archiveEventBtn"),d=$("deleteEventBtn"),p=$("previewEventBtn");
    if(a)a.disabled=!currentEvent||currentEvent.status!=="PLANIFICAT";
    if(ar)ar.disabled=!currentEvent||currentEvent.status!=="ACTIV";
    if(d)d.disabled=!currentEvent||currentEvent.status==="ACTIV";
    if(p)p.disabled=!currentEvent;
  }
  function normalizeEventClient(ev){
    if(!ev)return ev;
    ev=JSON.parse(JSON.stringify(ev));
    ev.status=String(ev.status||"PLANIFICAT").toUpperCase();

    // Apps Script poate returna o valoare de tip Date pentru ora,
    // de exemplu "Sun Dec 31 1899 08:50:00 GMT+0155 (...)". Pentru
    // lista de evenimente avem nevoie strict de HH:mm.
    function normalizeTime(value){
      const raw=String(value||"").trim();
      if(!raw)return "";
      const match=raw.match(/(?:^|\s)(\d{1,2}):(\d{2})(?::\d{2})?/);
      if(match)return pad(match[1])+":"+match[2];
      return raw;
    }

    ev.time=normalizeTime(ev.time);

    if(ev.config){
      ev.config=normalizeConfig(ev.config);
      ev.config.event=ev.config.event||{};
      ev.config.event.time=normalizeTime(ev.config.event.time);
      if(!ev.time && ev.config.event.time) ev.time=ev.config.event.time;
    }

    if(ev.status!=="ACTIV"){ev.activeFrom="";ev.activeUntil=""}
    return ev;
  }
  async function selectEvent(id){
    const token=++selectionToken;
    const ev=normalizeEventClient(await fetchEvent(id));
    if(token!==selectionToken)return;
    currentEvent=ev;cfg=normalizeConfig(ev.config||{});ensureConfigShape();renderEditor();renderEvents();
  }
  async function previewEvent(id=currentEvent?.id){
    if(!id)return;
    try{await selectEvent(id);window.open("index.html?previewEvent="+encodeURIComponent(id),"_blank","noopener")}catch(e){alert(e.message||"Nu s-a putut deschide previzualizarea.")}
  }
  async function refresh(){
    const requestedToken=++selectionToken;
    const loaded=(await fetchEvents()).map(normalizeEventClient);
    if(requestedToken!==selectionToken)return;
    events=loaded;
    currentEvent=currentEvent&&events.some(e=>e.id===currentEvent.id)?events.find(e=>e.id===currentEvent.id):(events.find(e=>e.status==="ACTIV")||events[0]||null);
    renderEvents();
    if(!events.length){currentEvent=null;renderEvents();return}
    const id=currentEvent.id;
    try{await selectEvent(id)}catch(error){
      console.error("Eroare la încărcarea configurației evenimentului:",error);
      currentEvent=events.find(e=>e.id===id)||currentEvent;cfg=normalizeConfig(currentEvent?.config||{});renderEditor();renderEvents();
      const state=$("saveState");if(state)state.textContent="Evenimentele au fost încărcate, dar configurația nu a putut fi deschisă.";
    }
  }
  async function save(){
    if(!currentEvent?.id)return;
    const desiredStatus=$("eventStatus")?.value||currentEvent.status||"PLANIFICAT";
    collect();
    const b=$("saveBtn"),s=$("saveState");if(b)b.disabled=true;if(s)s.textContent="Se salvează pentru „"+(cfg.event?.name||"eveniment")+"”…";
    try{
      if(desiredStatus==="ACTIV"){
        const from=$("activeFrom")?.value||"",until=$("activeUntil")?.value||"";
        if(!from){alert("Pentru statusul ACTIV trebuie completat „Activ din”.");return}
        if(until&&new Date(until)<=new Date(from)){alert("„Activ până la” trebuie să fie după „Activ din”.");return}
        const savedCfg=await saveEventCentral({...currentEvent,status:currentEvent.status,config:cfg,activeFrom:currentEvent.activeFrom||"",activeUntil:currentEvent.activeUntil||""},user.id);
        currentEvent=await activateEventCentral(currentEvent.id,isoValue(from),isoValue(until),user.id);cfg=normalizeConfig(currentEvent.config||savedCfg.config||cfg);
      }else{
        currentEvent.status=desiredStatus;currentEvent.activeFrom="";currentEvent.activeUntil="";
        const saved=await saveEventCentral({...currentEvent,config:cfg,status:desiredStatus,activeFrom:"",activeUntil:""},user.id);currentEvent=saved;cfg=normalizeConfig(saved.config||cfg);
      }
      await refresh();if(s){s.textContent="✓ Salvat pentru evenimentul selectat";s.classList.add("saved");setTimeout(()=>s.classList.remove("saved"),2500)}
    }catch(e){alert(e.message||"Nu s-a putut salva evenimentul.")}finally{if(b)b.disabled=false}
  }
  async function create(){if(!currentEvent)return;collect();await saveEventCentral({...currentEvent,config:cfg},user.id);const ev=normalizeEventClient(await createEventCentral(currentEvent.id,user.id));await refresh();await selectEvent(ev.id)}
  async function activate(id=currentEvent?.id){
    if(!id)return;const ev=events.find(x=>x.id===id)||currentEvent;
    const from=id===currentEvent?.id?($("activeFrom")?.value||""):localValue(ev.activeFrom);
    const until=id===currentEvent?.id?($("activeUntil")?.value||""):localValue(ev.activeUntil);
    if(!from){alert("Completează „Activ din”.");return}
    if(until&&new Date(until)<=new Date(from)){alert("„Activ până la” trebuie să fie după „Activ din”.");return}
    await activateEventCentral(id,isoValue(from),isoValue(until),user.id);await refresh();
  }
  async function archiveEvent(id=currentEvent?.id){
    if(!id)return;const ev=events.find(x=>x.id===id)||currentEvent;if(!ev||ev.status!=="ACTIV")return;
    if(!confirm("Arhivezi „"+ev.name+"”?"))return;
    await archiveEventCentral(id,user.id);await refresh();
  }
  async function deleteEvent(id=currentEvent?.id){
    const ev=events.find(x=>x.id===id);if(!ev||ev.status==="ACTIV")return;
    if(!confirm("Ștergi definitiv „"+ev.name+"” și toate datele lui?"))return;
    await deleteEventCentral(id,user.id);currentEvent=null;await refresh();
  }
  $("eventSelector")?.addEventListener("change",e=>{const id=e.target.value;if(id)selectEvent(id).catch(x=>alert(x.message))});
  $("eventStatus")?.addEventListener("change",e=>{const active=e.target.value==="ACTIV";if($("activeFrom"))$("activeFrom").disabled=!active;if($("activeUntil"))$("activeUntil").disabled=!active;if(!active){$("activeFrom").value="";$("activeUntil").value=""}});
  $("participationVisibility")?.addEventListener("change",updateParticipationHint);
  $("saveBtn")?.addEventListener("click",()=>save().catch(x=>alert(x.message)));
  $("createEventBtn")?.addEventListener("click",()=>create().catch(x=>alert(x.message)));
  $("activateEventBtn")?.addEventListener("click",()=>activate().catch(x=>alert(x.message)));
  $("archiveEventBtn")?.addEventListener("click",()=>archiveEvent().catch(x=>alert(x.message)));
  $("previewEventBtn")?.addEventListener("click",()=>previewEvent().catch(x=>alert(x.message)));
  $("logoutAdmin")?.addEventListener("click",()=>{localStorage.removeItem("destindereUser");location.replace("login.html")});
  $("addImage")?.addEventListener("click",()=>{cfg.gallery=cfg.gallery||{};cfg.gallery.images=Array.isArray(cfg.gallery.images)?cfg.gallery.images:[];cfg.gallery.images.push({src:"",title:"Amintiri",alt:"Amintire"});renderGallery()});
  $("addFeature")?.addEventListener("click",()=>{cfg.features=cfg.features||{};cfg.features.items=Array.isArray(cfg.features.items)?cfg.features.items:[];cfg.features.items.push({icon:"✨",title:"Element nou",enabled:true});renderFeatures()});
  $("addFood")?.addEventListener("click",()=>{cfg.food=cfg.food||{};cfg.food.products=Array.isArray(cfg.food.products)?cfg.food.products:[];cfg.food.products.push({id:"food_"+Date.now(),name:"Produs nou",required:1,unit:"bucăți",icon:"🎁",enabled:true});renderFood()});
  $("exportBtn")?.addEventListener("click",()=>{collect();const blob=new Blob([JSON.stringify(cfg,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="destindere-config-"+(currentEvent?.id||"event")+".json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)});
  $("importBtn")?.addEventListener("click",()=>$("importFile")?.click());
  $("importFile")?.addEventListener("change",e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{cfg=deepMerge(normalizeConfig({}),JSON.parse(r.result));ensureConfigShape();renderEditor()}catch(err){alert("Fișier de configurare invalid.")}};r.readAsText(f)});
  $("resetBtn")?.addEventListener("click",()=>{if(!confirm("Revii la configurația implicită a editorului?"))return;cfg=normalizeConfig({});ensureConfigShape();renderEditor()});
  refresh().catch(e=>{console.error(e);alert(e?.message==="Failed to fetch"?"Nu se poate contacta Google Apps Script. Verifică deployment-ul Web App și URL-ul din config.js.":(e?.message||"Nu s-au putut încărca evenimentele."))});
})();