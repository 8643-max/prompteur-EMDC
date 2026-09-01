// Interface d'essai d'EMDC Nexus — servie par le serveur lui-même (GET /).
// Reprend la structure visuelle de l'application EMDC Copilote (copilote/index.html) :
// fond bleu nuit, doré maison, header avec solde, sidebar d'outils, chat central,
// modes Standard/Vision. Appelle les endpoints du cœur en même origine.
// NOTE : page générée dans un template literal — les antislashs doivent être
// DOUBLÉS (\\n, \\t…) pour que le navigateur reçoive le bon code.

export const PAGE_INTERFACE = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>EMDC Nexus — Console d'essai</title>
<style>
:root{
  --bg-base:#0A1128;--bg-surface:#0F1A35;--bg-elevated:#152040;--bg-hover:#1A2850;--bg-input:#0D1730;
  --border:rgba(212,175,55,.14);--border-strong:rgba(212,175,55,.32);--border-user:rgba(212,175,55,.22);
  --gold:#D4AF37;--gold-light:#F0CF6B;--gold-muted:#C5A059;--gold-dim:rgba(212,175,55,.10);
  --text-primary:#F0EAD6;--text-secondary:#8FA8CC;--text-muted:#5C7595;
  --green:#22C55E;--green-dim:rgba(34,197,94,.14);--amber:#F59E0B;--amber-dim:rgba(245,158,11,.14);
  --red:#EF4444;--red-dim:rgba(239,68,68,.14);
  --user-bubble:#152A4A;--ai-bubble:#0C1830;--on-accent:#0A1128;
  --radius:10px;--header-h:56px;--sidebar-w:236px;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;font-family:system-ui,-apple-system,sans-serif;background:var(--bg-base);color:var(--text-primary);overflow:hidden;font-size:14px;line-height:1.55}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:3px}
.gold-text{background:linear-gradient(115deg,#C5A059 0%,#F0CF6B 35%,#D4AF37 55%,#F0CF6B 75%,#C5A059 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
#app{position:fixed;inset:0;display:flex;flex-direction:column}
.app-header{height:var(--header-h);min-height:var(--header-h);background:var(--bg-surface);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 14px;gap:10px;position:relative;z-index:20}
.header-logo{display:flex;align-items:center;gap:8px;flex-shrink:0}
.header-logo .brand-emdc{font-family:Georgia,serif;font-size:15px;font-weight:bold;letter-spacing:.03em;color:var(--gold)}
.header-logo .brand-sub{font-size:7px;color:var(--gold-muted);letter-spacing:.32em;text-transform:uppercase;display:block;margin-top:2px}
.header-divider{width:1px;height:24px;background:var(--border)}
.badge-workspace{background:var(--gold-dim);border:1px solid var(--border);color:var(--gold-muted);font-size:9px;letter-spacing:.18em;padding:3px 8px;border-radius:20px;text-transform:uppercase}
.header-spacer{flex:1}
.token-counter{display:flex;align-items:center;gap:7px;background:var(--bg-elevated);border:1px solid var(--border);padding:5px 11px;border-radius:22px;flex-shrink:0}
.token-bolt{color:var(--gold);font-size:13px}
.token-count{font-weight:700;font-size:14px}
.token-label{font-size:10px;color:var(--text-muted);letter-spacing:.08em}
.btn-recharge{background:var(--gold-dim);border:1px solid var(--border-strong);color:var(--gold);font-size:11px;padding:5px 10px;border-radius:16px;cursor:pointer;flex-shrink:0;text-decoration:none;transition:background .2s}
.btn-recharge:hover{background:rgba(212,175,55,.22)}
.avatar-btn{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--gold-muted),var(--gold));color:var(--on-accent);font-weight:700;font-size:13px;border:2px solid var(--border-strong);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.app-body{flex:1;display:grid;overflow:hidden;grid-template-columns:var(--sidebar-w) 1fr;grid-template-rows:1fr}
.sidebar{background:var(--bg-surface);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}
.sidebar-top{padding:12px;display:flex;align-items:center;gap:8px}
.btn-new-session{flex:1;padding:9px 12px;background:var(--gold-dim);border:1px solid var(--border-strong);color:var(--gold);font-size:13px;font-weight:600;border-radius:var(--radius);cursor:pointer;display:flex;align-items:center;gap:7px;transition:background .2s}
.btn-new-session:hover{background:rgba(212,175,55,.2)}
.sidebar-scroll{flex:1;overflow-y:auto;padding:0 6px 12px}
.sidebar-label{font-size:9.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--text-muted);padding:10px 4px 6px}
.tool-item{display:flex;align-items:center;gap:8px;padding:8px 8px;border-radius:7px;cursor:pointer;color:var(--text-secondary);font-size:13px;transition:background .15s,color .15s;border:1px solid transparent}
.tool-item:hover{background:var(--bg-hover);color:var(--text-primary)}
.tool-item.active{background:var(--gold-dim);color:var(--gold);border-color:var(--border)}
.tool-item .tool-icon{font-size:15px;flex-shrink:0}
.chat-zone{display:flex;flex-direction:column;overflow:hidden;background:var(--bg-base)}
.chat-subheader{padding:7px 16px;border-bottom:1px solid var(--border);background:var(--bg-surface);display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted)}
.chat-subheader-title{flex:1;font-weight:600;color:var(--text-secondary)}
.messages-wrap{flex:1;overflow-y:auto;padding:18px 0;display:flex;flex-direction:column;scroll-behavior:smooth}
.welcome-center{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;text-align:center;gap:14px}
.welcome-title{font-family:Georgia,serif;font-size:20px;font-weight:bold;color:var(--gold)}
.welcome-sub{font-size:13px;color:var(--text-secondary);max-width:380px;line-height:1.65}
.welcome-chips{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin-top:6px}
.chip{padding:6px 13px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:20px;font-size:12px;color:var(--text-secondary);cursor:pointer;transition:border-color .2s,color .2s}
.chip:hover{border-color:var(--gold);color:var(--gold)}
.msg{display:flex;gap:10px;padding:5px 18px;animation:fadeUp .22s ease-out}
@keyframes fadeUp{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
.msg.user{flex-direction:row-reverse}
.msg-avatar{width:28px;height:28px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}
.msg.assistant .msg-avatar{background:linear-gradient(135deg,var(--gold-muted),var(--gold));color:var(--on-accent)}
.msg.user .msg-avatar{background:var(--user-bubble);border:1px solid var(--border-user);color:var(--text-secondary)}
.msg-bubble{max-width:72%;padding:10px 14px;border-radius:14px;font-size:13.5px;line-height:1.6}
.msg.assistant .msg-bubble{background:var(--ai-bubble);border:1px solid var(--border);border-bottom-left-radius:4px}
.msg.user .msg-bubble{background:var(--user-bubble);border:1px solid var(--border-user);border-bottom-right-radius:4px}
.msg-bubble strong{color:var(--gold-muted)}
.msg-bubble img{max-width:100%;border-radius:8px;border:1px solid var(--border-strong);margin-top:6px}
.typing-dot{width:7px;height:7px;border-radius:50%;background:var(--gold-muted);animation:blink 1.2s ease-in-out infinite}
.typing-dot:nth-child(2){animation-delay:.25s}.typing-dot:nth-child(3){animation-delay:.5s}
@keyframes blink{0%,80%,100%{opacity:.25;transform:scale(.85)}40%{opacity:1;transform:scale(1)}}
.input-bar{padding:10px 18px 14px;border-top:1px solid var(--border);background:var(--bg-surface);display:flex;flex-direction:column;gap:9px}
.mode-switcher{display:flex;gap:6px}
.mode-btn{display:flex;align-items:center;gap:6px;padding:5px 11px;border-radius:20px;font-size:11px;cursor:pointer;border:1px solid transparent;transition:all .2s;background:transparent;color:var(--text-muted)}
.mode-btn.active.standard{background:var(--green-dim);border-color:var(--green);color:var(--green)}
.mode-btn.active.vision{background:var(--amber-dim);border-color:var(--amber);color:var(--amber)}
.mode-dot{width:7px;height:7px;border-radius:50%}
.mode-btn.active.standard .mode-dot{background:var(--green)}
.mode-btn.active.vision .mode-dot{background:var(--amber)}
.input-row{display:flex;gap:8px;align-items:flex-end}
#input{flex:1;padding:11px 14px;background:var(--bg-input);border:1px solid var(--border);border-radius:12px;color:var(--text-primary);font-size:14px;outline:none;resize:none;min-height:42px;max-height:120px;font-family:inherit}
#input:focus{border-color:var(--gold)}
.btn-icon{width:38px;height:38px;border-radius:9px;background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-secondary);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:border-color .15s,color .15s}
.btn-icon:hover{border-color:var(--gold);color:var(--gold)}
.btn-icon.primary{background:linear-gradient(135deg,var(--gold-muted),var(--gold));color:var(--on-accent);font-weight:700}
.btn-icon.primary:hover{opacity:.9}
@media (max-width:720px){.app-body{grid-template-columns:1fr}.sidebar{display:none}}
</style></head><body>
<div id="app">
  <header class="app-header">
    <div class="header-logo">
      <div><span class="brand-emdc">EMDC <span class="gold-text">NEXUS</span></span><span class="brand-sub">COPILOTE D'ENTREPRISE</span></div>
    </div>
    <div class="header-divider"></div>
    <span class="badge-workspace">AI WORKSPACE</span>
    <div class="header-spacer"></div>
    <div class="token-counter" onclick="chargerSolde()">
      <span class="token-bolt">⚡</span><span class="token-count" id="solde">0</span><span class="token-label">crédits</span>
    </div>
    <a class="btn-recharge" href="/coffre">🔐 Coffre</a>
    <div class="avatar-btn">N</div>
  </header>
  <div class="app-body">
    <aside class="sidebar">
      <div class="sidebar-top">
        <button class="btn-new-session" onclick="nouvelleSession()">＋ Nouvelle session</button>
      </div>
      <div class="sidebar-scroll">
        <div class="sidebar-label">OUTILS RAPIDES</div>
        <div class="tool-item active" data-outil="conversation" onclick="choisirOutil(this)"><span class="tool-icon">💬</span> Conversation générale</div>
        <div class="tool-item" data-outil="image" onclick="choisirOutil(this)"><span class="tool-icon">🖼️</span> Génération d'image</div>
        <div class="tool-item" data-outil="voix" onclick="choisirOutil(this)"><span class="tool-icon">🎙️</span> Voix IA</div>
        <div class="tool-item" data-outil="document" onclick="choisirOutil(this)"><span class="tool-icon">📄</span> Document soigné</div>
        <div class="tool-item" data-outil="presentation" onclick="choisirOutil(this)"><span class="tool-icon">📊</span> Présentation</div>
        <div class="sidebar-label">HISTORIQUE</div>
        <div class="history-empty" id="histo">Aucune session pour cet outil</div>
      </div>
    </aside>
    <main class="chat-zone">
      <div class="chat-subheader"><span class="chat-subheader-title" id="titreOutil">💬 Conversation générale</span><span id="etatCerveau">…</span></div>
      <div class="messages-wrap" id="messages">
        <div class="welcome-center" id="welcome">
          <div class="welcome-title">EMDC Nexus</div>
          <div class="welcome-sub">Votre assistant IA nouvelle génération : discutez, générez des images, des voix, des documents et des présentations. Tout tourne en natif.</div>
          <div class="welcome-chips">
            <button class="chip" onclick="chip('Bonjour, présente-toi')">👋 Présentation</button>
            <button class="chip" onclick="chip('Combien de crédits me reste-t-il ?')">⚡ Mon solde</button>
          </div>
        </div>
      </div>
      <div class="input-bar">
        <div class="mode-switcher">
          <button class="mode-btn active standard" onclick="setMode(this,'standard')"><span class="mode-dot"></span>Mode Standard <span class="mode-cost">Gratuit</span></button>
          <button class="mode-btn vision" onclick="setMode(this,'vision')"><span class="mode-dot"></span>⚡ Vision Avancée <span class="mode-cost">1 crédit</span></button>
        </div>
        <div class="input-row">
          <textarea id="input" rows="1" placeholder="Écrivez votre demande à EMDC Nexus…" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();envoyer()}"></textarea>
          <button class="btn-icon primary" onclick="envoyer()">➤</button>
        </div>
      </div>
    </main>
  </div>
</div>
<script>
const $=id=>document.getElementById(id);
const USER="eldjidiallo8643@gmail.com";
let MODE='standard';
let historique=[];

function ajouter(role,texte,extra){
  const w=$('welcome');if(w)w.style.display='none';
  const d=document.createElement('div');d.className='msg '+role;
  const avatar=document.createElement('div');avatar.className='msg-avatar';avatar.textContent=role==='user'?'E':'N';
  const b=document.createElement('div');b.className='msg-bubble';b.innerHTML=texte.replace(/</g,'&lt;').replace(/\\n/g,'<br>');
  if(extra&&extra.image){const im=document.createElement('img');im.src=extra.image;b.appendChild(im);}
  d.appendChild(avatar);d.appendChild(b);$('messages').appendChild(d);$('messages').scrollTop=$('messages').scrollHeight;
}
function typeur(){
  const d=document.createElement('div');d.className='msg assistant';
  const av=document.createElement('div');av.className='msg-avatar';av.textContent='N';
  const b=document.createElement('div');b.className='msg-bubble';b.innerHTML='<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
  d.appendChild(av);d.appendChild(b);$('messages').appendChild(d);$('messages').scrollTop=$('messages').scrollHeight;
  return d;
}
function retirer(d){if(d&&d.parentNode)d.parentNode.removeChild(d);}
async function chargerSolde(){
  try{const r=await fetch('/solde?user='+encodeURIComponent(USER));const d=await r.json();if(d.solde!=null)$('solde').textContent=Math.floor(d.solde);}catch(e){}
}
async function etatCerveau(){
  try{const r=await fetch('/sante');const d=await r.json();$('etatCerveau').textContent='✅ '+d.cerveau+' · Supabase '+(d.supabase?'OK':'hors ligne');}catch(e){$('etatCerveau').textContent='❌ hors ligne';}
}
function setMode(btn,m){document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active','standard','vision'));btn.classList.add('active',m);MODE=m;}
function choisirOutil(el){document.querySelectorAll('.tool-item').forEach(t=>t.classList.remove('active'));el.classList.add('active');$('titreOutil').textContent=el.textContent.trim();}
function nouvelleSession(){historique=[];$('messages').innerHTML='';const w=$('welcome');w.style.display='';}
function chip(t){$('input').value=t;envoyer();}
async function envoyer(){
  const q=$('input').value.trim();if(!q)return;
  const outilActif=document.querySelector('.tool-item.active');
  const outil=outilActif?outilActif.dataset.outil:'conversation';
  ajouter('user',q);$('input').value='';
  historique.push({role:'user',content:q});
  if(outil==='image'){return genererImage(q);}
  if(outil==='voix'){return genererVoix(q);}
  if(outil==='document'){return genererDocument(q);}
  if(outil==='presentation'){return genererPresentation(q);}
  const t=typeur();
  try{
    const r=await fetch('/conversation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,historique:historique.slice(-6),profil:'Entrepreneur EMDC'})});
    const d=await r.json();
    retirer(t);
    if(d.contenu){ajouter('assistant',d.contenu);historique.push({role:'assistant',content:d.contenu});}
    else ajouter('assistant','⚠ '+(d.erreur||'réponse vide'));
  }catch(e){retirer(t);ajouter('assistant','⚠ Erreur: '+e.message);}
}
async function genererImage(q){
  const t=typeur();
  try{
    const r=await fetch('/studio',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'image',prompt:q,user_id:USER,session_id:'essai-'+Date.now()})});
    const d=await r.json();
    retirer(t);
    if(d.url){ajouter('assistant','Voici votre image (1 crédit) :',{image:d.url});chargerSolde();}
    else ajouter('assistant','⚠ '+(d.erreur||'Erreur'));
  }catch(e){retirer(t);ajouter('assistant','⚠ '+e.message);}
}
async function genererVoix(q){
  const t=typeur();
  try{
    const r=await fetch('/studio',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'voix',prompt:q,voice_id:'EXAVITQu4vr4xnSDxMaL',user_id:USER,session_id:'essai-'+Date.now()})});
    const d=await r.json();
    retirer(t);
    if(d.ok)ajouter('assistant','✅ Voix générée ('+d.octets+' octets, 1 crédit). Hébergement audio bientôt branché.');
    else ajouter('assistant','⚠ '+(d.erreur||'Erreur'));
  }catch(e){retirer(t);ajouter('assistant','⚠ '+e.message);}
}
async function genererDocument(q){
  const t=typeur();
  try{
    const spec={titre:q||'Document EMDC Nexus',sous_titre:'Généré par EMDC Nexus',habillage:'client',pied:'EMDC Consulting',blocs:[{type:'texte',texte:q||'Contenu du document.'}]};
    const r=await fetch('/document',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(spec)});
    const html=await r.text();
    retirer(t);
    const w=window.open('','_blank');if(w){w.document.write(html);w.document.close();}else ajouter('assistant','Document généré — autorisez les fenêtres pop-up pour l\'ouvrir.');
  }catch(e){retirer(t);ajouter('assistant','⚠ '+e.message);}
}
async function genererPresentation(q){
  const t=typeur();
  try{
    const spec={titre:q||'Présentation EMDC Nexus',habillage:'emdc',diapos:[{type:'couverture',surtitre:'EMDC CONSULTING',titre:q||'EMDC Nexus',sous_titre:'Présentation générée'},{type:'points',titre:'Points clés',items:['Natif, sans n8n','Cerveau interchangeable','Créations haut de gamme']}]};
    const r=await fetch('/presentation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(spec)});
    const html=await r.text();
    retirer(t);
    const w=window.open('','_blank');if(w){w.document.write(html);w.document.close();}else ajouter('assistant','Présentation générée — autorisez les pop-up.');
  }catch(e){retirer(t);ajouter('assistant','⚠ '+e.message);}
}
etatCerveau();chargerSolde();
</script></body></html>`;
