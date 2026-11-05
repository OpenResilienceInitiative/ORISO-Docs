import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderFeatures(data,locale){
 if(!['de','en'].includes(locale))throw new Error('Unsupported locale');
 const de=locale==='de';
 const title=de?'Features der ORISO-Plattform':'Features of the ORISO platform';
 const note=de?'Zusammenfassungen der kanonischen Produktquellen. Diese Quellen beschreiben Entwurf und Verhalten; sie bestätigen keine laufende Bereitstellung.':'Summaries of the canonical product sources. These sources describe design and behaviour; they do not verify a running deployment.';
 const adminPage=de?'Support-Adresse':'Support address';
 const namePage=de?'Benennung und Slogan':'Name and slogan';
 const inactivityPage=de?'Inaktive Konten':'Inactive accounts';
 const addressPage=de?'Ansprache':'Form of address';
 const sameTopicPage=de?'Zwei Beratungen zum gleichen Thema':'Two conversations on the same topic';
 const oneDepartmentPage=de?'Ein Fachbereich pro Beratungsstelle':'One department per counselling centre';
 const recoveryPage=de?'Chat-Wiederherstellung für neue Konten':'Chat recovery for new accounts';
 const tutorialPage=de?'Einführungen für Beratungspersonen':'Counsellor tutorials';
 const postcodePage=de?'Postleitzahl bei weiterer Beratung':'Postcode for further counselling';
 const translationPage=de?'Automatische Übersetzung':'Automatic translation';
 const documentDataPage=de?'Dokumenten-Stammdaten':'Document master data';
 const brandPage=de?'Logo und Favicon':'Logo and favicon';
 const assistantPage=de?'Systemnachrichten-Assistent':'System-message assistant';
 const languagesPage=de?'Verfügbare Sprachen':'Available languages';
 const coloursPage=de?'Farben':'Colours';
 const statisticsPage=de?'Statistik-Einstellungen':'Statistics settings';
 const firstResponsePage=de?'Erste Nachricht an Ratsuchende':'First message to advice seekers';
 const temporaryAccountsPage=de?'Temporäre Gastkonten':'Temporary guest accounts';
 const temporaryMessagesPage=de?'Nachrichten temporärer Konten':'Messages from temporary accounts';
 const editingRightsPage=de?'Bearbeitungsrechte für Stammdaten und Erscheinungsbild':'Editing rights for master data and appearance';
 const providerInfoPage=de?'Trägerinformationen':'Provider information';
 const noticePage=de?'Systemhinweise':'System notices';
 const legalPages=[['management','Verwaltung der Rechtstexte','Legal text management'],['agreement','Auftragsverarbeitungsvereinbarung','Data processing agreement'],['imprint','Impressum','Imprint'],['privacy','Datenschutzhinweis','Privacy notice']];
 const legalCards=legalPages.map(([slug,german,english])=>`<article><h2>${escape(de?german:english)}</h2><p><a href="/features/admin-legal-${slug}.html">${de?'Einstellung ansehen':'View setting'}</a></p></article>`).join('');
 const cards=data.features.map(f=>`<article id="${escape(f.id.split('/').pop())}"><h2>${escape(f[locale].title)}</h2><p>${escape(f[locale].summary)}</p><a href="https://docs.oriso.org/${locale}/${escape(f.route)}">${de?'Vollständige Dokumentation':'Full documentation'}</a><details><summary>${de?'Quellenbeleg':'Source evidence'}</summary><code>${escape(f.source)}</code><p>SHA-256: ${escape(f.sourceHash)}</p><p>${de?'Quellrevision':'Source revision'}: ${escape(f.sourceRevision)}</p></details></article>`).join('\n');
 const adminLists=[
  ['counselling-centres','Beratungsstellen','Counselling centres'],['providers','Träger','Providers'],['users','Nutzerverwaltung','User management'],['topics','Themen','Topics'],['invitations','Einladungen','Invitations'],['email-templates','E-Mail-Vorlagen','Email templates'],['csv-preview','CSV-Vorschau für Einladungen','CSV invitation preview'],['tutorial-statistics','Tutorial-Statistik','Tutorial statistics'],['case-handovers','Fallübergaben','Case handovers'],['deletion-audit','Löschprotokoll','Deletion audit'],['inactivity-audit','Inaktivitätsprotokoll','Inactivity audit'],['supervision-log','Supervisionsprotokoll','Supervision log']
 ];
 const listCards=adminLists.map(([slug,german,english])=>`<article><h2>${escape(de?german:english)}</h2><p><a href="/features/admin-list-${slug}.html">${de?'Liste ansehen':'View list'}</a></p></article>`).join('');
 return `<!doctype html><html lang="${locale}" data-lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — ORISO Understand</title><meta name="description" content="${escape(note)}"><link rel="stylesheet" href="/assets/hub.css"></head><body><main class="wrap"><a href="/">ORISO Understand</a><nav><a href="/features/de.html" data-feature-locale="de">DE</a> · <a href="/features/en.html" data-feature-locale="en">EN</a></nav><h1>${title}</h1><p>${note}</p>${cards}${listCards}<article><h2>${adminPage}</h2><p><a href="/features/admin-support-email.html">${de?'Einstellung ansehen':'View setting'}</a></p></article><article><h2>${namePage}</h2><p><a href="/features/admin-name-slogan.html">${de?'Einstellung ansehen':'View setting'}</a></p></article><article><h2>${inactivityPage}</h2><p><a href="/features/admin-account-inactivity.html">${de?'Einstellung ansehen':'View setting'}</a></p></article><article><h2>${addressPage}</h2><p><a href="/features/admin-form-of-address.html">${de?'Einstellung ansehen':'View setting'}</a></p></article><article><h2>${sameTopicPage}</h2><p><a href="/features/admin-same-topic.html">${de?'Einstellung ansehen':'View setting'}</a></p></article><article><h2>${oneDepartmentPage}</h2><p><a href="/features/admin-one-department.html">${de?'Einstellung ansehen':'View setting'}</a></p></article><article><h2>${recoveryPage}</h2><p><a href="/features/admin-chat-recovery.html">${de?'Einstellung ansehen':'View setting'}</a></p></article><article><h2>${tutorialPage}</h2><p><a href="/features/admin-counsellor-tutorials.html">${de?'Einstellung ansehen':'View setting'}</a></p></article><article><h2>${postcodePage}</h2><p><a href="/features/admin-further-postcode.html">${de?'Einstellung ansehen':'View setting'}</a></p></article><article><h2>${translationPage}</h2><p><a href="/features/admin-translation-keys.html">${de?'Einstellung ansehen':'View setting'}</a></p></article><article><h2>${documentDataPage}</h2><p><a href="/features/admin-document-master-data.html">${de?'Einstellung ansehen':'View setting'}</a></p></article><article><h2>${brandPage}</h2><p><a href="/features/admin-brand-images.html">${de?'Einstellung ansehen':'View setting'}</a></p></article><article><h2>${assistantPage}</h2><p><a href="/features/admin-assistant-identity.html">${de?'Einstellung ansehen':'View setting'}</a></p></article><article><h2>${languagesPage}</h2><p><a href="/features/admin-available-languages.html">${de?'Einstellung ansehen':'View setting'}</a></p></article><article><h2>${coloursPage}</h2><p><a href="/features/admin-theme-colours.html">${de?'Einstellung ansehen':'View setting'}</a></p></article><article><h2>${statisticsPage}</h2><p><a href="/features/admin-statistics-settings.html">${de?'Einstellung ansehen':'View setting'}</a></p></article><article><h2>${firstResponsePage}</h2><p><a href="/features/admin-first-response.html">${de?'Einstellung ansehen':'View setting'}</a></p></article><article><h2>${temporaryAccountsPage}</h2><p><a href="/features/admin-temporary-accounts.html">${de?'Einstellung ansehen':'View setting'}</a></p></article><article><h2>${temporaryMessagesPage}</h2><p><a href="/features/admin-temporary-messages.html">${de?'Einstellung ansehen':'View setting'}</a></p></article><article><h2>${editingRightsPage}</h2><p><a href="/features/admin-appearance-editing-rights.html">${de?'Einstellung ansehen':'View setting'}</a></p></article><article><h2>${providerInfoPage}</h2><p><a href="/features/admin-provider-information.html">${de?'Einstellung ansehen':'View setting'}</a></p></article><article><h2>${noticePage}</h2><p><a href="/features/admin-service-notices.html">${de?'Einstellung ansehen':'View setting'}</a></p></article>${legalCards}<p><a href="https://docs.oriso.org/${locale}/">${de?'Dokumentation':'Documentation'}</a></p></main><script>document.querySelectorAll('[data-feature-locale]').forEach(a=>a.href+=location.hash)</script></body></html>\n`;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const data=JSON.parse(readFileSync(new URL('./features/catalog.json',import.meta.url)));
 for(const locale of ['de','en'])writeFileSync(new URL(`./features/${locale}.html`,import.meta.url),renderFeatures(data,locale));
 writeFileSync(new URL('./features/index.html',import.meta.url),renderFeatures(data,'de'));
}
