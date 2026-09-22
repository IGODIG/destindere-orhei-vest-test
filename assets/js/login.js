(function(){
  const form=document.getElementById("loginForm"),msg=document.getElementById("loginMessage");
  const api=DEFAULT_CONFIG.apiUrl;
  const setMsg=(t,ok)=>{msg.textContent=t;msg.style.color=ok?"#15803d":"#b91c1c";};
  try{const saved=localStorage.getItem("destindereUser");if(saved&&JSON.parse(saved)?.id){location.href="admin.html";return;}}catch(e){}
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const nume=document.getElementById("loginNume").value.trim(),prenume=document.getElementById("loginPrenume").value.trim(),congregatie=document.getElementById("loginCongregatie").value.trim();
    if(!nume||!prenume||!congregatie){setMsg("Completează toate câmpurile.",false);return;}
    const btn=form.querySelector("button");btn.disabled=true;btn.textContent="Se verifică...";
    try{
      const r=await fetch(api,{method:"POST",body:new URLSearchParams({action:"login",nume,prenume,congregatie})});
      const d=await r.json();
      if(d.success&&d.user){localStorage.setItem("destindereUser",JSON.stringify(d.user));setMsg("Autentificare reușită.",true);setTimeout(()=>location.href="admin.html",250);}
      else setMsg(d.error||d.message||"Datele nu au fost găsite.",false);
    }catch(err){setMsg("Nu am putut verifica datele. Verifică conexiunea.",false);}
    finally{btn.disabled=false;btn.textContent="INTRĂ";}
  });
})();