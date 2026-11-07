(()=> {
const $=id=>document.getElementById(id);
let db,tab="unused",items=[];
const status=s=>$("status").textContent=s;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open("MyPhotoGalleryProDB",1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains("media")){const st=d.createObjectStore("media",{keyPath:"id",autoIncrement:true});st.createIndex("createdAt","createdAt");}};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function store(mode="readonly"){return db.transaction("media",mode).objectStore("media");}
function all(){return new Promise((resolve,reject)=>{const r=store().getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function save(x){return new Promise((resolve,reject)=>{const r=store("readwrite").put(x);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error);});}
function del(id){return new Promise((resolve,reject)=>{const r=store("readwrite").delete(id);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error);});}
async function refresh(){items=await all();const q=$("search").value.toLowerCase();let shown=items.filter(x=>tab==="trash"?x.deleted:!x.deleted&&x.status===tab).filter(x=>!q||String(x.serial).includes(q)||x.name.toLowerCase().includes(q));shown.sort((a,b)=>b.createdAt-a.createdAt);$("count").textContent=`${shown.length} টি ফাইল`;const g=$("gallery");g.innerHTML="";
if(!shown.length){g.innerHTML="<p>এখানে কোনো ফাইল নেই।</p>";return;}
for(const x of shown){const url=URL.createObjectURL(x.blob),media=x.kind==="video"?`<video controls playsinline src="${url}"></video>`:`<img loading="lazy" src="${url}" alt="">`;const el=document.createElement("article");el.className="item";el.innerHTML=`<div class="serial">#${x.serial} · ${x.kind==="video"?"ভিডিও":"ছবি"}</div>${media}<div class="muted small">${esc(x.name)}</div><div class="caption">${esc(x.caption||"")}\n${esc(x.hashtags||"")}</div><textarea class="hidden" id="edit${x.id}" placeholder="Caption লিখুন; Hashtag আলাদা লাইনে দিন"></textarea><div class="row"><button data-act="edit" data-id="${x.id}" class="gray">Edit</button><button data-act="copy" data-id="${x.id}">Copy</button>${x.deleted?`<button data-act="restore" data-id="${x.id}" class="gray">Restore</button><button data-act="purge" data-id="${x.id}" class="red">Delete Forever</button>`:`<button data-act="move" data-id="${x.id}" class="gray">${x.status==="used"?"Unused":"Used"}</button><button data-act="trash" data-id="${x.id}" class="red">Recycle</button>`}<button data-act="share" data-id="${x.id}" class="gray">Share</button></div><div class="row hidden" id="savebox${x.id}" style="margin-top:8px"><button data-act="save" data-id="${x.id}">Save Caption</button></div>`;g.appendChild(el);el.querySelector("img,video")?.addEventListener("error",()=>URL.revokeObjectURL(url));}
}
async function upload(list,kind){if(!list.length)return;for(const f of list){status(`সংরক্ষণ হচ্ছে: ${f.name}`);const existing=await all();const serial=existing.reduce((m,x)=>Math.max(m,x.serial||0),0)+1;await save({serial,name:f.name,kind,blob:f,caption:"",hashtags:"",status:"unused",deleted:false,createdAt:Date.now()});}status(`${list.length} টি ফাইল এই ফোনের ব্রাউজারে সংরক্ষিত হয়েছে।`);await refresh();}
$("photoInput").onchange=e=>upload([...e.target.files],"photo").then(()=>e.target.value="");
$("videoInput").onchange=e=>upload([...e.target.files],"video").then(()=>e.target.value="");
$("refresh").onclick=refresh;$("search").oninput=refresh;
document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{tab=b.dataset.tab;document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));refresh();});
$("gallery").onclick=async e=>{const b=e.target.closest("button");if(!b)return;const id=Number(b.dataset.id),x=items.find(y=>y.id===id);if(!x)return;
switch(b.dataset.act){
case"edit":$("edit"+id).value=(x.caption||"")+(x.hashtags?"\n"+x.hashtags:"");$("edit"+id).classList.remove("hidden");$("savebox"+id).classList.remove("hidden");break;
case"save":{const lines=$("edit"+id).value.split("\n");x.hashtags=lines.filter(s=>s.trim().startsWith("#")).slice(0,5).join(" ");x.caption=lines.filter(s=>!s.trim().startsWith("#")).join("\n").trim();await save(x);refresh();break;}
case"copy":await navigator.clipboard.writeText(`${x.caption||""}\n${x.hashtags||""}`.trim());status("Caption ও Hashtag কপি হয়েছে।");break;
case"move":x.status=x.status==="used"?"unused":"used";await save(x);refresh();break;
case"trash":x.deleted=true;await save(x);refresh();break;
case"restore":x.deleted=false;await save(x);refresh();break;
case"purge":if(confirm("ফাইলটি স্থায়ীভাবে মুছবেন?")){await del(id);refresh();}break;
case"share":{if(navigator.share){try{await navigator.share({title:x.name,text:x.caption+"\n"+x.hashtags,files:[new File([x.blob],x.name,{type:x.blob.type})]});}catch(err){}}else{await navigator.clipboard.writeText(x.caption+"\n"+x.hashtags);status("এই ব্রাউজারে ফাইল Share সমর্থিত নয়; Caption কপি হয়েছে।");}break;}
}};
$("setPin").onclick=()=>{const p=$("pin").value;if(!/^\d{4,8}$/.test(p)){alert("৪–৮ সংখ্যার PIN দিন");return;}localStorage.setItem("mgp_pin",p);$("pin").value="";alert("এই ব্রাউজারে PIN সেট হয়েছে।");};
$("lock").onclick=()=>{document.querySelector("main").classList.add("hidden");$("unlockArea").classList.remove("hidden");};
$("unlock").onclick=()=>{if($("unlockPin").value===localStorage.getItem("mgp_pin")){document.querySelector("main").classList.remove("hidden");$("unlockArea").classList.add("hidden");$("unlockPin").value="";}else alert("ভুল PIN");};
$("export").onclick=async()=>{const data=(await all()).map(({blob,...x})=>x);const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download="gallery-metadata-backup.json";a.click();URL.revokeObjectURL(a.href);};
openDB().then(d=>{db=d;refresh();}).catch(e=>status("Database চালু হয়নি: "+e.message));
})();