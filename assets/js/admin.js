(function(){
  const $=id=>document.getElementById(id);
  const user=(()=>{try{return JSON.parse(localStorage.getItem("destindereUser")||"null")}catch{return null}})();
  if(!user?.id){location.replace("login.html");return;}
  let events=[],currentEvent=null,cfg=normalizeConfig({});
  let selectionToken=0;
  const pad=n=>String(n).padStart(2,"0");
  const localValue=v=>{if(!v)return "";const d=new Date(v);if(Number.isNaN(d.getTime()))return "";return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes())};
  const isoValue=v=>v?new Date(v).toISOString():"";
  const esc=v=>String(v??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  const set=(id,v)=>{const e=$(id);if(e)e.value=v??""};
  const check=(id,v)=>{const e=$(id);if(e)e.checked=!!v};

  function renderEditor(){
    const e=cfg.event||{};
    set("eventName",e.name);set("congregation",e.congregation);set("eventDate",e.date);set("eventTime",e.time);set("eventLocation",e.location);
    set("heroTitle",e.heroTitle);set("heroSubtitle",e.heroSubtitle);set("heroVerse",e.heroVerse);set("heroImage",e.heroImage);set("footerText",e.footer);
    set("countdownTitle",cfg.countdown?.title);set("startedMessage",cfg.countdown?.startedMessage);
    set("galleryTitle",cfg.gallery?.title);check("driveEnabled",cfg.gallery?.driveEnabled);set("driveText",cfg.gallery?.driveText);set("driveUrl",cfg.gallery?.driveUrl);
    set("featuresTitleBefore",cfg.features?.titleBefore);set("featuresTitleAfter",cfg.features?.titleAfter);set("featuresMenuBefore",cfg.features?.menuBefore);set("featuresMenuAfter",cfg.features?.menuAfter);
    set("memoriesTitle",cfg.memories?.title);set("memoriesText",cfg.memories?.text);set("locationTitle",cfg.location?.title);set("locationName",cfg.location?.name);set("mapUrl",cfg.location?.mapUrl);
    set("participationTitle",cfg.participation?.title);set("participationDescription",cfg.participation?.description);set("participationButtonText",cfg.participation?.buttonText);set("participationProductRows",cfg.participation?.productRows||2);set("participationVisibility",cfg.participation?.visibility||"manual");
    const f=cfg.participation?.fields||{};check("fieldName",f.name);check("fieldParticipation",f.participation);check("fieldPersons",f.persons);check("fieldProducts",f.products);check("fieldNotes",f.notes);
    set("statsTitle",cfg.stats?.title);set("statsAfterStart",cfg.stats?.afterStart||"hide");set("participationAfterStart",cfg.participation?.afterStart||"hide");set("foodTitle",cfg.food?.title);set("foodDescription",cfg.food?.description);check("foodHideCompleted",cfg.food?.hideCompleted);
    set("eventStatus",currentEvent?.status||"PLANIFICAT");set("activeFrom",localValue(currentEvent?.activeFrom));set("activeUntil",localValue(currentEvent?.activeUntil));
    const badge=$("eventStatusBadge");if(badge){badge.textContent=currentEvent?.status||"PLANIFICAT";badge.dataset.status=currentEvent?.status||"PLANIFICAT";}
  }

  function collect(){
    cfg=normalizeConfig(cfg);cfg.event=cfg.event||{};const e=cfg.event;
    e.eventId=currentEvent?.id||e.eventId||"";e.name=$("eventName")?.value||"";e.congregation=$("congregation")?.value||"";e.date=$("eventDate")?.value||"";e.time=$("eventTime")?.value||"";e.location=$("eventLocation")?.value||"";e.heroTitle=$("heroTitle")?.value||"";e.heroSubtitle=$("heroSubtitle")?.value||"";e.heroVerse=$("heroVerse")?.value||"";e.heroImage=$("heroImage")?.value||"";e.footer=$("footerText")?.value||"";
    cfg.countdown=cfg.countdown||{};cfg.countdown.title=$("countdownTitle")?.value||"";cfg.countdown.startedMessage=$("startedMessage")?.value||"";
    cfg.gallery=cfg.gallery||{};cfg.gallery.title=$("galleryTitle")?.value||"";cfg.gallery.driveEnabled=$("driveEnabled")?.checked||false;cfg.gallery.driveText=$("driveText")?.value||"";cfg.gallery.driveUrl=$("driveUrl")?.value||"";
    cfg.features=cfg.features||{};cfg.features.titleBefore=$("featuresTitleBefore")?.value||"";cfg.features.titleAfter=$("featuresTitleAfter")?.value||"";cfg.features.menuBefore=$("featuresMenuBefore")?.value||"";cfg.features.menuAfter=$("featuresMenuAfter")?.value||"";
    cfg.memories=cfg.memories||{};cfg.memories.title=$("memoriesTitle")?.value||"";cfg.memories.text=$("memoriesText")?.value||"";
    cfg.location=cfg.location||{};cfg.location.title=$("locationTitle")?.value||"";cfg.location.name=$("locationName")?.value||"";cfg.location.mapUrl=$("mapUrl")?.value||"";
    cfg.participation=cfg.participation||{};cfg.participation.title=$("participationTitle")?.value||"";cfg.participation.description=$("participationDescription")?.value||"";cfg.participation.buttonText=$("participationButtonText")?.value||"";cfg.participation.productRows=Number($("participationProductRows")?.value||2);cfg.participation.visibility=$("participationVisibility")?.value||"manual";cfg.participation.afterStart=$("participationAfterStart")?.value||"hide";cfg.participation.fields={name:$("fieldName")?.checked||false,participation:$("fieldParticipation")?.checked||false,persons:$("fieldPersons")?.checked||false,products:$("fieldProducts")?.checked||false,notes:$("fieldNotes")?.checked||false};
    cfg.stats=cfg.stats||{};cfg.stats.title=$("statsTitle")?.value||"";cfg.stats.afterStart=$("statsAfterStart")?.value||"hide";cfg.food=cfg.food||{};cfg.food.title=$("foodTitle")?.value||"";cfg.food.description=$("foodDescription")?.value||"";cfg.food.hideCompleted=$("foodHideCompleted")?.checked||false;
    if(currentEvent){
      if(currentEvent.status==="ACTIV"){
        currentEvent.activeFrom=isoValue($("activeFrom")?.value);
        currentEvent.activeUntil=isoValue($("activeUntil")?.value);
      }else{
        currentEvent.activeFrom="";
        currentEvent.activeUntil="";
      }
    }
    return cfg;
  }

  function renderEvents(){
    const selector=$("eventSelector"),list=$("eventsList"),count=$("eventCount");
    if(selector){selector.innerHTML=events.map(e=>"<option value=\""+esc(e.id)+"\">"+esc(e.name)+" • "+esc(e.status)+"</option>").join("");selector.value=currentEvent?.id||"";}
    if(count)count.textContent=String(events.length);
    if(list)list.innerHTML=events.map(e=>{
      const d=e.date?new Date(e.date+"T"+(e.time||"00:00")):null;
      const date=d&&!isNaN(d) ? new Intl.DateTimeFormat("ro-RO",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(d) : "Dată nespecificată";
      const del=e.status!=="ACTIV",act=e.status==="PLANIFICAT";
      return "<div class=\"event-manager-row "+(currentEvent?.id===e.id?"is-selected":"")+"\"><div class=\"event-manager-main\"><div class=\"event-manager-title\"><strong>"+esc(e.name||"Eveniment fără nume")+"</strong></div><div class=\"event-manager-meta\"><span>📅 "+esc(date)+"</span>"+(e.location?"<span>📍 "+esc(e.location)+"</span>":"")+"</div></div><span class=\"event-row-status "+esc(e.status)+"\">"+esc(e.status)+"</span><div class=\"event-manager-actions\"><button type=\"button\" data-open=\""+esc(e.id)+"\">👁 Vezi</button>"+(act?"<button type=\"button\" class=\"row-activate\" data-activate=\""+esc(e.id)+"\">🟢 Activează</button>":"")+(del?"<button type=\"button\" class=\"row-delete\" data-delete=\""+esc(e.id)+"\">🗑 Șterge</button>":"")+"</div></div>";
    }).join("");
    list?.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>selectEvent(b.dataset.open));
    list?.querySelectorAll("[data-activate]").forEach(b=>b.onclick=()=>activate(b.dataset.activate));
    list?.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteEvent(b.dataset.delete));
    const a=$("activateEventBtn"),d=$("deleteEventBtn"),p=$("previewEventBtn");if(a)a.disabled=!currentEvent||currentEvent.status!=="PLANIFICAT";if(d)d.disabled=!currentEvent||currentEvent.status==="ACTIV";if(p)p.disabled=!currentEvent;
  }

  function normalizeEventClient(ev){
    if(!ev)return ev;
    ev=JSON.parse(JSON.stringify(ev));
    ev.status=String(ev.status||"PLANIFICAT").toUpperCase();
    if(ev.config){ev.config=normalizeConfig(ev.config);ev.config.event=ev.config.event||{};
      const raw=String(ev.config.event.time||"");
      const m=raw.match(/(\\d{1,2}):(\\d{2})/);
      if(m)ev.config.event.time=pad(m[1])+":"+m[2];
    }
    if(ev.status!=="ACTIV"){ev.activeFrom="";ev.activeUntil="";}
    return ev;
  }
  async function selectEvent(id){
    const token=++selectionToken;
    const ev=normalizeEventClient(await fetchEvent(id));
    if(token!==selectionToken)return;
    currentEvent=ev;cfg=normalizeConfig(ev.config||{});renderEditor();renderEvents();
  }
  async function refresh(){
    const requestedToken=++selectionToken;
    const loaded=(await fetchEvents()).map(normalizeEventClient);
    if(requestedToken!==selectionToken)return;
    events=loaded;
    if(!events.length){currentEvent=null;renderEvents();return;}
    const keep=currentEvent?.id;
    const id=keep&&events.some(e=>e.id===keep)?keep:(events.find(e=>e.status==="ACTIV")||events[0]).id;
    await selectEvent(id);
  }
  async function save(){
    if(!currentEvent?.id)return;
    const desiredStatus=$("eventStatus")?.value||currentEvent.status||"PLANIFICAT";
    collect();
    const b=$("saveBtn"),s=$("saveState");
    if(b)b.disabled=true;
    if(s)s.textContent="Se salvează pentru „"+(currentEvent.name||cfg.event?.name||"eveniment")+"”…";
    try{
      if(desiredStatus==="ACTIV"){
        const from=$("activeFrom")?.value||"";
        const until=$("activeUntil")?.value||"";
        if(!from){alert("Pentru statusul ACTIV trebuie completat „Activ din”.");return;}
        if(until&&new Date(until)<=new Date(from)){alert("„Activ până la” trebuie să fie după „Activ din”.");return;}
        const savedCfg=await saveEventCentral({...currentEvent,status:currentEvent.status,config:cfg,activeFrom:currentEvent.activeFrom||"",activeUntil:currentEvent.activeUntil||""},user.id);
        currentEvent=await activateEventCentral(currentEvent.id,isoValue(from),isoValue(until),user.id);
        cfg=normalizeConfig(currentEvent.config||savedCfg.config||cfg);
      }else{
        currentEvent.status=desiredStatus;
        currentEvent.activeFrom="";
        currentEvent.activeUntil="";
        const saved=await saveEventCentral({...currentEvent,config:cfg,status:desiredStatus,activeFrom:"",activeUntil:""},user.id);
        currentEvent=saved;
        cfg=normalizeConfig(saved.config||cfg);
      }
      await refresh();
      if(s){s.textContent="✓ Salvat pentru evenimentul selectat";s.classList.add("saved");}
    }catch(e){alert(e.message||"Nu s-a putut salva evenimentul.");}
    finally{if(b)b.disabled=false;}
  }
  async function create(){
    if(!currentEvent)return;
    collect();
    await saveEventCentral({...currentEvent,config:cfg},user.id);
    const ev=normalizeEventClient(await createEventCentral(currentEvent.id,user.id));
    events=await fetchEvents();
    await selectEvent(ev.id);
  }
  async function activate(id=currentEvent?.id){if(!id)return;const ev=events.find(x=>x.id===id)||currentEvent;const from=id===currentEvent?.id?($("activeFrom")?.value||""):localValue(ev.activeFrom);const until=id===currentEvent?.id?($("activeUntil")?.value||""):localValue(ev.activeUntil);if(!from){alert("Completează „Activ din”.");return;}if(until&&new Date(until)<=new Date(from)){alert("„Activ până la” trebuie să fie după „Activ din”.");return;}await activateEventCentral(id,isoValue(from),isoValue(until),user.id);await refresh();}
  async function deleteEvent(id=currentEvent?.id){const ev=events.find(x=>x.id===id);if(!ev||ev.status==="ACTIV")return;if(!confirm("Ștergi definitiv „"+ev.name+"” și toate datele lui?"))return;await deleteEventCentral(id,user.id);currentEvent=null;await refresh();}

  $("eventSelector")?.addEventListener("change",e=>{
    const id=e.target.value;
    if(!id)return;
    selectEvent(id).catch(x=>alert(x.message));
  });
  $("eventStatus")?.addEventListener("change",e=>{
    const status=e.target.value;
    if(status==="ACTIV"){
      $("activeFrom")?.removeAttribute("disabled");
      $("activeUntil")?.removeAttribute("disabled");
    }else{
      if($("activeFrom"))$("activeFrom").value="";
      if($("activeUntil"))$("activeUntil").value="";
    }
  });
  $("saveBtn")?.addEventListener("click",()=>save().catch(x=>alert(x.message)));
  $("createEventBtn")?.addEventListener("click",()=>create().catch(x=>alert(x.message)));
  $("activateEventBtn")?.addEventListener("click",()=>activate().catch(x=>alert(x.message)));
  $("deleteEventBtn")?.addEventListener("click",()=>deleteEvent().catch(x=>alert(x.message)));
  $("previewEventBtn")?.addEventListener("click",()=>currentEvent&&window.open("index.html?previewEvent="+encodeURIComponent(currentEvent.id),"_blank","noopener"));
  $("logoutAdmin")?.addEventListener("click",()=>{localStorage.removeItem("destindereUser");location.replace("login.html");});
  refresh().catch(e=>{console.error(e);alert(e.message||"Nu s-au putut încărca evenimentele.");});
})();