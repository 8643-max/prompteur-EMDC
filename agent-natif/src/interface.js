// Interface d'essai d'EMDC Nexus — servie par le serveur lui-même (GET /).
// Elle appelle les endpoints du cœur en même origine : conversation, studio
// (image/voix), document. Accessible à nexus.emdcconsulting.com.

export const PAGE_INTERFACE = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>EMDC Nexus — Console d'essai</title>
<style>
:root{--bg:#0A1128;--surface:#0F1A35;--elev:#152040;--border:rgba(212,175,55,.25);--gold:#D4AF37;--gold-l:#F0CF6B;--text:#F0EAD6;--muted:#8FA8CC;--ok:#22C55E;--err:#EF4444}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
header{padding:16px 22px;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;flex-wrap:wrap}
header h1{font-size:17px;color:var(--gold)}
header .etat{font-size:11px;padding:3px 10px;border-radius:12px;border:1px solid var(--border)}
header .etat.ok{color:var(--ok);border-color:var(--ok)}
header .etat.nok{color:var(--err);border-color:var(--err)}
header .coffre{margin-left:auto;font-size:12px;color:var(--muted);text-decoration:none;border:1px solid var(--border);padding:5px 12px;border-radius:8px}
header .coffre:hover{color:var(--gold)}
.onglets{display:flex;gap:4px;padding:14px 22px 0;flex-wrap:wrap}
.onglet{padding:9px 18px;border:1px solid var(--border);border-bottom:none;border-radius:10px 10px 0 0;background:transparent;color:var(--muted);cursor:pointer;font-size:13px;font-weight:600}
.onglet.actif{background:var(--surface);color:var(--gold)}
main{padding:18px 22px;max-width:900px;margin:0 auto}
.panneau{display:none;background:var(--surface);border:1px solid var(--border);border-radius:0 12px 12px 12px;padding:18px}
.panneau.actif{display:block}
label{display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:12px 0 4px}
input,select,textarea{width:100%;padding:10px 12px;background:var(--elev);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13.5px}
textarea{min-height:70px;resize:vertical}
.btn{padding:10px 20px;background:linear-gradient(135deg,var(--gold),var(--gold-l));color:#0A1128;font-weight:700;border:none;border-radius:9px;cursor:pointer;font-size:14px;margin-top:14px}
.btn:disabled{opacity:.5;cursor:not-allowed}
#chat{display:flex;flex-direction:column;gap:8px;max-height:46vh;overflow-y:auto;padding:6px 2px}
.msg{max-width:82%;padding:9px 13px;border-radius:12px;font-size:13.5px;line-height:1.55;white-space:pre-wrap}
.msg.user{align-self:flex-end;background:#152A4A;border-bottom-right-radius:3px}
.msg.ia{align-self:flex-start;background:#0C1830;border:1px solid var(--border);border-bottom-left-radius:3px}
.msg .qui{display:block;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin-bottom:3px}
.ligne{display:flex;gap:10px;margin-top:12px}
.ligne input{flex:1}
#imgResultat{margin-top:14px;text-align:center}
#imgResultat img{max-width:100%;max-height:55vh;border-radius:10px;border:1px solid var(--border)}
iframe{width:100%;height:60vh;border:1px solid var(--border);border-radius:8px;margin-top:14px;background:#fff}
.msg.retour{margin-top:12px;font-size:13px;padding:10px 12px;border-radius:8px;background:rgba(34,197,94,.1);border:1px solid var(--ok);color:var(--ok)}
.msg.retour.err{background:rgba(239,68,68,.1);border-color:var(--err);color:var(--err)}
</style></head><body>
<header>
  <h1>⚡ EMDC Nexus — Console d'essai</h1>
  <span class="etat" id="etat">⏳ connexion…</span>
  <a class="coffre" href="/coffre">🔐 Coffre des clés</a>
</header>
<div class="onglets">
  <button class="onglet actif" data-p="conversation" onclick="choisir(this)">💬 Conversation</button>
  <button class="onglet" data-p="image" onclick="choisir(this)">🖼️ Image</button>
  <button class="onglet" data-p="voix" onclick="choisir(this)">🎙️ Voix</button>
  <button class="onglet" data-p="document" onclick="choisir(this)">📄 Document</button>
</div>
<main>
<div class="panneau actif" id="p-conversation">
  <div id="chat"></div>
  <div class="ligne">
    <input id="question" placeholder="Écrivez votre question à EMDC Nexus…" onkeydown="if(event.key==='Enter')envoyer()">
    <button class="btn" id="btnQ" onclick="envoyer()">Envoyer</button>
  </div>
</div>
<div class="panneau" id="p-image">
  <label>Votre demande d'image</label>
  <textarea id="promptImage" placeholder="ex : un plat de thieboudienne, photographie professionnelle"></textarea>
  <button class="btn" id="btnImg" onclick="genererImage()">Générer l'image</button>
  <div id="imgResultat"></div>
</div>
<div class="panneau" id="p-voix">
  <label>Texte à faire dire à la voix</label>
  <textarea id="texteVoix" placeholder="Bonjour, bienvenue chez EMDC Consulting !"></textarea>
  <label>Identifiant de la voix (optionnel)</label>
  <input id="voiceId" value="EXAVITQu4vr4xnSDxMaL" placeholder="voice_id ElevenLabs">
  <button class="btn" id="btnVoix" onclick="genererVoix()">Générer la voix</button>
  <div class="msg retour" id="retourVoix"></div>
</div>
<div class="panneau" id="p-document">
  <label>Titre du document</label>
  <input id="docTitre" value="Inventaire cuisine — Restaurant Le Baobab">
  <label>Sous-titre (optionnel)</label>
  <input id="docSous" value="AUDIT · Septembre 2026">
  <label>Habillage</label>
  <select id="docHab"><option value="rapport">Rapport</option><option value="client" selected>Client</option><option value="technique">Technique</option><option value="emdc">EMDC</option></select>
  <label>Contenu (texte ou blocs, séparés par un retour à la ligne)</label>
  <textarea id="docContenu" placeholder="Premier paragraphe…&#10;Deuxième paragraphe…"></textarea>
  <button class="btn" id="btnDoc" onclick="genererDocument()">Générer le document</button>
  <iframe id="docApercu"></iframe>
</div>
</main>
<script>
const $=id=>document.getElementById(id);
const USER_DEFAUT='eldjidiallo8643@gmail.com';
async function etatSante(){
  try{
    const r=await fetch('/sante');const d=await r.json();
    $('etat').textContent='✅ '+d.cerveau+' · Supabase '+(d.supabase?'OK':'hors ligne');
    $('etat').className='etat ok';
  }catch(e){$('etat').textContent='❌ hors ligne';$('etat').className='etat nok';}
}
function choisir(b){document.querySelectorAll('.onglet').forEach(o=>o.classList.remove('actif'));b.classList.add('actif');document.querySelectorAll('.panneau').forEach(p=>p.classList.remove('actif'));$('p-'+b.dataset.p).classList.add('actif');}
function ajouter(role,texte){const d=document.createElement('div');d.className='msg '+role;d.innerHTML='<span class="qui">'+(role==='user'?'Vous':'EMDC Nexus')+'</span>'+texte.replace(/</g,'&lt;');$('chat').appendChild(d);$('chat').scrollTop=$('chat').scrollHeight;}
async function envoyer(){
  const q=$('question').value.trim();if(!q)return;
  ajouter('user',q);$('question').value='';$('btnQ').disabled=true;
  try{
    const r=await fetch('/conversation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,historique:[],profil:'Entrepreneur EMDC'})});
    const d=await r.json();
    if(d.contenu)ajouter('ia',d.contenu);else ajouter('ia','⚠ '+(d.erreur||'réponse vide'));
  }catch(e){ajouter('ia','⚠ Erreur: '+e.message);}
  $('btnQ').disabled=false;$('question').focus();
}
async function genererImage(){
  const p=$('promptImage').value.trim();if(!p)return;
  $('imgResultat').innerHTML='<p style="color:var(--muted)">Génération en cours… (30-90 s)</p>';
  $('btnImg').disabled=true;
  try{
    const r=await fetch('/studio',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'image',prompt:p,user_id:USER_DEFAUT,session_id:'essai-'+Date.now()})});
    const d=await r.json();
    if(d.url){$('imgResultat').innerHTML='<img src="'+d.url+'" alt="Image générée"><p style="font-size:11px;color:var(--muted);margin-top:6px">1 crédit · '+d.url.slice(0,60)+'…</p>';}
    else{$('imgResultat').innerHTML='<div class="msg retour err">'+(d.erreur||'Erreur inconnue')+'</div>';}
  }catch(e){$('imgResultat').innerHTML='<div class="msg retour err">Erreur: '+e.message+'</div>';}
  $('btnImg').disabled=false;
}
async function genererVoix(){
  const t=$('texteVoix').value.trim();if(!t)return;
  $('retourVoix').textContent='Génération en cours…';$('retourVoix').className='msg retour';$('btnVoix').disabled=true;
  try{
    const r=await fetch('/studio',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'voix',prompt:t,voice_id:$('voiceId').value.trim()||'EXAVITQu4vr4xnSDxMaL',user_id:USER_DEFAUT,session_id:'essai-'+Date.now()})});
    const d=await r.json();
    if(d.ok){$('retourVoix').textContent='✅ Voix générée ('+d.octets+' octets, 1 crédit). Hébergement audio bientôt branché.';$('retourVoix').className='msg retour';}
    else{$('retourVoix').textContent='❌ '+(d.erreur||'Erreur');$('retourVoix').className='msg retour err';}
  }catch(e){$('retourVoix').textContent='❌ '+e.message;$('retourVoix').className='msg retour err';}
  $('btnVoix').disabled=false;
}
async function genererDocument(){
  const titre=$('docTitre').value.trim();if(!titre)return;
  const lignes=$('docContenu').value.split('\n').map(s=>s.trim()).filter(Boolean);
  const blocs=lignes.map(t=>({type:'texte',texte:t}));
  const spec={titre,sous_titre:$('docSous').value.trim(),habillage:$('docHab').value,pied:'EMDC Consulting — Généré par EMDC Nexus',blocs};
  $('btnDoc').disabled=true;
  try{
    const r=await fetch('/document',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(spec)});
    const html=await r.text();
    $('docApercu').srcdoc=html;
  }catch(e){alert('Erreur: '+e.message);}
  $('btnDoc').disabled=false;
}
etatSante();
ajouter('ia','Bienvenue sur la console d\'essai EMDC Nexus. Posez une question, générez une image, une voix ou un document — tout tourne en natif, sans n8n.');
</script></body></html>`;
