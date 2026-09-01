// OUTIL P1 — Moteur de documents soignés & présentations d'EMDC Nexus.
// Reprend les fonctionnalités de création du Gardien (document_soigne,
// presentation) : des livrables mis en page, prêts à être remis à un client,
// imprimés en PDF ou projetés.
//
// Quatre habillages, comme à la maison EMDC :
//   rapport  — sobre, pour un bilan ou un audit
//   client   — chaleureux, pour un devis ou une proposition
//   technique— précis, pour une procédure
//   emdc     — aux couleurs de la maison
//
// Le rendu est du HTML autonome (styles inclus) : il peut être ouvert tel quel,
// imprimé en PDF, ou embarqué. Les blocs sont décrits en JSON, la mise en page
// est générée — c'est le moteur qui fait le soin, pas l'utilisateur.

const HABILLAGES = {
  rapport: {
    nom: 'Rapport',
    couleurs: { fond: '#F7F6F2', surface: '#FFFFFF', encre: '#1F2937', accent: '#1D4ED8', accent2: '#0F766E', trait: '#E5E7EB' },
    police: 'Georgia, \'Times New Roman\', serif',
  },
  client: {
    nom: 'Client',
    couleurs: { fond: '#FDF8F0', surface: '#FFFFFF', encre: '#292524', accent: '#B45309', accent2: '#92400E', trait: '#F1E4D0' },
    police: '\'Segoe UI\', system-ui, sans-serif',
  },
  technique: {
    nom: 'Technique',
    couleurs: { fond: '#F8FAFC', surface: '#FFFFFF', encre: '#0F172A', accent: '#0369A1', accent2: '#334155', trait: '#E2E8F0' },
    police: '\'JetBrains Mono\', Consolas, monospace',
  },
  emdc: {
    nom: 'EMDC',
    couleurs: { fond: '#0A1128', surface: '#0F1A35', encre: '#F0EAD6', accent: '#D4AF37', accent2: '#F0CF6B', trait: 'rgba(212,175,55,.3)' },
    police: 'system-ui, -apple-system, sans-serif',
  },
};

// ── Échappement HTML (sécurité) ──
function h(texte) {
  return String(texte ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Mini-markdown : **gras**, *italique*, `code` ──
function md(texte) {
  return h(texte)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

// ── Rendu d'un bloc ──
function rendreBloc(bloc, c) {
  const t = bloc.type;
  if (t === 'titre') return `<h2>${md(bloc.texte || '')}</h2>`;
  if (t === 'soustitre') return `<p class="soustitre">${md(bloc.texte || '')}</p>`;
  if (t === 'texte') return `<p class="texte">${md(bloc.texte || '')}</p>`;
  if (t === 'points') {
    const items = (bloc.items || []).map(i => `<li>${md(i)}</li>`).join('');
    return `<ul class="points">${items}</ul>`;
  }
  if (t === 'etapes') {
    const items = (bloc.items || []).map((i, idx) => `<li><span class="num">${idx + 1}</span><span>${md(i)}</span></li>`).join('');
    return `<ol class="etapes">${items}</ol>`;
  }
  if (t === 'chiffres') {
    const items = (bloc.items || []).map(i => `<div class="chiffre"><span class="valeur">${h(i.valeur)}</span><span class="libelle">${h(i.libelle)}</span>${i.detail ? `<span class="detail">${h(i.detail)}</span>` : ''}</div>`).join('');
    return `<div class="chiffres">${items}</div>`;
  }
  if (t === 'tableau') {
    const cols = (bloc.colonnes || []).map(x => `<th>${h(x)}</th>`).join('');
    const lignes = (bloc.lignes || []).map(l => `<tr>${l.map(x => `<td>${md(x)}</td>`).join('')}</tr>`).join('');
    return `<table><thead><tr>${cols}</tr></thead><tbody>${lignes}</tbody></table>` + (bloc.legende ? `<p class="legende">${md(bloc.legende)}</p>` : '');
  }
  if (t === 'encadre') {
    const tons = { info: '#2563EB', attention: '#D97706', danger: '#DC2626', succes: '#16A34A' };
    const bordure = tons[bloc.ton] || tons.info;
    return `<div class="encadre" style="border-left-color:${bordure}"><strong>${md(bloc.titre || '')}</strong><p>${md(bloc.texte || '')}</p></div>`;
  }
  if (t === 'citation') {
    return `<blockquote>${md(bloc.texte || '')}${bloc.source ? `<footer>— ${h(bloc.source)}</footer>` : ''}</blockquote>`;
  }
  if (t === 'code') return `<pre><code>${h(bloc.texte || '')}</code></pre>`;
  if (t === 'separateur') return `<hr>`;
  return '';
}

/**
 * Construit un document soigné en HTML autonome.
 * @param {{ titre, sous_titre?, habillage?, pied?, blocs: Array }} spec
 * @returns {string} HTML complet
 */
export function rendreDocument(spec) {
  const hab = HABILLAGES[spec.habillage] || HABILLAGES.rapport;
  const c = hab.couleurs;
  const blocs = (spec.blocs || []).map(b => rendreBloc(b, c)).join('\n');
  const sousTitre = spec.sous_titre ? `<p class="soustitre">${md(spec.sous_titre)}</p>` : '';
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${h(spec.titre || 'Document')}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:${hab.police};background:${c.fond};color:${c.encre};line-height:1.65;padding:40px 20px}
  .page{max-width:820px;margin:0 auto;background:${c.surface};border:1px solid ${c.trait};border-radius:14px;padding:48px 56px;box-shadow:0 8px 30px rgba(0,0,0,.06)}
  h1{font-size:30px;letter-spacing:-.02em;line-height:1.2;margin-bottom:6px;color:${c.encre}}
  .soustitre{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:${c.accent};font-weight:700;margin-bottom:14px}
  .pied{margin-top:36px;padding-top:16px;border-top:1px solid ${c.trait};font-size:11px;color:${c.accent2};text-align:center}
  h2{font-size:19px;margin:30px 0 12px;color:${c.accent};padding-bottom:6px;border-bottom:2px solid ${c.trait}}
  .texte{font-size:15px;margin:10px 0}
  .points{margin:10px 0 10px 22px}
  .points li{margin:6px 0;font-size:14.5px}
  .etapes{list-style:none;margin:12px 0;counter-reset:etape}
  .etapes li{display:flex;gap:12px;margin:10px 0;font-size:14.5px;align-items:flex-start}
  .etapes .num{flex:0 0 28px;height:28px;border-radius:50%;background:${c.accent};color:${c.fond};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700}
  .chiffres{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:16px 0}
  .chiffre{background:${c.fond};border:1px solid ${c.trait};border-radius:10px;padding:14px;text-align:center}
  .chiffre .valeur{display:block;font-size:26px;font-weight:800;color:${c.accent}}
  .chiffre .libelle{display:block;font-size:12px;color:${c.accent2};margin-top:2px}
  .chiffre .detail{display:block;font-size:11px;color:${c.accent2};opacity:.8;margin-top:4px}
  table{width:100%;border-collapse:collapse;margin:14px 0;font-size:13.5px}
  th{background:${c.accent};color:${c.fond};padding:9px 12px;text-align:left;font-weight:600}
  td{padding:8px 12px;border-bottom:1px solid ${c.trait}}
  tr:nth-child(even) td{background:${c.fond}}
  .legende{font-size:11px;color:${c.accent2};font-style:italic;margin-top:-8px}
  .encadre{border-left:5px solid;background:${c.fond};padding:14px 18px;border-radius:0 8px 8px 0;margin:16px 0}
  .encadre p{margin-top:6px;font-size:14px}
  blockquote{font-size:17px;font-style:italic;border-left:3px solid ${c.accent};padding:6px 18px;margin:16px 0;color:${c.accent2}}
  blockquote footer{font-size:12px;font-style:normal;margin-top:6px}
  pre{background:${c.fond};border:1px solid ${c.trait};border-radius:8px;padding:14px;overflow:auto;font-size:12.5px;margin:12px 0}
  code{font-family:${hab.police}}
  hr{border:none;border-top:1px solid ${c.trait};margin:22px 0}
  @media print{body{padding:0;background:#fff}.page{box-shadow:none;border:none;padding:20px}}
</style></head><body><div class="page">
<h1>${md(spec.titre || 'Document')}</h1>
${sousTitre}
${blocs}
${spec.pied ? `<div class="pied">${h(spec.pied)}</div>` : ''}
</div></body></html>`;
}

/**
 * Construit une présentation (diapositives) en HTML autonome, pilotable au
 * clavier (flèches). Chaque bloc décrit une diapositive.
 * @param {{ titre, habillage?, diapos: Array }} spec
 * @returns {string} HTML complet
 */
export function rendrePresentation(spec) {
  const hab = HABILLAGES[spec.habillage] || HABILLAGES.emdc;
  const c = hab.couleurs;
  const diapos = (spec.diapos || []).map((d, i) => {
    const cls = 'diapo' + (i === 0 ? ' active' : '');
    return `<section class="${cls}" data-i="${i}">${rendreDiapo(d, c)}</section>`;
  }).join('\n');
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${h(spec.titre || 'Présentation')}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:${hab.police};background:#000;overflow:hidden}
  .scene{width:100vw;height:100vh;position:relative}
  .diapo{position:absolute;inset:0;display:none;padding:7vh 8vw;background:${c.fond};color:${c.encre}}
  .diapo.active{display:flex;flex-direction:column;justify-content:center}
  .diapo .num{position:absolute;bottom:4vh;right:4vw;font-size:13px;color:${c.accent2};opacity:.6}
  h1{font-size:clamp(30px,6vw,64px);letter-spacing:-.02em;margin-bottom:8px}
  .surtitre{font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:${c.accent};font-weight:700;margin-bottom:10px}
  .sous_titre{font-size:clamp(16px,2.4vw,26px);color:${c.accent2};opacity:.85}
  h2{font-size:clamp(24px,4vw,44px);color:${c.accent};margin-bottom:14px}
  .accroche{font-size:clamp(15px,1.8vw,20px);color:${c.accent2};margin-bottom:22px;opacity:.9}
  .items{list-style:none;display:flex;flex-direction:column;gap:14px}
  .items li{font-size:clamp(15px,1.9vw,22px);display:flex;gap:12px;align-items:flex-start}
  .items li::before{content:"•";color:${c.accent};font-weight:800;font-size:1.2em}
  .note{margin-top:26px;font-size:13px;color:${c.accent2};opacity:.6;font-style:italic}
  .chiffres{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:18px}
  .chiffre{background:${c.surface};border:1px solid ${c.trait};border-radius:14px;padding:22px;text-align:center}
  .chiffre .valeur{display:block;font-size:clamp(28px,5vw,52px);font-weight:800;color:${c.accent}}
  .chiffre .libelle{display:block;font-size:14px;margin-top:6px}
  .chiffre .detail{display:block;font-size:12px;opacity:.7;margin-top:4px}
  table{width:100%;border-collapse:collapse;font-size:clamp(13px,1.5vw,18px)}
  th{background:${c.accent};color:${c.fond};padding:10px 14px;text-align:left}
  td{padding:9px 14px;border-bottom:1px solid ${c.trait}}
  .gauche,.droite{flex:1}
  .colonnes{display:flex;gap:40px}
  .colonnes h3{font-size:clamp(16px,2vw,22px);color:${c.accent};margin-bottom:12px}
  .colonnes li{margin:8px 0;font-size:clamp(14px,1.6vw,19px)}
  .citation{font-size:clamp(20px,3.4vw,38px);font-style:italic;text-align:center;color:${c.accent2}}
  .citation .src{margin-top:16px;font-size:14px;font-style:normal;color:${c.accent}}
  .contacts{margin-top:34px;display:flex;flex-direction:column;gap:8px;font-size:clamp(14px,1.6vw,19px);color:${c.accent2}}
  .touches{position:fixed;bottom:4vh;left:4vw;font-size:12px;color:#fff;opacity:.5;z-index:9;font-family:system-ui,sans-serif}
</style></head><body>
<div class="touches">← → pour naviguer</div>
<div class="scene">${diapos}</div>
<script>
let i = 0;
const ds = document.querySelectorAll('.diapo');
function aller(n){ ds[i].classList.remove('active'); i = Math.max(0, Math.min(ds.length-1, n)); ds[i].classList.add('active'); }
document.addEventListener('keydown', e => { if(e.key==='ArrowRight') aller(i+1); if(e.key==='ArrowLeft') aller(i-1); });
</script></body></html>`;
}

function rendreDiapo(d, c) {
  const t = d.type;
  const num = `<span class="num">${(d._i ?? 0) + 1}</span>`;
  if (t === 'couverture') {
    return `<div>${d.surtitre ? `<p class="surtitre">${h(d.surtitre)}</p>` : ''}<h1>${md(d.titre || '')}</h1>${d.sous_titre ? `<p class="sous_titre">${md(d.sous_titre)}</p>` : ''}${d.date ? `<p class="sous_titre" style="margin-top:18px;font-size:14px">${h(d.date)}</p>` : ''}${num}</div>`;
  }
  if (t === 'section') return `<div><p class="surtitre">${h(d.titre || '')}</p><h1 style="font-size:clamp(34px,6vw,64px)">${md(d.texte || '')}</h1>${num}</div>`;
  if (t === 'chiffres') {
    const items = (d.items || []).map(i => `<div class="chiffre"><span class="valeur">${h(i.valeur)}</span><span class="libelle">${h(i.libelle)}</span>${i.detail ? `<span class="detail">${h(i.detail)}</span>` : ''}</div>`).join('');
    return `<div><h2>${md(d.titre || '')}</h2><div class="chiffres">${items}</div>${num}</div>`;
  }
  if (t === 'tableau') {
    const cols = (d.colonnes || []).map(x => `<th>${h(x)}</th>`).join('');
    const lignes = (d.lignes || []).map(l => `<tr>${l.map(x => `<td>${md(x)}</td>`).join('')}</tr>`).join('');
    return `<div><h2>${md(d.titre || '')}</h2><table><thead><tr>${cols}</tr></thead><tbody>${lignes}</tbody></table>${num}</div>`;
  }
  if (t === 'comparaison') {
    return `<div><h2>${md(d.titre || '')}</h2><div class="colonnes"><div class="gauche"><h3>${md(d.gauche_titre || '')}</h3><ul class="items">${(d.gauche || []).map(i=>`<li>${md(i)}</li>`).join('')}</ul></div><div class="droite"><h3>${md(d.droite_titre || '')}</h3><ul class="items">${(d.droite || []).map(i=>`<li>${md(i)}</li>`).join('')}</ul></div></div>${num}</div>`;
  }
  if (t === 'citation') return `<div class="citation">« ${md(d.texte || '')} »${d.source ? `<div class="src">— ${h(d.source)}</div>` : ''}${num}</div>`;
  if (t === 'fin') {
    const contacts = (d.contacts || []).map(x => `<span>${h(x)}</span>`).join('');
    return `<div><h1>${md(d.titre || '')}</h1>${d.texte ? `<p class="sous_titre" style="margin-top:14px">${md(d.texte)}</p>` : ''}<div class="contacts">${contacts}</div>${num}</div>`;
  }
  // points (défaut)
  const items = (d.items || []).map(i => `<li>${md(i)}</li>`).join('');
  return `<div><h2>${md(d.titre || '')}</h2>${d.accroche ? `<p class="accroche">${md(d.accroche)}</p>` : ''}<ul class="items">${items}</ul>${d.note ? `<p class="note">${md(d.note)}</p>` : ''}${num}</div>`;
}
