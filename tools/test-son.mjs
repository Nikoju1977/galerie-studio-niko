// Chaîne du son : dépôt, lecture, enchaînement, spatialisation, sauvegarde.
import fs from 'fs';
const html = fs.readFileSync('galerie.html','utf8');
const html2=html;
const js = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
let ko=0;
const dire=(t,ok,det='')=>{ console.log((ok?'  OK    ':'  ECHEC ')+t.padEnd(48)+det); if(!ok) ko++; };

console.log('  DÉPÔT ET LECTURE');
dire('un son se pose sur un socle libre', /findNextFreePedestal/.test(js));
dire('lecture spatialisée', /PositionalAudio/.test(js));
dire('le contexte audio est réveillé au premier geste', /context\.state==='suspended'/.test(js) && /resume\(\)/.test(js));
dire('décodage tolérant aux fichiers illisibles', /decodeAudioData/.test(js) && /catch/.test(js));

console.log('\n  PLAYLIST');
dire('enchaînement automatique à la fin', /onEnded|ended/.test(js));
dire('lecture aléatoire', /shuffle|aleatoire|melange/i.test(js));
dire('répétition', /repeat|repet/i.test(js));
dire('piste précédente et suivante', /mixPrev/.test(js) && /mixNext/.test(js));
dire('volume par piste', /mix-row/.test(html) && /volume/i.test(js));
dire('volume général', /masterVol|volumeGeneral|mixMaster/i.test(js));
dire('superposition ou lecture une à une', /overlap|superpos/i.test(js));
dire('tout couper', /mixStopAll|toutCouper/i.test(js));

console.log('\n  PIÈGES CONNUS');
dire('un son retiré libère son socle', /deleteSound/.test(js));
dire('supprimer une piste ne décale pas la lecture', /if\(oi<playlist\.current\) playlist\.current--/.test(js));
dire('la lecture enchaîne si on supprime la piste courante', /enCours && playlist\.playing/.test(js));
dire('pas de lecture simultanée non voulue', /superpos|overlap/i.test(js));
dire('sons restaurés au lancement', /rec\.type==='audio'/.test(js));
dire('analyse du rythme sans bloquer la lecture', /AudioAnalyser|createAnalyser/.test(js));

console.log('\n  PLAYLISTS EXTERNES');
dire('ajout par lien', /id="mixUrl"/.test(html) && /function ajouterLien/.test(js));
dire('playlists .m3u et .pls dépliées', /\\\.\(m3u8\?\|pls\)/.test(js) && /function lirePlaylist/.test(js));
dire('liens relatifs résolus', /new URL\(l, base\)/.test(js));
dire('radios en flux continu', /setMediaElementSource/.test(js));
dire('un flux sans durée ne bloque pas', /un flux continu n'annonce pas sa durée/.test(js));
dire('flux piloté par son élément audio', /function pistePiloter/.test(js));
dire('liens conservés et rechargés', /type:'audioUrl'/.test(js) && /rec\.type==='audioUrl'/.test(js));
dire('refus du site expliqué', /le site refuse le partage/.test(js));
dire('nombre de pistes plafonné', /liens\.slice\(0,20\)/.test(js));

console.log('\n  MODE VJ ET SON');
dire('le VJ écoute tout le son de la salle', /listener\.getInput\(\)\.connect/.test(js));
dire('le micro ne repart pas dans les haut-parleurs', /le micro n'est jamais renvoyé/.test(js));

console.log('\n'+(ko? '  '+ko+' point(s) à vérifier':'  chaîne du son : complète'));
process.exit(ko?1:0);
