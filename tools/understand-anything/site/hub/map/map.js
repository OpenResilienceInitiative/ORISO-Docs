/* Fähigkeiten-Karte (Understand-Hub). Rendert aus den JSON-Dateien in data/. */

function startMap(MEAS){
'use strict';
MapViews.setCriteria(MEAS.criteria || null); /* Gesundheitskriterien (criteria.json, optional): Kriterienbox der Ansicht Health */
MapViews.setSteering(MEAS.steering || null); /* Steuerung (steering.json, optional): Kommentare von Mitgliedern in der Ansicht Health */

/* ───────── Verweise ───────── */
var UA = {
 fe:{u:'https://understand.oriso.org/frontend/?token=oriso-frontend-dashboard',n:'Frontend'},
 ad:{u:'https://understand.oriso.org/admin-service/?token=oriso-admin-dashboard',n:'Admin'},
 us:{u:'https://understand.oriso.org/user-service/?token=oriso-userservice-dashboard',n:'UserService'},
 as:{u:'https://understand.oriso.org/agency-service/?token=oriso-agency-dashboard',n:'AgencyService'},
 ts:{u:'https://understand.oriso.org/tenant-service/?token=oriso-tenant-dashboard',n:'TenantService'},
 ct:{u:'https://understand.oriso.org/consulting-type-service/?token=oriso-consulting-type-dashboard',n:'ConsultingTypeService'},
 kc:{u:'https://understand.oriso.org/keycloak/?token=oriso-keycloak-dashboard',n:'Keycloak'},
 ec:{u:'https://understand.oriso.org/element-call/?token=oriso-elementcall-dashboard',n:'ElementCall'},
 sg:{u:'https://understand.oriso.org/supergraph/?token=oriso-supergraph-dashboard',n:'Supergraph'}
};
var REPOID = {fe:'ORISO-Frontend',ad:'ORISO-Admin',us:'ORISO-UserService',as:'ORISO-AgencyService',ts:'ORISO-TenantService',ct:'ORISO-ConsultingTypeService',kc:'ORISO-Keycloak',ec:'ORISO-ElementCall'};
var ADRT = {
 1:['Beratungsformen als Module','Counselling modalities as modules'],
 2:['Stille Raummitgliedschaft und Zugriffsschutz','Silent room membership and access control'],
 3:['Fachbereich = Stelle × Thema, mit Impressum und Datenschutz','Department = centre × topic, with imprint and privacy'],
 4:['Eigene Chat-Oberfläche auf dem Matrix-SDK','Own chat UI on the Matrix SDK'],
 5:['Matrix ohne Föderation','Matrix without federation'],
 6:['Gesprächsart als gespeicherte Eigenschaft','Conversation type as a stored property'],
 7:['Live-Chat: Verfügbarkeit und Erreichbarkeit','Live chat: availability and liveness'],
 8:['Supervisor-Rolle und vertraulicher Nebenkanal','Supervisor role and confidential side channel'],
 9:['Globale Themen und KI-gestützte Übersetzung','Global topics and AI-assisted translation'],
 10:['Erscheinungsbild je Träger nach Freigabeliste','Per-provider appearance via allowlist'],
 11:['Nur Helm, eine Domain mit Pfaden','Helm only, one domain with paths'],
 12:['Selbsthilfegruppen: Gruppenchat erweitern','Self-help groups: extend the group chat'],
 13:['Zwei-Faktor über die OTP-Erweiterung','Two-factor via the OTP extension'],
 14:['Gemeinsame Rechtstexte, Thema vor Einwilligung','Shared legal texts, topic before consent'],
 15:['Medien-Schalter je Chat-Art','Media switches per chat type'],
 16:['Team-Besprechung als Nebenraum','Team discussion as a side room'],
 17:['Native Matrix-Threads','Native Matrix threads'],
 18:['Erstantwort als ein gespeichertes Ereignis','First response as one stored event'],
 19:['Medienprüfung, im Zweifel gesperrt','Media scanning, blocked when in doubt'],
 20:['Geplante Anrufe, sichere Einladungen, Kalender','Scheduled calls, secure invitations, calendar'],
 21:['Rechtstexte: Hierarchie, Versionen, Einwilligungstext','Legal texts: hierarchy, versions, consent text'],
 22:['Einwilligung und erneute Einwilligung im Gespräch','Consent and re-consent in conversations'],
 23:['Plattformvertrag und Steuerung durch Träger','Platform agreement and provider governance'],
 24:['Benachrichtigungen: zwei Listen statt einer','Notifications: two lists, not one'],
 25:['Design-System ersetzt den Mail-Dienst','Design system replaces the mail service'],
 26:['Erscheinungsbild der Träger in E-Mails','Provider branding in e-mails']
};
var ADR_LIVE = 23; /* ADR-001 bis ADR-023 sind auf docs.oriso.org veröffentlicht */
var DOCS = 'https://docs.oriso.org/';

var AUD = {
 app:{de:'Beratungs-App: Ratsuchende und Beratende',en:'Counselling app: help-seekers and counsellors',s:{de:'Beratungs-App',en:'Counselling app'}},
 adm:{de:'Verwaltung: Träger und Beratungsstellen',en:'Administration: providers and centres',s:{de:'Verwaltung',en:'Administration'}},
 ops:{de:'Sicherheit, Betrieb und Grundlagen',en:'Security, operations and foundations',s:{de:'Sicherheit und Grundlagen',en:'Security and foundations'}}
};

/* Bausteine aus der Leistungsübersicht (build.py): [Status, Angebot, DE, EN, Gewicht=Tests]
   Status: b = beauftragt und steht, o = beauftragt, offen, x = zusätzlich geliefert, v = vorher vorhanden */
var B = [
 {id:'chat',aud:'app',t:{de:'Chat und Gesprächsliste',en:'Chat and conversation list'},
  short:{de:'Matrix statt Rocket.Chat, eigene Chat-Oberfläche, Threads, Suche',en:'Matrix instead of Rocket.Chat, own chat UI, threads, search'},
  can:{de:['verschlüsselt schreiben und auf einzelne Nachrichten antworten (Threads)','Nachrichten bearbeiten, reagieren und Personen mit @ erwähnen','die Gesprächsliste filtern, sortieren und durchsuchen','sehen, wenn eine Nachricht nicht zugestellt werden konnte'],
       en:['write encrypted messages and reply to single messages (threads)','edit messages, react and @-mention people','filter, sort and search the conversation list','see when a message could not be delivered']},
  before:{de:'Chat über Rocket.Chat, Zustellhäkchen, Sitzungsliste',en:'Chat via Rocket.Chat, delivery ticks, session list'},
  items:[['b','CAR-07','Matrix statt Rocket.Chat mit eigener Chat-Oberfläche','Matrix instead of Rocket.Chat with its own chat UI',3094],
         ['x','—','Threads, Bearbeiten, Reaktionen, @-Erwähnungen','Threads, editing, reactions, @-mentions',60],
         ['x','—','Anzeigefilter und Suche in der Gesprächsliste','Display filters and conversation list search',60],
         ['x','—','Steckbrief der Beratungsstelle für Ratsuchende','Counselling centre profile for help-seekers',60]],
  adr:[4,5,6,17], docs:[['produkt/core-features/session-management','Gespräche verwalten','Session management']],
  ua:[['fe','concept:matrix-realtime','Matrix-only Real-time Communication'],['us','concept:matrix-messaging','Matrix-only Messaging'],['us','concept:session-lifecycle','Consultation Session Lifecycle']]},
 {id:'notify',aud:'app',t:{de:'Benachrichtigungen und E-Mails',en:'Notifications and e-mails'},
  short:{de:'24 E-Mail-Anlässe in 7 Sprach- und Anredevarianten, Zeitleiste, 12 Töne, Nicht-stören-Zeiten',en:'24 e-mail occasions in 7 language and address variants, timeline, 12 sounds, do-not-disturb'},
  can:{de:['alle Ereignisse an einem Ort sehen und filtern (Aktivitäts-Zeitleiste)','Nicht-stören-Zeiten setzen und je Ereignisart einen von zwölf Tönen wählen oder stumm schalten','E-Mail-Benachrichtigungen je Gesprächsart einstellen, getrennt für Ratsuchende und Beratende','E-Mails in der eigenen Sprache und Anrede bekommen'],
       en:['see and filter all events in one place (activity timeline)','set do-not-disturb times and pick one of twelve sounds per event type, or mute it','configure e-mail notifications per conversation type, separately for help-seekers and counsellors','receive e-mails in their own language and form of address']},
  before:{de:'E-Mails über einen externen Mail-Dienst, Live-Ereignisse, mobile Push-Nachrichten, einfache Schalter',en:'E-mails via an external mail service, live events, mobile push, simple switches'},
  items:[['x','—','Aktivitäts-Zeitleiste, Benachrichtigungen und Töne','Activity timeline, notifications and sounds',400],
         ['x','CAR-07','E-Mail-Benachrichtigungen je Gesprächsart, getrennt für Ratsuchende und Beratende','E-mail notifications per conversation type, separate for help-seekers and counsellors',127],
         ['v','—','Einfache Benachrichtigungs-Schalter','Simple notification switches',0]],
  adr:[24,25], docs:[['produkt/core-features/notifications','Benachrichtigungen','Notifications']],
  ua:[['fe','concept:activity-timeline-notifications','Notifications Center / Activity Timeline'],['us','concept:notification-center','Event Notification Center'],['fe','concept:email-design-system','Transactional E-Mail Design System']]},
 {id:'handover',aud:'app',t:{de:'Fallübergabe',en:'Case handover'},
  short:{de:'Fälle mit Grund abgeben oder holen, mit Zustimmung der Ratsuchenden',en:'Hand over or take cases with a reason, with the help-seeker’s consent'},
  can:{de:['einen Fall mit Grund abgeben oder holen, zur Einsicht oder als Übernahme','die Zustimmung der Ratsuchenden einholen, zurückgeben oder mehrere Fälle auf einmal übergeben','einen Fall holen, wenn die bisherige Beratende nicht erreichbar ist','sicher sein, dass nur Beratende derselben Stelle mitlesen können'],
       en:['hand over or take a case with a reason, as a view or a full takeover','ask for the help-seeker’s consent, return a case or hand over several at once','fetch a case when the previous counsellor cannot be reached','be sure only counsellors of the same centre can read along']},
  before:{de:'einfaches Zuweisen an andere Beratende; offene Team-Beratungsstelle, in der alle alle Fälle sahen',en:'simple reassignment to other counsellors; open team centre where everyone saw every case'},
  items:[['x','CAR-03','Fallübergabe (ersetzt die offene Team-Beratungsstelle)','Case handover (replaces the open team centre)',651],['v','—','Einfaches Zuweisen an andere Beratende','Simple reassignment to other counsellors',0]],
  adr:[2], docs:[['produkt/core-features/handover','Übergabe','Handover']], feat:'https://understand.oriso.org/features/case-handover.html',
  ua:[['fe','concept:case-handover','Case Handover'],['us','concept:case-handover','Case Handover'],['us','flow:case-handover','Case Handover Flow']]},
 {id:'teamdisc',aud:'app',t:{de:'Team-Besprechung',en:'Team discussion'},
  short:{de:'Interner Raum zu jeder offenen Anfrage, Ratsuchende sind nie Mitglied',en:'Internal room for every open request; help-seekers are never members'},
  can:{de:['sich im Team zu einer neuen Anfrage abstimmen, ohne den Chat mit der ratsuchenden Person zu belasten','sicher sein, dass der Raum mit der Annahme geschlossen und nach 90 Tagen gelöscht wird'],
       en:['coordinate within the team on a new request without cluttering the help-seeker’s chat','rely on the room closing at acceptance and being deleted after 90 days']},
  before:{de:'offene Team-Beratungsstelle',en:'open team counselling centre'},
  items:[['x','—','Team-Besprechung neben der Anfrage','Team discussion next to the request',103]],
  adr:[16], docs:[],
  ua:[['us','concept:group-chats','Group Chats & Team Discussions']]},
 {id:'supervision',aud:'app',t:{de:'Supervision',en:'Supervision'},
  short:{de:'Eigener Supervisionsraum, Nur-Lese-Zugriff, Supervisor-Rolle',en:'Own supervision room, read-only access, supervisor role'},
  can:{de:['eine Supervisorin zu einem Fall hinzuziehen, die nur liest','im eigenen Supervisions-Chat oder per Sprache neben dem Fall Rückmeldung geben','als Ratsuchende der Supervision widersprechen'],
       en:['bring in a supervisor who can only read a case','give feedback in a separate supervision chat or by voice next to the case','as a help-seeker, opt out of supervision']},
  before:{de:'kein Gegenstück (dort gab es den U25-Feedback-Chat)',en:'no counterpart (the old code had the U25 feedback chat)'},
  items:[['b','CAR-01','Supervisionsraum, Nur-Lese-Zugriff, Supervisor-Rolle','Supervision room, read-only access, supervisor role',238],
         ['o','CAR-01','Unscharf schalten / Ausblenden (Umfang mit Caritas zu klären)','Blur / hide messages (scope to be clarified)',0],
         ['x','CAR-01','Opt-out der Ratsuchenden','Opt-out for help-seekers',80],['x','CAR-01','Fest zuweisbare Supervisoren','Assignable supervisors',80],
         ['x','CAR-01','Sprach-Feedback neben dem Fall','Voice feedback next to the case',80],['x','CAR-01','Filter für Supervisoren','Filter for supervisors',80]],
  adr:[8], docs:[], ua:[]},
 {id:'groups',aud:'app',t:{de:'Gruppen, Selbsthilfe und Termine',en:'Groups, self-help and appointments'},
  short:{de:'Selbsthilfegruppen mit Zulassung, Wartebereich, Teilgruppen, wiederkehrende Termine',en:'Self-help groups with admission, waiting area, sub-groups, recurring appointments'},
  can:{de:['eine Gruppe nur nach Zulassung durch die Leitung betreten, mit Wartebereich und Gruppenregeln','über einen Gruppenlink ohne eigenes Konto beitreten (Zugang wird nach 24 Stunden gelöscht)','die Gruppenleitung übergeben und Teilgruppen nur für Mitglieder bilden','wiederkehrende Gruppentermine mit Erinnerungs-Mails planen'],
       en:['enter a group only after the lead admits them, with a waiting area and group rules','join via a group link without an account (access deleted after 24 hours)','hand over group leadership and create member-only sub-groups','plan recurring group appointments with reminder mails']},
  before:{de:'Gruppenchat anlegen, starten, beenden und beitreten; Einzeltermine und Kalenderdatei',en:'create, start, end and join a group chat; single appointments and calendar file'},
  items:[['b','CAR-REFACT','Gruppenchat für weitere Nutzergruppen, auch unter Beratenden','Group chat for further user groups, also among counsellors',782],
         ['x','CAR-REFACT','Selbsthilfegruppen mit Zulassung, Wartebereich, Teilgruppen','Self-help groups with admission, waiting area, sub-groups',380],
         ['x','CAR-REFACT','Gruppentermine und Kalender (angefragt, nicht bepreist)','Group appointments and calendar (requested, not priced)',507]],
  adr:[12,20], docs:[['produkt/core-features/group-chats','Gruppenchats','Group chats']],
  ua:[['us','concept:group-chats','Group Chats & Team Discussions'],['us','concept:appointments-remnant','Appointments']]},
 {id:'calls',aud:'app',t:{de:'Anrufe, Video und Sprachnachrichten',en:'Calls, video and voice messages'},
  short:{de:'Selbst betriebenes Video, Geräte-Check vor dem Anruf, Anrufstatus, Sprachnachrichten',en:'Self-hosted video, device check before the call, call status, voice messages'},
  can:{de:['per Video oder nur mit Ton sprechen, auch in der Gruppe','vor dem Anruf Mikrofon, Lautsprecher und Kamera prüfen','im Verlauf sehen, ob ein Anruf läuft, verpasst oder beendet ist','eine Sprachnachricht schicken, wenn Schreiben schwerfällt'],
       en:['talk by video or audio only, also in groups','check microphone, speaker and camera before the call','see in the history whether a call is running, missed or ended','send a voice message when writing is hard']},
  before:{de:'Video über Jitsi mit Wartezimmer; Anrufe ohne Kamera',en:'Video via Jitsi with a waiting room; calls without camera'},
  items:[['b','CAR-06','Video über LiveKit, Gruppenanrufe, eigener Video-Container','Video via LiveKit, group calls, own video container',501],
         ['o','CAR-06','Anbindung externer Anbieter (Zoom, Teams, Jitsi)','External providers (Zoom, Teams, Jitsi)',0],
         ['x','CAR-06','Vorraum, Anrufstatus und Sprachnachrichten','Lobby, call status and voice messages',150],
         ['v','—','Anrufe ohne Kamera','Calls without camera',0]],
  plan:[['Video ohne Anmeldung (Einmal-Link)','Video without login (one-time link)']],
  adr:[20], docs:[],
  ua:[['fe','concept:calls-element-call','Calls: Element Call Widget and LiveKit'],['us','concept:matrixrtc-call-policy','MatrixRTC Call Policy'],['ec','','ElementCall']]},
 {id:'livechat',aud:'app',t:{de:'Anonymer Live-Chat und Erstantwort',en:'Anonymous live chat and first response'},
  short:{de:'Warteschlange mit Position, Warteraum, Pseudonym mit Tier-Avatar, mehrsprachige Erstantwort',en:'Queue with position, waiting room, pseudonym with animal avatar, multilingual first reply'},
  can:{de:['ohne Konto anonym einen Chat beginnen und die eigene Position in der Warteschlange sehen','im Warteraum eine Atemübung machen und lesen, wie der Chat abläuft','ein Pseudonym mit Tier-Avatar sehen und bestätigen','sofort eine Erstantwort in der eigenen Sprache bekommen'],
       en:['start an anonymous chat without an account and see their place in the queue','do a breathing exercise in the waiting room and read how the chat works','see and confirm a pseudonym with an animal avatar','get an immediate first reply in their own language']},
  before:{de:'Live-Chat mit Verfügbarkeit, automatisch erzeugte Namen, Einwilligung im Warteraum',en:'Live chat with availability, generated names, consent in the waiting room'},
  items:[['b','CAR-02','Live-Chat mit Warteschlange und Positionsanzeige','Live chat with queue and position display',444],
         ['o','CAR-02','Umwandlung in ein Konto (ungeklärt)','Conversion into an account (to be clarified)',0],
         ['o','CAR-02','Löschfrist anonymer Chats (3 oder 47 Stunden, abzustimmen)','Retention for anonymous chats (3 or 47 hours, to agree)',0],
         ['x','CAR-02','Warteschlange exakt über mehrere Server','Exact queue across several servers',111],
         ['x','CAR-02','Interaktive Elemente im Warteraum','Interactive elements in the waiting room',80],
         ['x','CAR-02','Live-Chat für alle Themengebiete','Live chat for all topic areas',80],
         ['x','CAR-02','Pseudonym mit Tier-Avatar','Pseudonym with animal avatar',151],
         ['x','CAR-07','Mehrsprachige automatische Erstantwort','Multilingual automatic first reply',151]],
  plan:[['Bot-Schutz am anonymen Eingang','Bot protection at the anonymous entrance']],
  adr:[7,18], docs:[['produkt/core-features/live-chat','Live-Chat','Live chat']],
  ua:[['fe','concept:erstantwort-anonymous-chat','Erstantwort and Anonymous (Carimat) Chat'],['us','concept:availability-and-live-events','Live Availability & Presence'],['us','concept:erstantwort','Erstantwort (First Response)']]},
 {id:'upload',aud:'app',t:{de:'Dateien und Medien',en:'Files and media'},
  short:{de:'Uploads verschlüsselt über Matrix, Upload-Schalter je Chat-Art',en:'Encrypted uploads via Matrix, upload switch per chat type'},
  can:{de:['Dateien und Bilder verschlüsselt im Chat teilen','als Träger festlegen, in welcher Chat-Art Uploads erlaubt sind'],
       en:['share files and images encrypted in the chat','as a provider, decide in which chat type uploads are allowed']},
  before:{de:'getrennter Upload-Dienst',en:'separate upload service'},
  items:[['b','CAR-07','Upload über Matrix','Upload via Matrix',80],['x','CAR-07','Upload-Schalter je Chat-Art','Upload switch per chat type',80]],
  plan:[['Virenscanner für alle Uploads','Virus scanner for all uploads']],
  adr:[15,19], docs:[], ua:[['fe','concept:media-attachments','Media Upload and Attachments'],['us','concept:media-upload','Session Media Upload & Download Proxy']]},
 {id:'practice',aud:'app',t:{de:'Einarbeitung: Touren und Übungsbereich',en:'Onboarding: tours and practice area'},
  short:{de:'Vier Touren und ein Übungsbereich mit Übungsfällen',en:'Four tours and a practice area with practice cases'},
  can:{de:['sich mit einem Rundgang und einer Tour zur Mail-Beratung zurechtfinden','„Anfrage annehmen“ und „Supervision hinzuziehen“ Schritt für Schritt üben','alle Funktionen an Übungsfällen ausprobieren, ohne echte Ratsuchende'],
       en:['find their way with an overview tour and an e-mail counselling tour','practise “accept a request” and “bring in supervision” step by step','try every function on practice cases, without real help-seekers']},
  before:{de:'ein einfacher Rundgang',en:'a simple walkthrough'},
  items:[['b','CAR-14','Vier Touren in der Beratungsoberfläche','Four tours in the counselling interface',327],['o','CAR-14','Tour für die Verwaltung','Tour for the administration',0],['x','CAR-14','Übungsbereich','Practice area',262]],
  adr:[], docs:[['produkt/flows-und-internals/user-flows','Nutzerabläufe','User flows']], ua:[['fe','','Frontend']]},
 {id:'i18n',aud:'app',t:{de:'Mehrsprachigkeit',en:'Multiple languages'},
  short:{de:'App in sechs Sprachen und Du-Form, Verwaltung auf Deutsch und Englisch, KI-Übersetzung',en:'App in six languages plus informal German, administration in German and English, AI translation'},
  can:{de:['die App auf Deutsch, Englisch, Französisch, Russisch, Türkisch oder Tigrinya nutzen','die Verwaltung auf Deutsch oder Englisch bedienen','Rechtstexte vor dem Veröffentlichen per KI übersetzen lassen'],
       en:['use the app in German, English, French, Russian, Turkish or Tigrinya','use the administration in German or English','have legal texts translated with AI before publishing']},
  before:{de:'App auf Deutsch (auch in Du-Form) und Englisch, Verwaltung nur auf Deutsch',en:'App in German (including informal form) and English, administration only in German'},
  items:[['x','CAR-08','Mehrsprachigkeit (rund 4.100 Textbausteine je Sprache)','Multiple languages (about 4,100 strings per language)',220],['v','—','Deutsch in Du-Form','Informal German',0]],
  adr:[9], docs:[], ua:[['ts','concept:templates-and-translations','Templates & Legal Content Translations'],['ts','flow:legal-text-machine-translation','Legal Text Machine Translation']]},
 {id:'legal',aud:'adm',t:{de:'Rechtstexte und Vertragsunterlagen',en:'Legal texts and contract documents'},
  short:{de:'Vorlagen, Vererbung, Versionen; Vertragsunterlagen mit Weiterleitung und erneuter Bestätigung',en:'Templates, inheritance, versions; contract documents with forwarding and re-confirmation'},
  can:{de:['Impressum, Datenschutz und Einwilligung aus Vorlagen übernehmen; oft reicht der Name der Datenschutzbeauftragten','jede Fassung vergleichen, versionieren und Ratsuchende bei Änderungen im Chat informieren','die Vertragsunterlagen an die zeichnungsberechtigte Person weiterleiten und den Stand sehen','neue Fassungen mit Übergangsfrist bestätigen lassen, ohne laufende Beratungen zu unterbrechen'],
       en:['adopt imprint, privacy and consent texts from templates; often the data protection officer’s name is enough','compare and version every edition and notify help-seekers in the chat about changes','forward the contract documents to the authorised signatory and see the status','have new editions confirmed with a transition period without interrupting ongoing counselling']},
  before:{de:'Textfelder je Mandant für Impressum, Datenschutz und Nutzungsbedingungen; keine Versionen, keine Vertragsunterlagen',en:'Text fields per tenant for imprint, privacy and terms; no versions, no contract documents'},
  items:[['b','CAR-13','Ablauf der Vertragsunterlagen','Contract documents workflow',662],
         ['x','CAR-13','Rechtstexte: Vorlagen, Vererbung, Versionen','Legal texts: templates, inheritance, versions',1300],
         ['x','CAR-13','Vertragsunterlagen: Weiterleitung und erneute Bestätigung','Contract documents: forwarding and re-confirmation',320]],
  adr:[3,14,21,22,23], docs:[],
  ua:[['ad','concept:admin-legal-dpa-module','Legal Texts and DPA Module'],['ts','concept:dpa-legal-module','DPA Signature & Status Module'],['as','concept:department-legal-texts','Department Legal Texts'],['fe','concept:legal-dpa-consent','Legal, DPA and Consent Surfaces']]},
 {id:'permissions',aud:'adm',t:{de:'Funktionsfreigaben',en:'Feature permissions'},
  short:{de:'55 Schalter auf drei Ebenen, je Chat-Art, serverseitig durchgesetzt',en:'55 switches on three levels, per chat type, enforced on the server'},
  can:{de:['als Plattform, Träger oder Beratungsstelle festlegen, welche Funktion in welcher Chat-Art erlaubt ist','Vorgaben nach unten vererben und sperren','Anpassungen selbst einstellen, ohne Programmierung und ohne andere Träger zu berühren'],
       en:['as platform, provider or centre, decide which function is allowed in which chat type','inherit settings downwards and lock them','make adjustments yourself, without programming and without affecting other providers']},
  before:{de:'einzelne Einstellungen je Beratungsart',en:'individual settings per counselling type'},
  items:[['x','CAR-13','Funktionsfreigaben je Ebene und Chat-Art (CAR-07: feste Voreinstellungen beauftragt)','Feature permissions per level and chat type (CAR-07 commissioned fixed defaults)',375]],
  plan:[['Support-Admin nur lesen','Read-only support admin'],['Support-Sitzung mit Doppel-Freigabe','Support session with double approval']],
  adr:[1,15], docs:[['produkt/architecture-und-roles/roles-permissions','Rollen und Rechte','Roles and permissions']],
  ua:[['ad','concept:admin-permissions-model','Permissions Settings and Role Model'],['ts','concept:permission-controls','Platform Permission Controls'],['as','concept:effective-permission-settings','Effective Permission Settings']]},
 {id:'mailadmin',aud:'adm',t:{de:'E-Mail-Vorlagen und Mailserver',en:'E-mail templates and mail server'},
  short:{de:'Versand über den eigenen Mailserver des Trägers, Vorlagen mit Vorschau',en:'Sending through the provider’s own mail server, templates with preview'},
  can:{de:['E-Mails über den eigenen Mailserver versenden, mit Testversand','Einladungs-Mails in eigenen Worten schreiben, mit Platzhaltern und Vorschau','alle Mails im eigenen Erscheinungsbild mit eigenem Impressum verschicken'],
       en:['send e-mails through their own mail server, with a test send','write invitation mails in their own words, with placeholders and preview','send every mail in their own look with their own imprint']},
  before:{de:'Mails über einen zentralen externen Dienst, keine eigenen Vorlagen',en:'Mails via a central external service, no own templates'},
  items:[['x','CAR-13','E-Mails im Namen des Trägers','E-mails in the provider’s name',370],['x','CAR-13','E-Mail-Vorlagen','E-mail templates',147]],
  adr:[25,26], docs:[], ua:[['ct','concept:application-settings','Application Settings & Global SMTP'],['fe','concept:email-design-system','Transactional E-Mail Design System']]},
 {id:'invites',aud:'adm',t:{de:'Einladungen und Einrichtung',en:'Invitations and setup'},
  short:{de:'Einladungen mit Fortschrittsanzeige, Träger-Assistent, Sammeleinladungen',en:'Invitations with progress tracking, provider wizard, bulk invitations'},
  can:{de:['sehen, wo jede Einladung steht, und warum sie hängt','als Träger mit einem Assistenten Konto, Zwei-Faktor und Vertragsunterlagen einrichten','mehrere Beratungsstellen samt Leitung und Beratenden auf einmal oder per Tabelle einladen','als Beratende beim Einrichten Themen wählen oder eine neue Beratungsstelle anlegen'],
       en:['see where each invitation stands and why it is stuck','as a provider, set up account, two-factor and contract documents with a wizard','invite several centres with heads and counsellors at once or via a spreadsheet','as a counsellor, choose topics or create a new centre during setup']},
  before:{de:'Agentur- und Beraterlink, QR-Code; keine Einladungen',en:'Agency and counsellor link, QR code; no invitations'},
  items:[['b','CAR-14','Träger-Assistent (Konto, 2FA, Vertragsunterlagen)','Provider wizard (account, 2FA, contract documents)',183],
         ['b','CAR-13','QR- und Direktlinks','QR and direct links',80],
         ['x','CAR-13','Einladungen mit Fortschrittsanzeige','Invitations with progress tracking',199],
         ['x','CAR-14','Einrichtung für Beratende und Leitungen','Setup for counsellors and heads',210]],
  adr:[23], docs:[], ua:[['ad','concept:admin-invite-links','Links and Invite Composer'],['ad','concept:admin-tenant-onboarding-wizard','Tenant-Admin Onboarding Wizard'],['us','concept:invite-links','Invite Links, Account Invites & Provisioning']]},
 {id:'branding',aud:'adm',t:{de:'Erscheinungsbild',en:'Look and feel'},
  short:{de:'Farben, Logo und Anmeldeseite je Träger, mit Vorschau und Warnung bei zu blassen Farben',en:'Colours, logo and login page per provider, with preview and a warning for pale colours'},
  can:{de:['eigene Farben einstellen und vorher und nachher in einer App-Vorschau sehen','gewarnt werden, wenn eine Farbe zu blass ist oder mit der Fehlerfarbe verwechselt werden kann','Logo, Verbandslogo und einen Effekt auf der Anmeldeseite wählen'],
       en:['set their own colours and see before and after in an app preview','get a warning when a colour is too pale or could be confused with the error colour','choose logo, association logo and a login page effect']},
  before:{de:'Logo, Verbandslogo, Favicon, Primär- und Sekundärfarbe',en:'Logo, association logo, favicon, primary and secondary colour'},
  items:[['x','CAR-13','Eigenes Erscheinungsbild je Träger','Own look per provider',260],['v','—','Logo und Grundfarben','Logo and base colours',0]],
  plan:[['Design-Tokens','Design tokens'],['Hoher Kontrast','High contrast']],
  adr:[10,26], docs:[], ua:[['ts','concept:theming-and-branding-safety','Theming & Branding Asset Safety']]},
 {id:'stats',aud:'adm',t:{de:'Statistik und Protokolle',en:'Statistics and logs'},
  short:{de:'Statistik in drei Ebenen mit Schutz kleiner Zahlen, Protokolle',en:'Statistics on three levels that protect small numbers, logs'},
  can:{de:['Zahlen für Plattform, Träger und Beratungsstelle sehen','sicher sein, dass Werte erst ab fünf Beratenden erscheinen','Übergaben, Supervision und Inaktivität im Protokoll nachvollziehen'],
       en:['see figures for platform, provider and centre','rely on figures appearing only from five counsellors upwards','trace handovers, supervision and inactivity in the logs']},
  before:{de:'Statistik-Ereignisse an einen externen Dienst, CSV-Download',en:'Statistics events to an external service, CSV download'},
  items:[['b','CAR-13','Statistik in drei Ebenen','Statistics on three levels',129],['x','CAR-13','Statistik mit Schutz kleiner Zahlen','Statistics protecting small numbers',80],['x','—','Protokolle, Statusseite, IP-Anonymizer','Logs, status page, IP anonymiser',60]],
  adr:[], docs:[], ua:[['ad','concept:admin-statistics-dashboard','Statistics Dashboard'],['us','concept:statistics-and-audit','Statistics & Audit Logs']]},
 {id:'tenants',aud:'adm',t:{de:'Träger, Stellen, Themen und Konten',en:'Providers, centres, topics and accounts'},
  short:{de:'Mandantentrennung mit eigenen Tests, Verwaltung aller Ebenen, Rollen- und Stellenwechsel',en:'Tenant separation with its own tests, administration on all levels, role and centre changes'},
  can:{de:['Träger, Beratungsstellen, Fachbereiche und Themen anlegen und pflegen','Admins und Beratende verwalten, Rollen je Träger vergeben','als Leitung selbst mitberaten und Beratende zwischen Stellen wechseln lassen; Zugänge zu verschlüsselten Räumen folgen automatisch'],
       en:['create and maintain providers, centres, departments and topics','manage admins and counsellors and assign roles per provider','as a head, also counsel and move counsellors between centres; access to encrypted rooms follows automatically']},
  before:{de:'Mandanten, Agenturen, Beratungsarten, Themen, Beratende und Admins verwalten',en:'Manage tenants, agencies, counselling types, topics, counsellors and admins'},
  items:[['b','CAR-13','Mandantentrennung und Verwaltung','Tenant separation and administration',1612],['o','CAR-13','Abnahmetest mit Beratungsstellenleitungen','Acceptance test with centre heads',0],['x','CAR-13','Rollen- und Stellenwechsel','Role and centre changes',370]],
  adr:[3,11,23], docs:[['produkt/architecture-und-roles/roles-permissions','Rollen und Rechte','Roles and permissions']],
  ua:[['ts','concept:tenant-registry','Tenant Registry'],['as','concept:agency-registry','Counseling Agency Registry'],['as','concept:tenant-isolation','Multitenancy & Cross-Träger Isolation'],['us','concept:user-administration','User & Consultant Administration']]},
 {id:'auth',aud:'ops',t:{de:'Anmeldung, Registrierung und Zwei-Faktor',en:'Login, registration and two-factor'},
  short:{de:'Pflicht-2FA, Keycloak 26.6.3 gehärtet, Anmeldung per E-Mail-Link',en:'Mandatory 2FA, hardened Keycloak 26.6.3, login via e-mail link'},
  can:{de:['sich registrieren und ein Thema und eine Stelle wählen','sich mit einem zweiten Faktor anmelden, der als Pflicht eingestellt ist','sich per E-Mail-Link anmelden'],
       en:['register and choose a topic and centre','log in with a second factor that is set as mandatory','log in via an e-mail link']},
  before:{de:'Registrierung, Anmeldung über Keycloak, freiwillige Zwei-Faktor-Anmeldung',en:'Registration, login via Keycloak, optional two-factor login'},
  items:[['b','CAR-13','Pflicht-2FA','Mandatory 2FA',190],['b','CAR-05','Keycloak 26.6.3','Keycloak 26.6.3',80],['x','CAR-REFACT','Härtung des Anmeldesystems Keycloak','Hardening of the Keycloak login system',239],['x','—','Anmeldung per E-Mail-Link','Login via e-mail link',60]],
  adr:[13], docs:[['plattform/core-systems/authentication-and-keycloak','Anmeldung und Keycloak','Authentication and Keycloak']],
  ua:[['us','concept:identity-ports','Identity Ports & Second Factor'],['ad','concept:admin-auth-2fa','Authentication, Password Reset and 2FA'],['kc','concept:otp-config-spi','OTP Config SPI']]},
 {id:'e2ee',aud:'ops',t:{de:'Verschlüsselung und Schlüssel',en:'Encryption and keys'},
  short:{de:'Schlüssel-Backup mit Wiederherstellung, Schutzstufen je Rolle',en:'Key backup with recovery, protection levels per role'},
  can:{de:['den Verlauf nach einem Passwortwechsel weiter lesen','Nachrichten lesen, die während einer Abmeldung eingetroffen sind (Schutzstufe, je Installation zuschaltbar)','als Plattform je Rolle festlegen, ob der Verlauf mit Passwort oder eigenem Wiederherstellungsschlüssel entsperrt wird'],
       en:['keep reading the history after a password change','read messages that arrived while logged out (protection level, switched on per installation)','as platform, decide per role whether history is unlocked with the password or a separate recovery key']},
  before:{de:'Schlüssel aus Chat-Kennung und Passwort abgeleitet',en:'Key derived from chat ID and password'},
  items:[['b','CAR-07','Schlüssel-Backup, Wiederherstellungsschlüssel, gegenseitige Geräte-Bestätigung','Key backup, recovery key, mutual device verification',295],['x','CAR-07','Einstellung je Rolle und zwei Schutzstufen aus dem Element-Projekt','Per-role setting and two protection levels from the Element project',210]],
  adr:[2,4], docs:[], ua:[['fe','concept:e2ee-silent-key-backup','E2EE and Silent Key Backup'],['fe','flow:silent-key-backup','Silent Key Backup Setup']]},
 {id:'deletion',aud:'ops',t:{de:'Löschung und Datensparsamkeit',en:'Deletion and data minimisation'},
  short:{de:'Löschabläufe je Datenart, 48-Stunden-Schutzfenster, Umgang mit inaktiven Konten',en:'Deletion runs per data type, 48-hour safety window, handling of inactive accounts'},
  can:{de:['ein Konto löschen und es 48 Stunden lang noch zurückholen','sicher sein, dass danach über Datenbank, Anmeldung und Chat hinweg gelöscht wird','inaktive Konten anschreiben, ruhend stellen und reaktivieren'],
       en:['delete an account and still restore it within 48 hours','rely on deletion across database, login and chat afterwards','contact inactive accounts, set them dormant and reactivate them']},
  before:{de:'drei Abläufe: deaktivieren, löschen, Erinnerung; Kontolöschung',en:'three runs: deactivate, delete, reminder; account deletion'},
  items:[['b','CAR-03','Automatische Löschabläufe je Datenart (teils bis zum Löschkonzept aus)','Automatic deletion runs per data type (some off until the deletion concept)',80],
         ['o','CAR-03','Löschfristen je Träger einstellen','Retention periods per provider',0],['o','CAR-03','Verbindliches Löschkonzept','Binding deletion concept',0],
         ['x','CAR-03','Kontolöschung mit Schutzfenster','Account deletion with safety window',312],['x','—','Konto-Inaktivität','Account inactivity',120],['x','CAR-03','Lösch-Aktionen für jede neue Datenart','Deletion actions for every new data type',80]],
  adr:[16], docs:[], ua:[['us','concept:scheduled-workflows','Scheduled Workflows & Task Claim Leases'],['as','concept:agency-deletion-workflow','Agency Deletion & Purge Workflow']]},
 {id:'base',aud:'ops',t:{de:'Gemeinsame Bausteine und Neugestaltung',en:'Shared components and redesign'},
  short:{de:'Neue Gestaltung aller Seiten, Bausteinkatalog, Spring Boot 4, React 19, Betrieb',en:'Redesign of all pages, component catalogue, Spring Boot 4, React 19, operations'},
  can:{de:['überall dieselbe, auch fürs Handy gestaltete Oberfläche nutzen','sich darauf verlassen, dass jeder Oberflächenbaustein einzeln auf Bedienung und Barrierefreiheit geprüft ist','Störungen mit 17 Betriebsanleitungen und Betriebsüberwachung schneller beheben'],
       en:['use one consistent interface, designed for mobile too','rely on every interface component being checked for operability and accessibility','fix incidents faster with 17 runbooks and monitoring']},
  before:{de:'React-App und Java-Dienste mit Spring Boot 3.3 und Java 17',en:'React app and Java services on Spring Boot 3.3 and Java 17'},
  items:[['b','CAR-08','React 19.2, Router v7, 203 Browsertests','React 19.2, Router v7, 203 browser tests',283],['b','CAR-05','Spring Boot 4.0 und Java 21, SigNoz, 17 Runbooks','Spring Boot 4.0 and Java 21, SigNoz, 17 runbooks',235],
         ['b','CAR-REFACT','Produktionskonfiguration, Datenbankschemata, Storybook, HTTPS-Härtung','Production configuration, database schemas, Storybook, HTTPS hardening',160],
         ['o','CAR-05/07','Lasttests','Load tests',0],
         ['x','CAR-08','Neugestaltung von Beratungs-App und Verwaltung','Redesign of counselling app and administration',2720],
         ['x','CAR-REFACT','Automatische Prüfung jedes Storybook-Bausteins','Automatic check of every Storybook component',511],
         ['x','CAR-05','Prüfung von Schnittstellen und Datenbank','Interface and database checks',229],['x','CAR-REFACT','Hintergrundaufgaben nur einmal','Background jobs run only once',206]],
  adr:[11], docs:[['plattform/core-systems/frontend-admin-overview','Frontend und Verwaltung','Frontend and administration'],['produkt/design-und-quality/ui-ux','Gestaltung','UI and UX']],
  ua:[['fe','concept:app-structure','Application Structure'],['ad','concept:admin-m3-design-system','M3 Design System'],['sg','','Supergraph']]}
];
var PLANNED_FEATURES = [['virus','upload'],['tokens','branding'],['hc','branding'],['video','calls'],['bot','livechat'],['ro','permissions'],['sess','permissions']];
var PLANT = {virus:['Virenscanner','Virus scanner'],tokens:['Design-Tokens','Design tokens'],hc:['Hoher Kontrast','High contrast'],video:['Video ohne Anmeldung','Video without login'],bot:['Bot-Schutz','Bot protection'],ro:['Support-Admin nur lesen','Read-only support admin'],sess:['Support-Sitzung mit Doppel-Freigabe','Support session with double approval']};

var KPIS = [
 {de:'Automatisierte Testfälle',en:'Automated test cases',a:3117,b:20902,dd:['Gesamt über alle Dienste, Frontend und Verwaltung','Total across all services, frontend and administration']},
 {de:'Tests Frontend und Verwaltung',en:'Tests frontend and administration',a:169,b:10212,dd:['Vorher nur Browsertests','Previously browser tests only']},
 {de:'Testzeilen je 100 Produktivzeilen',en:'Test lines per 100 production lines',a:63,b:98,dd:['Verhältnis Test- zu Produktivcode','Ratio of test code to production code']},
 {de:'Doppelter Produktivcode',en:'Duplicated production code',a:2.8,b:2.0,pct:1,dd:['Weniger ist besser, trotz 3,7-facher Codemenge','Lower is better, despite 3.7 times the code']},
 {de:'Architekturentscheidungen',en:'Architecture decisions',b:27,single:1,dd:['Dokumentiert; laut Review 2023 gab es keine Architektur-Doku','Documented; the 2023 review found no architecture documentation']},
 {de:'Funktionsschalter',en:'Feature switches',b:55,single:1,dd:['Auf drei Ebenen: Plattform, Träger, Beratungsstelle','On three levels: platform, provider, centre']},
 {de:'Bausteine im Storybook',en:'Components in Storybook',a:0,b:511,dd:['Mit rund 3.000 geprüften Ansichten','With about 3,000 checked views']}
];


/* ───────── v3: Feature-Seiten, verwandte Aufgaben, Repositorien ───────── */
PLANNED_FEATURES = []; /* stillgelegt; nicht mit PLAN (Planungsabsichten, unten) verwechseln */
var SLUG = {chat:'chat',notify:'notifications',handover:'case-handover',teamdisc:'team-consultation',supervision:'supervision',groups:'self-help-groups',calls:'calls-voice',livechat:'live-chat',upload:'files-media',practice:'training-tours',i18n:'multilingual',legal:'legal-texts',permissions:'feature-permissions',mailadmin:'email-templates',invites:'invitations-onboarding',branding:'branding',stats:'statistics',tenants:'tenants-agencies',auth:'auth-2fa',e2ee:'encryption-keys',deletion:'deletion'};
var LIVE = MEAS.live || [];
/* Ideen der Plan-Ansicht (ideas.json, optional; ORISO-Docs#223): Fähigkeits-ID je Quadrat über SLUG. */
MapViews.setIdeas(MEAS.ideas, function(id){ return SLUG[id] || null; });
/* Prüfläufe der Ansicht Health (health.json, optional; ORISO-Docs#218): jeder gezeigte Wert ist ein Feld des Laufprotokolls. */
MapViews.setHealth(MEAS.health || null, function(id){ return id === 'base' ? 'shared' : (SLUG[id] || null); });
/* Verlauf in der Ansicht Health (#219): jeder Lauf verweist mit dem Deep-Link-Helfer uaNodeHref auf seinen Understand-Knoten. */
MapViews.setNodeLink(function(id){
  var m = /^([^:]+)::/.exec(id), key = m ? null : 'sg';
  if (m) Object.keys(REPOID).forEach(function(k){ if (REPOID[k] === m[1]) key = k; });
  return key && UA[key] ? uaNodeHref(UA[key], id) : null;
});
var CODE_REPOS = ['ORISO-Frontend','ORISO-Admin','ORISO-UserService','ORISO-TenantService','ORISO-AgencyService','ORISO-ConsultingTypeService'];
var GH = 'https://github.com/OpenResilienceInitiative/';
var SBH = ['storybook-frontend','storybook-admin'];
var EP = MEAS.epics.epics, EPR = MEAS.epics.repos;
/* Board-Stand je Fähigkeit (board.json, optional): Aggregation in board-agg.js, Zuordnung über die Epics dieser Karte. */
var BOARD = (MEAS.board && typeof BoardAgg !== 'undefined') ? BoardAgg.aggregate(MEAS.board, MEAS.epics) : null;
/* Branches und Pull Requests je Aufgabe und Epic (ORISO-Docs#215); null, solange das Board keine work-Daten kennt. */
var WORKIDX = (MEAS.board && typeof BoardAgg !== 'undefined' && BoardAgg.workIndex) ? BoardAgg.workIndex(MEAS.board, MEAS.epics) : null;
/* Agent-Jobs aus dem Abschnitt der Issue-Beschreibung (ORISO-Docs#216, map/jobs.js); null, solange kein Issue einen Job meldet. */
var JOBS = (MEAS.board && typeof MapJobs !== 'undefined') ? MapJobs.index(MEAS.board, MEAS.epics) : null;
/* Refactoring-Aufgaben je Fähigkeit (ORISO-Docs#222): Label refactoring, Stand aus dem Board-Status; ohne Board null (keine Marke, kein Zahlenwert). */
MapViews.setRefactoring((MEAS.board && typeof BoardAgg !== 'undefined' && BoardAgg.refactoring) ? BoardAgg.refactoring(MEAS.board, MEAS.epics) : null, function(id){ return id === 'base' ? 'shared' : (SLUG[id] || null); });

/* ───────── Hilfen ───────── */
var lang = document.documentElement.getAttribute('data-lang')==='en' ? 'en' : 'de';
var view = MapViews.DEFAULT_VIEW;
var layers = {p:true, old:true, gone:true, b:true, x:true, t:true, d:true}, stack = [];
var stageOn = {idea:true, work:true, near:true, done:false};
function L(o){ return o ? (o[lang]!==undefined ? o[lang] : o.de) : ''; }
function L2(a){ return a[lang==='en'?1:0]; }
function loc(){ return lang==='en' ? 'en-GB' : 'de-DE'; }
function fmt(n){ return Math.round(n).toLocaleString(loc()); }
function rund(n){ var r = n<200 ? Math.round(n/10)*10 : n<2000 ? Math.round(n/50)*50 : Math.round(n/100)*100; return r.toLocaleString(loc()); }
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function el(t,c,h){ var e=document.createElement(t); if(c) e.className=c; if(h!==undefined) e.innerHTML=h; return e; }
function de(){ return lang==='de'; }
var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function shortPath(p){ return p.replace(/^src\/(test|main)\/java\/(de\/caritas\/cob\/\w+|com\/vi\/tenantservice)\//,'…/'); }
function stageOf(e){
  if (e.s==='c' || (e.tot>0 && e.done>=e.tot)) return 'done';
  if (!e.tot || !e.done) return 'idea';
  return e.done/e.tot >= 0.8 ? 'near' : 'work';
}
var STAGE = {idea:['Idee / nicht begonnen','Idea / not started'], work:['in Arbeit','in progress'], near:['fast fertig','nearly done'], done:['fertig','done']};
function stagePill(s){ return '<span class="stage-pill stage-'+s+'"><i></i>'+esc(L2(STAGE[s]))+'</span>'; }
var T = {
 de:{show:'zeigen',emph:'hervorheben',hide:'ausblenden',same:'vorher vorhanden, unverändert',rew:'vorher vorhanden, umgearbeitet',gone:'gelöscht oder ersetzt',b:'beauftragt, neu',x:'zusätzlich, neu',told:'Tests, schon vorher vorhanden',tnew:'Tests heute',
     tgOld:'Vorher vorhanden',tgGone:'Gelöscht',tgB:'Beauftragt',tgX:'Zusätzlich',
     can:'Das kann ich damit machen',before:'Vorher',lines:'Zeilen Code',tests:'Testfälle',testl:'Testzeilen',stories:'Storybook-Ansichten',epics:'Geplante Arbeit',
     items:'Bausteine aus der Leistungsübersicht',rel:'Verwandte Fähigkeiten',adr:'Architekturentscheidungen',docs:'Doku und Graph',
     st:{b:'steht',o:'offen',x:'zusätzlich',v:'vorher da'},close:'Schließen',back:'Zurück',core:'Kern aus dem Ausgangscode',
     split:'Aufteilung der neuen Zeilen: beauftragt / zusätzlich (geschätzt)',addshare:'Anteil zusätzlich',
     empty:'<b>Block wählen.</b> Ein Klick zoomt in die Fähigkeit und zeigt ihre Ordner, ein zweiter Klick die Dateien. Hier erscheinen Nutzen, Zahlen und Verweise.',
     area:function(m){return m==='hide'?'Fläche = Zeilen Programmcode heute':'Fläche = Zeilen Programm- und Testcode heute; schraffierter Rand = Testcode';},
     graph:'Im Understand-Graph',adrOff:'noch nicht veröffentlicht',feature:'Feature-Beschreibung',featureWip:'Feature-Beschreibung in Arbeit',
     tot:function(a,b,c,d){return ['Programmcode <b>'+a+'</b> → <b>'+b+'</b> Zeilen','Tests <b>'+c+'</b> → <b>'+d+'</b>'];},
     blocks:'Blöcke',search:'Filtern …',more:function(n){return 'Weitere '+n+' anzeigen';},files:'Dateien',folders:'Ordner',comps:'Bausteine',
     today:'heute',old:'Ausgangscode',noEp:'Keine Epics zugeordnet.',subs:'Teilaufgaben',openGh:'Auf GitHub öffnen',prio:'Priorität',effort:'Aufwand',release:'Release',
     hiddenSubs:function(n){return n+' Teilaufgabe(n) in einem privaten Repository nicht angezeigt';},cross:'Übergreifend',relIss:'Weitere zugehörige Aufgaben',
     openEp:function(n){return n+' offen';},showStage:'Stufe zeigen:',
     privSubs:function(n){return n+' Teilaufgabe(n) in einem privaten Repository, nur als Zahl gezählt';},notOnBoard:'Nicht auf dem Board',filterBy:'Teilaufgaben filtern',noneShown:'Keine Teilaufgaben für diesen Filter.',onBoardBar:'Stand auf dem Board',
     fAll:'Alle',fAccepted:'Abgenommen (Fertig)',fDev:'Auf Dev entwickelt (QA intern)',fStaging:'Auf Staging (QA extern)',fOpen:'Offen',
     gate:'Gate',gAll:'Alle Gates',gNone:'Kein Gate',gLegend:'Was die Gates bedeuten',gStep:function(n,name){return 'Gate '+name+', Schritt '+n+' von 8';}},
 en:{show:'show',emph:'emphasise',hide:'hide',same:'existed before, unchanged',rew:'existed before, reworked',gone:'deleted or replaced',b:'commissioned, new',x:'additional, new',told:'tests that already existed',tnew:'tests today',
     tgOld:'Existed before',tgGone:'Deleted',tgB:'Commissioned',tgX:'Additional',
     can:'What I can do with it',before:'Before',lines:'Lines of code',tests:'Test cases',testl:'Test lines',stories:'Storybook views',epics:'Planned work',
     items:'Building blocks from the service overview',rel:'Related capabilities',adr:'Architecture decisions',docs:'Docs and graph',
     st:{b:'done',o:'open',x:'additional',v:'existed'},close:'Close',back:'Back',core:'Core from the starting code',
     split:'Split of new lines: commissioned / additional (estimated)',addshare:'Additional share',
     empty:'<b>Pick a block.</b> A click zooms into the capability and shows its folders, a second click its files. Benefit, figures and links appear here.',
     area:function(m){return m==='hide'?'Area = lines of program code today':'Area = lines of program and test code today; hatched border = test code';},
     graph:'In the Understand graph',adrOff:'not published yet',feature:'Feature description',featureWip:'Feature description in progress',
     tot:function(a,b,c,d){return ['Program code <b>'+a+'</b> → <b>'+b+'</b> lines','Tests <b>'+c+'</b> → <b>'+d+'</b>'];},
     blocks:'blocks',search:'Filter …',more:function(n){return 'Show '+n+' more';},files:'files',folders:'folders',comps:'components',
     today:'today',old:'starting code',noEp:'No epics assigned.',subs:'Sub-issues',openGh:'Open on GitHub',prio:'Priority',effort:'Effort',release:'Release',
     hiddenSubs:function(n){return n+' sub-issue(s) in a private repository not shown';},cross:'Cross-cutting',relIss:'Further related issues',
     openEp:function(n){return n+' open';},showStage:'Show stage:',
     privSubs:function(n){return n+' sub-issue(s) in a private repository, counted only';},notOnBoard:'Not on the board',filterBy:'Filter sub-issues',noneShown:'No sub-issues for this filter.',onBoardBar:'State on the board',
     fAll:'All',fAccepted:'Accepted (Done)',fDev:'Developed on Dev (QA internal)',fStaging:'On Staging (QA external)',fOpen:'Open',
     gate:'Gate',gAll:'All gates',gNone:'No gate',gLegend:'What the gates mean',gStep:function(n,name){return 'Gate '+name+', step '+n+' of 8';}}
};
function tt(){ return T[lang]; }

/* Messwerte je Block */
var BY = {};
B.forEach(function(b){
  var m = MEAS.agg[b.id] || {};
  var d = MEAS.drill[b.id] || {t:[],s:[],p:[],o:[]};
  var st = 0; d.s.forEach(function(c){ st += c[3].length; });
  b.m = {oldL:m.old_l||0, same:m.old_same||0, rew:m.old_rew||0, gone:m.old_gone||0, newL:m.new_l||0, oldT:m.old_t||0, newT:m.new_t||0, oldTL:m.old_tl||0, newTL:m.new_tl||0, st:st};
  b.d = d;
  var wb=0, wx=0; b.items.forEach(function(i){ if(i[0]==='b') wb+=i[4]; if(i[0]==='x') wx+=i[4]; });
  b.shareX = (wb+wx) ? wx/(wb+wx) : 0.5;
  b.ep = []; EP.forEach(function(e,i){ if (e.b===b.id) b.ep.push(i); });
  BY[b.id] = b;
});
var REL = {};
MEAS.rel.forEach(function(r){ (REL[r[0]]=REL[r[0]]||[]).push([r[1],r[2]]); (REL[r[1]]=REL[r[1]]||[]).push([r[0],r[2]]); });
Object.keys(REL).forEach(function(k){ REL[k].sort(function(a,b){return b[1]-a[1];}); REL[k]=REL[k].filter(function(x){return BY[x[0]];}).slice(0,6); });
function openEpics(b){ return b.ep.filter(function(i){ return stageOf(EP[i])!=='done'; }).length; }

/* ───────── Treemap mit Zoomstufen: Übersicht → Bereich (Fähigkeit) → Baustein (Ordner) ───────── */
var Z = MEAS.zoom, PL = MEAS.planned.p, PLF = MEAS.planned.f, DS = MEAS.desc, hlMod = null;
function plannedOf(id){ var p = PL[id]; return p ? p.g + p.b : 0; }
function bidx(id){ return DS.bids.indexOf(id); }
var REPS = ['Frontend','Admin','UserService','TenantService','AgencyService','ConsultingTypeService'];
function worst(row, side){ var s=0,mx=0,mn=Infinity; row.forEach(function(r){s+=r.a;if(r.a>mx)mx=r.a;if(r.a<mn)mn=r.a;}); var s2=s*s,w2=side*side; return Math.max(w2*mx/s2, s2/(w2*mn)); }
function squarify(items,x,y,w,h){
  var total=0; items.forEach(function(i){total+=i.v;}); if (!total) return []; var sc=(w*h)/total;
  var rest=items.slice().sort(function(a,b){return b.v-a.v;}).map(function(i){return {it:i,a:i.v*sc};}), out=[], r={x:x,y:y,w:w,h:h};
  while(rest.length){
    var side=Math.min(r.w,r.h), row=[rest[0]], i=1;
    while(i<rest.length && worst(row.concat([rest[i]]),side)<=worst(row,side)){ row.push(rest[i]); i++; }
    var s=0; row.forEach(function(q){s+=q.a;});
    if(r.w>=r.h){ var cw=r.h>0?s/r.h:0, yy=r.y; row.forEach(function(q){var hh=cw>0?q.a/cw:0; out.push({it:q.it,x:r.x,y:yy,w:cw,h:hh}); yy+=hh;}); r.x+=cw; r.w-=cw; }
    else { var rh=r.w>0?s/r.w:0, xx=r.x; row.forEach(function(q){var ww=rh>0?q.a/rh:0; out.push({it:q.it,x:xx,y:r.y,w:ww,h:rh}); xx+=ww;}); r.y+=rh; r.h-=rh; }
    rest=rest.slice(i);
  }
  return out;
}
var tm = document.getElementById('tm');
var MOBILE = false, MIN_TAP = 44, lastKey = null, hlBlock = null;
/* Ebene je Fläche: welcher Schalter sie steuert */
var LAYER_OF = {same:'old', rew:'old', 'core-edge':'old', gone:'gone', b:'b', x:'x', ring:'t', ringold:'t'};
function lay(div, cls, x, y, w, h){ if (w<=0.3||h<=0.3) return; var d=el('div','ly '+cls); d.dataset.layer = LAYER_OF[cls]; d.style.left=x+'px'; d.style.top=y+'px'; d.style.width=w+'px'; d.style.height=h+'px'; d.setAttribute('aria-hidden','true'); div.appendChild(d); }
function fillSeq(div, rects, A, ca, cb){
  rects.forEach(function(r){
    var ar = r.w*r.h;
    if (A >= ar){ lay(div, ca, r.x, r.y, r.w, r.h); A -= ar; return; }
    if (A <= 0){ lay(div, cb, r.x, r.y, r.w, r.h); return; }
    if (r.w >= r.h){ var wa = A/r.h; lay(div, ca, r.x, r.y, wa, r.h); lay(div, cb, r.x+wa, r.y, r.w-wa, r.h); }
    else { var ha = A/r.w; lay(div, ca, r.x, r.y, r.w, ha); lay(div, cb, r.x, r.y+ha, r.w, r.h-ha); }
    A = 0;
  });
}
/* m = {newL, oldL, same, rew, gone, newTL, oldTL}; Testring außen, Funktion innen */
function drawInner(btn, m, shareX, w, h){
  var ox = 0, oy = 0, iw = w, ih = h;
  if (layers.t && m.newTL > 0){
    var code = Math.max(m.newL, m.oldL);
    if (code <= 0){ fillSeq(btn, [{x:0,y:0,w:w,h:h}], w*h*Math.min(m.oldTL/m.newTL,1), 'ringold', 'ring'); return; }
    var p = code/(code+m.newTL), s = w+h;
    var t = (2*s - Math.sqrt(Math.max(4*s*s - 16*(1-p)*w*h, 0)))/8;
    t = Math.min(t, Math.min(w,h)/2 - 1);
    var ring = [{x:0,y:0,w:w,h:t},{x:w-t,y:t,w:t,h:h-2*t},{x:0,y:h-t,w:w,h:t},{x:0,y:t,w:t,h:h-2*t}];
    var A = 0; ring.forEach(function(r){ A += r.w*r.h; });
    fillSeq(btn, ring, A*Math.min(m.oldTL/m.newTL,1), 'ringold', 'ring');
    ox = t; oy = t; iw = w-2*t; ih = h-2*t;
  }
  var total = Math.max(m.newL, m.oldL), core = m.oldL;
  if (total<=0) return;
  var r = Math.sqrt(Math.min(core/total,1)), cw = iw*r, ch = ih*r, y = oy;
  [['same',m.same],['rew',m.rew],['gone',m.gone]].forEach(function(pt){ if(!core) return; var hh = ch*pt[1]/core; lay(btn, pt[0], ox, y, cw, hh); y += hh; });
  var R1 = {x:ox+cw, y:oy, w:iw-cw, h:ih}, R2 = {x:ox, y:oy+ch, w:cw, h:ih-ch};
  var newOnly = Math.max(m.newL - m.same - m.rew, 0), Aall = R1.w*R1.h + R2.w*R2.h;
  if (Aall > 0 && newOnly > 0) fillSeq(btn, [R1, R2], Aall*(1-shareX), 'b', 'x');
  if (core>0) lay(btn,'core-edge',ox,oy,cw,ch);
}
function docCount(b){
  var n = (SLUG[b.id] && LIVE.indexOf(SLUG[b.id])>=0 ? 1 : 0) + b.docs.length;
  b.adr.forEach(function(a){ if (a<=ADR_LIVE) n++; });
  return n;
}
function docBadge(b){
  var n = docCount(b);
  return '<span class="docb'+(n?'':' none')+'" data-layer="d">'+(n ? (de()?'Doku ':'Docs ')+n : (de()?'keine Doku':'no docs'))+'</span>';
}
/* ───────── Board-Stand: Statusleiste, Prioritäts- und Reife-Plaketten ───────── */
var STATUS_L = {'Backlog':['Backlog','Backlog'],'Ready':['Bereit','Ready'],'On hold':['Pausiert','On hold'],'In progress':['In Arbeit','In progress'],'In review':['In Prüfung','In review'],'QA internal':['QA intern','QA internal'],'QA external':['QA extern','QA external'],'Done':['Fertig','Done']};
function boardOf(id){ return BOARD && BOARD.blocks[id] ? BOARD.blocks[id] : null; }
function dec(n){ return n.toLocaleString(loc(), {minimumFractionDigits:1, maximumFractionDigits:1}); }
function uhText(bs){ return (de()?'Dringend/Hoch ':'Urgent/High ')+fmt(bs.priority.urgentHigh); }
function readyText(bs){
  var r = bs.readiness;
  return r.avg===null ? (de()?'Reife –':'Readiness –') : (de()?'Reife ':'Readiness ')+dec(r.avg)+(de()?' von ':' of ')+fmt(r.max);
}
function unscoredText(bs){ return fmt(bs.readiness.unscored)+(de()?' ohne Wert':' without score'); }
function boardTitle(bs){
  var parts = bs.segments.filter(function(g){ return g.count>0; }).map(function(g){ return L2(STATUS_L[g.status])+' '+fmt(g.count); });
  return fmt(bs.total)+(de()?' Aufgaben: ':' issues: ')+parts.join(', ')+'; '+uhText(bs)+'; '+readyText(bs)+'; '+unscoredText(bs)+(findingsText(bs) ? '; '+findingsText(bs) : '');
}
function sbarHTML(bs, cls){
  return '<span class="sbar '+cls+'" aria-hidden="true">'+bs.segments.map(function(g){
    return '<i class="sseg" data-status="'+esc(g.status)+'" data-group="'+g.group+'" title="'+esc(L2(STATUS_L[g.status])+': '+g.count)+'" data-css="width:'+g.share+'%"></i>';
  }).join('')+'</span>';
}
function boardLegend(){
  if (!BOARD) return '';
  var names = ['Backlog','In progress','QA internal','QA external','Done'], groups = ['neutral','progress','qa-internal','qa-external','done'];
  var lab = [de()?'Backlog, Bereit, Pausiert':'Backlog, Ready, On hold', de()?'In Arbeit, In Prüfung':'In progress, In review', 'QA '+(de()?'intern':'internal'), 'QA '+(de()?'extern':'external'), de()?'Fertig':'Done'];
  return '<div class="blegend" role="img" aria-label="'+esc(de()?'Farbskala Board-Status':'Board status colour scale')+'"><b>'+(de()?'Statusleiste (Board)':'Status bar (board)')+'</b>'+
    groups.map(function(g,i){ return '<span><i class="sw sseg" data-status="'+names[i]+'" data-group="'+g+'"></i>'+esc(lab[i])+'</span>'; }).join('')+
    '<span>'+esc((de()?'Aufgaben ohne Fähigkeit: ':'Issues outside any capability: ')+fmt(BOARD.unmapped))+'</span></div>';
}
/* Wächter-Befunde (ORISO-Docs#207): vom Export in board.json je Aufgabe geschrieben, hier nur angezeigt. */
var RULE_T = {
  'stalled': function(d){ return de() ? 'Stillstand in '+L2(STATUS_L[d.status]||[d.status,d.status])+': '+fmt(d.days)+' Tage (Grenze '+fmt(d.threshold)+')' : 'Stalled in '+L2(STATUS_L[d.status]||[d.status,d.status])+': '+fmt(d.days)+' days (limit '+fmt(d.threshold)+')'; },
  'closed-not-done': function(d){ return de() ? 'Geschlossen, aber Status '+(d.status ? L2(STATUS_L[d.status]||[d.status,d.status]) : 'leer')+' statt Fertig' : 'Closed, but status is '+(d.status ? L2(STATUS_L[d.status]||[d.status,d.status]) : 'empty')+' instead of Done'; },
  'qa-external-no-bjoern': function(d){ return de() ? 'QA extern ohne '+d.expected+' zugewiesen' : 'QA external without '+d.expected+' assigned'; },
  'epic-no-readiness': function(){ return de() ? 'Epic ohne Reife-Wert' : 'Epic without Readiness'; },
  'job-stale': function(d){ return de() ? 'Agent-Job meldet "läuft", aber seit '+fmt(d.hours)+' Std. keine Aktualisierung (Grenze '+fmt(d.threshold)+' Std.)' : 'Agent job says running, but no update for '+fmt(d.hours)+' h (limit '+fmt(d.threshold)+' h)'; },
  'gate-status-mismatch': function(d){ return de() ? 'Gate '+d.gate+' passt nicht zum Status '+d.status : 'Gate '+d.gate+' does not fit status '+d.status; }
};
function findingText(rule, d){ return RULE_T[rule] ? RULE_T[rule](d||{}) : rule; }
function findingsText(bs){ var n = bs.findings ? bs.findings.total : 0; return n ? fmt(n)+(de()?(n===1?' Befund':' Befunde'):(n===1?' finding':' findings')) : ''; }
function findingBadge(bs){ return bs.findings && bs.findings.total ? '<span class="fbadge" aria-hidden="true">! '+fmt(bs.findings.total)+'</span>' : ''; }
function findingsPanel(bs){
  var f = bs.findings; if (!f || !f.total) return '';
  var rows = f.items.map(function(it){
    var ref = '#'+it.number, head = /^https:\/\//.test(it.url||'') ? '<a href="'+esc(it.url)+'" target="_blank" rel="noopener">'+esc(ref)+' '+esc(it.title)+'</a>' : esc(ref+' '+it.title);
    return '<li>'+head+'<ul>'+it.rules.map(function(r){ return '<li>'+esc(findingText(r, it.details[r]))+'</li>'; }).join('')+'</ul></li>';
  }).join('');
  return '<div class="kv"><h4>'+(de()?'Befunde der Wächter':'Watcher findings')+' ('+fmt(f.total)+')</h4><ul class="flist">'+rows+'</ul></div>';
}
function boardPanel(bs){
  var rows = bs.segments.map(function(g){
    return '<li><i class="sw sseg" data-status="'+esc(g.status)+'" data-group="'+g.group+'"></i><span class="sn">'+esc(L2(STATUS_L[g.status]))+'</span><span class="sc">'+fmt(g.count)+'</span></li>';
  }).join('');
  var r = bs.readiness;
  return '<div class="kv bstat"><h4>'+(de()?'Stand auf dem Board':'State on the board')+'</h4>'+sbarHTML(bs,'big')+
    '<ul class="slist">'+rows+'</ul>'+
    '<div class="bbadges"><span class="bb">'+(de()?'Dringend ':'Urgent ')+fmt(bs.priority.urgent)+'</span><span class="bb">'+(de()?'Hoch ':'High ')+fmt(bs.priority.high)+'</span>'+
    '<span class="bb">'+esc(readyText(bs))+(r.avg===null?'':' <span class="raw">(Ø '+dec(r.avg)+' / '+fmt(r.max)+')</span>')+'</span><span class="bb">'+esc(unscoredText(bs))+'</span></div>'+
    '<p class="bnote">'+(de()?'Reife: Rohwert aus dem Board, die Skala ist offen; Maximum = höchster Wert auf dem ganzen Board.':'Readiness: raw board value, the scale is open; maximum = highest value on the whole board.')+
    (bs.noStatus ? ' '+fmt(bs.noStatus)+(de()?' Aufgabe(n) ohne Status stehen nicht in der Leiste.':' issue(s) without a status are not in the bar.') : '')+'</p></div>';
}

function label(title, sub){ return '<span class="lab"><span class="lt">'+esc(title)+'</span>'+(sub?'<span class="ln">'+esc(sub)+'</span>':'')+'</span>'; }
function sizeCls(btn, w, h){ if (w<74 || h<46) btn.classList.add('xs'); else if (w<150 || h<74) btn.classList.add('sm'); }
function tile(tag, x, y, w, h){ var e = el(tag,'blk'); e.style.left=x+'px'; e.style.top=y+'px'; e.style.width=w+'px'; e.style.height=h+'px'; if (tag==='button') e.type='button'; return e; }

/* Zustand aus dem Detail-Stapel ableiten */
function mapState(){
  var bi=-1, mi=-1;
  stack.forEach(function(v,i){ if (v.v==='block'){ bi=i; mi=-1; } else if (v.v==='mod' && bi>=0){ mi=i; } });
  if (bi<0) return {lvl:0};
  if (mi<0) return {lvl:1, b:stack[bi].id, bi:bi};
  return {lvl:2, b:stack[bi].id, bi:bi, m:stack[mi].m, mi:mi};
}
function blockM(b){ var m=b.m; return {newL:m.newL, oldL:m.oldL, same:m.same, rew:m.rew, gone:m.gone, newTL:m.newTL, oldTL:m.oldTL}; }
function modM(z){ return {newL:z[4], oldL:z[5], same:z[6], rew:z[7], gone:z[8], newTL:z[9], oldTL:z[10]}; }
function areaOf(m){ return Math.max(m.newL, m.oldL) + (layers.t ? m.newTL : 0); }
function modName(z){ return (z[0]>1 ? REPS[z[0]]+' · ' : (z[0]===1 ? 'Admin · ' : 'App · '))+z[1]; }

function drawLevel0(root, W, H){
  var auds = ['app','adm','ops'].map(function(a){ var v=0; B.forEach(function(b){ if(b.aud===a) v+=areaOf(blockM(b)); }); return {a:a, v:v}; });
  squarify(auds,0,0,W,H).forEach(function(r){
    var ad = el('div','aud'); ad.style.left=r.x+'px'; ad.style.top=r.y+'px'; ad.style.width=r.w+'px'; ad.style.height=r.h+'px';
    var pa = 0; B.forEach(function(b){ if (b.aud===r.it.a) pa += plannedOf(b.id); });
    var hd = el('div','aud-h', esc(r.w > 470 ? L(AUD[r.it.a]) : L(AUD[r.it.a].s))+(pa && r.w >= 300 ? ' <span class="aud-p" data-layer="p">+'+esc(rund(pa))+(r.w >= 560 ? (de()?' Zeilen geplant (Schätzung)':' lines planned (estimate)') : (de()?' geplant':' planned'))+'</span>' : '')); hd.setAttribute('aria-hidden','true');
    var body = el('div','aud-b'); ad.appendChild(hd); ad.appendChild(body); root.appendChild(ad);
    ad.setAttribute('role','group'); ad.setAttribute('aria-label', L(AUD[r.it.a]));
    var items = B.filter(function(b){return b.aud===r.it.a;}).map(function(b){ return {b:b, v:Math.max(areaOf(blockM(b))+plannedOf(b.id),1)}; });
    squarify(items,0,0,r.w,r.h-22).forEach(function(q){
      var b=q.it.b, small = (q.w<MIN_TAP || q.h<MIN_TAP);
      var btn = tile(small?'div':'button', q.x, q.y, q.w, q.h); btn.dataset.id=b.id; btn.title = L(b.t);
      if (!small) btn.setAttribute('aria-label', L(b.t)+' – '+(de()?'hineinzoomen':'zoom in'));
      else { btn.classList.add('nt'); btn.setAttribute('aria-hidden','true'); }
      var pl = plannedOf(b.id), cur = areaOf(blockM(b)), fr = pl ? pl/(cur+pl) : 0, iw = q.w-4, ih = q.h-4, cw = iw, ch = ih, gx = 0, gy = 0, gw = 0, gh = 0;
      if (fr){ if (iw >= ih){ cw = iw*(1-fr); gx = cw; gw = iw-cw; gh = ih; } else { ch = ih*(1-fr); gy = ch; gw = iw; gh = ih-ch; } }
      var host = el('div','cur'); host.style.width = cw+'px'; host.style.height = ch+'px'; btn.appendChild(host);
      drawInner(host, blockM(b), b.shareX, cw, ch);
      if (fr){
        var P = PL[b.id], gh2 = el('div','ly pghost'); gh2.dataset.layer='p'; gh2.setAttribute('aria-hidden','true');
        gh2.style.left=gx+'px'; gh2.style.top=gy+'px'; gh2.style.width=gw+'px'; gh2.style.height=gh+'px';
        var sb = P.b/(P.g+P.b);
        gh2.innerHTML = '<i class="pb" data-css="'+(gw>=gh?'width:'+(100*sb).toFixed(1)+'%;height:100%':'height:'+(100*sb).toFixed(1)+'%;width:100%')+'"></i><i class="pg"></i>';
        gh2.style.flexDirection = gw>=gh ? 'row' : 'column';
        btn.appendChild(gh2);
      }
      btn.insertAdjacentHTML('beforeend', label(L(b.t), rund(b.m.newL)+(de()?' Zeilen · ':' lines · ')+fmt(b.m.newT)+(de()?' Tests':' tests')) + docBadge(b));
      if (fr && gx){ btn.querySelector('.lab').style.right = (gw+6)+'px'; btn.querySelector('.docb').style.right = (gw+7)+'px'; }
      var bs = boardOf(b.id);
      if (bs){
        btn.classList.add('hasbar'); btn.title = L(b.t)+' – '+boardTitle(bs);
        btn.insertAdjacentHTML('beforeend', sbarHTML(bs,'tile')+'<span class="sbadges" aria-hidden="true"><span class="bb">'+esc(uhText(bs))+'</span><span class="bb">'+esc(readyText(bs))+' · '+esc(unscoredText(bs))+'</span></span>'+findingBadge(bs));
      }
      if (pl) btn.setAttribute('aria-label', L(b.t)+' – '+(de()?'hineinzoomen; rund ':'zoom in; about ')+rund(pl)+(de()?' Zeilen geplant (Schätzung)':' lines planned (estimate)'));
      sizeCls(btn, q.w, q.h);
      btn.addEventListener('click', function(){ openBlock(b.id, btn, true); });
      if (!small && canPlan() && b.ep.length) dragSource(btn, {kind:'block', id:b.id});
      body.appendChild(btn);
    });
  });
}
function zoomHead(root, W, txt){ var hd = el('div','aud-h', esc(txt)); hd.style.position='absolute'; hd.style.left='0'; hd.style.top='0'; hd.style.width=W+'px'; hd.setAttribute('aria-hidden','true'); root.appendChild(hd); }
function drawLevel1(root, W, H, b){
  var mods = Z[b.id] || [], cap = MOBILE ? 14 : 36;
  zoomHead(root, W, L(b.t)+' · '+fmt(mods.length)+(de()?' Ordner':' folders'));
  var items = mods.map(function(z,i){ return {z:z, i:i, v:areaOf(modM(z))}; }).filter(function(x){ return x.v>0; });
  var shown = items.slice(0, cap), rest = items.slice(cap), rv = 0; rest.forEach(function(x){ rv += x.v; });
  if (rest.length) shown.push({more:rest.length, v:rv});
  squarify(shown,0,22,W,H-22).forEach(function(q){
    var small = (q.w<MIN_TAP || q.h<MIN_TAP);
    if (q.it.more){
      var mb = tile(small?'div':'button', q.x, q.y, q.w, q.h); mb.classList.add('moret');
      mb.innerHTML = label((de()?'+'+q.it.more+' weitere Ordner':'+'+q.it.more+' more folders'), de()?'als Liste':'as a list');
      if (!small) mb.addEventListener('click', function(){ push({v:'mods'}); }); else mb.setAttribute('aria-hidden','true');
      sizeCls(mb, q.w, q.h); root.appendChild(mb); return;
    }
    var z = q.it.z, nm = modName(z);
    var btn = tile(small?'div':'button', q.x, q.y, q.w, q.h); btn.dataset.mod = q.it.i; btn.title = nm + modDescShort(b, q.it.i);
    if (small){ btn.classList.add('nt'); btn.setAttribute('aria-hidden','true'); }
    else btn.setAttribute('aria-label', nm+' – '+(de()?'hineinzoomen':'zoom in'));
    drawInner(btn, modM(z), b.shareX, q.w-4, q.h-4);
    var sub = z[4] ? rund(z[4])+(de()?' Zeilen':' lines') : (de()?'gelöscht: ':'deleted: ')+rund(z[5])+(de()?' Zeilen':' lines');
    if (z[11]) sub += ' · '+fmt(z[11])+(de()?' Tests':' tests');
    btn.insertAdjacentHTML('beforeend', label(z[1], sub));
    sizeCls(btn, q.w, q.h);
    if (!small) btn.addEventListener('click', function(){ openMod(q.it.i); });
    root.appendChild(btn);
  });
}
function fileM(f){
  var k=f[1];
  if (k===0) return {newL:f[2], oldL:(f[3]||0)+(f[4]||0), same:f[3]||0, rew:f[4]||0, gone:0, newTL:0, oldTL:0};
  if (k===2) return {newL:0, oldL:f[2], same:0, rew:0, gone:f[2], newTL:0, oldTL:0};
  return {newL:0, oldL:0, same:0, rew:0, gone:0, newTL:f[2], oldTL:f[3]||0};
}
function modDescShort(b, mi){
  var md = DS.md[bidx(b.id)+'|'+mi]; if (!md) return '';
  var s = DS.fd[bidx(b.id)+'|'+mi+'|'+md[0]]; return s ? ' — '+s : '';
}
function drawLevel2(root, W, H, b, mi){
  var z = Z[b.id][mi], cap = MOBILE ? 18 : 60;
  zoomHead(root, W, modName(z)+' · '+fmt(z[12].length)+(de()?' Dateien':' files'));
  var items = z[12].map(function(f,i){ return {f:f, i:i, v:(f[1]===1 && !layers.t) ? 0 : f[2]}; }).filter(function(x){ return x.v>0; });
  var shown = items.slice(0, cap), rest = items.slice(cap), rv = 0; rest.forEach(function(x){ rv += x.v; });
  if (rest.length) shown.push({more:rest.length, v:rv});
  squarify(shown,0,22,W,H-22).forEach(function(q){
    var small = (q.w<MIN_TAP || q.h<MIN_TAP);
    if (q.it.more){
      var mb = tile(small?'div':'button', q.x, q.y, q.w, q.h); mb.classList.add('moret');
      mb.innerHTML = label((de()?'+'+q.it.more+' weitere Dateien':'+'+q.it.more+' more files'), de()?'als Liste':'as a list');
      if (!small) mb.addEventListener('click', function(){ var v=stack[stack.length-1]; if (v.v!=='mod') stack = stack.slice(0, mapState().mi+1); renderView(); focusTitle(); }); else mb.setAttribute('aria-hidden','true');
      sizeCls(mb, q.w, q.h); root.appendChild(mb); return;
    }
    var f = q.it.f, nm = f[0].split('/').pop();
    var btn = tile(small?'div':'button', q.x, q.y, q.w, q.h); btn.dataset.file = q.it.i; var fdsc = DS.fd[bidx(b.id)+'|'+mi+'|'+q.it.i]; btn.title = f[0] + (fdsc ? ' — '+fdsc : '');
    if (small){ btn.classList.add('nt'); btn.setAttribute('aria-hidden','true'); } else btn.setAttribute('aria-label', nm);
    drawInner(btn, fileM(f), b.shareX, q.w-4, q.h-4);
    var sub = f[1]===1 ? fmt(f[4]||0)+(de()?' Tests':' tests') : f[1]===2 ? (de()?'gelöscht':'deleted') : rund(f[2])+(de()?' Zeilen':' lines');
    btn.insertAdjacentHTML('beforeend', label(nm, sub));
    sizeCls(btn, q.w, q.h);
    if (!small) btn.addEventListener('click', function(){ openFile(mi, q.it.i); });
    root.appendChild(btn);
  });
}
function drawMap(animFrom){
  var W = tm.clientWidth; MOBILE = W < 560;
  var H = Math.round(W * (MOBILE ? 1.6 : (W>820 ? 0.95 : 1.15)));
  tm.style.height = H+'px';
  var st = mapState(), old = tm.querySelector('.zl'), oldRect = null;
  if (animFrom && old && animFrom.sel){ var t0 = old.querySelector(animFrom.sel); if (t0) oldRect = {x:t0.offsetLeft+(t0.parentNode.classList.contains('aud-b')?t0.parentNode.parentNode.offsetLeft:0), y:t0.offsetTop+(t0.parentNode.classList.contains('aud-b')?t0.parentNode.parentNode.offsetTop+22:0), w:t0.offsetWidth, h:t0.offsetHeight}; }
  tm.innerHTML='';
  var root = el('div','zl'); tm.appendChild(root);
  if (st.lvl===0) drawLevel0(root, W, H);
  else if (st.lvl===1) drawLevel1(root, W, H, BY[st.b]);
  else drawLevel2(root, W, H, BY[st.b], st.m);
  root.insertAdjacentHTML('beforeend','<div class="zempty" id="zempty"><p>'+(de()?'Alle Ebenen ausgeblendet – mindestens eine einschalten.':'All layers hidden – switch at least one on.')+'</p></div>');
  /* Zoom-Übergang */
  if (!reduce && animFrom){
    var r = null;
    if (animFrom.dir==='in') r = oldRect;
    else if (animFrom.childSel){ var c = root.querySelector(animFrom.childSel); if (c){ r = {x:c.offsetLeft+(c.parentNode.classList.contains('aud-b')?c.parentNode.parentNode.offsetLeft:0), y:c.offsetTop+(c.parentNode.classList.contains('aud-b')?c.parentNode.parentNode.offsetTop+22:0), w:c.offsetWidth, h:c.offsetHeight}; } }
    if (r && r.w>0 && r.h>0){
      root.style.transition='none';
      root.style.transform = animFrom.dir==='in'
        ? 'translate('+r.x+'px,'+r.y+'px) scale('+(r.w/W)+','+(r.h/H)+')'
        : 'scale('+(W/r.w)+','+(H/r.h)+') translate('+(-r.x)+'px,'+(-r.y)+'px)';
      root.style.opacity = animFrom.dir==='in' ? '.4' : '.4';
      void root.offsetWidth;
      root.style.transition='transform 420ms cubic-bezier(.2,.7,.2,1), opacity 300ms ease';
      root.style.transform='none'; root.style.opacity='1';
    }
  }
  applyLayers(); markSel(); drawZbar(st); if (typeof markRelease === 'function' && RSCOPE) markRelease();
  drawStageFoot(); applyView();
}
/* Ansicht State | Health | Plan: die Haken je Ansicht stehen in views.js (MapViews.VIEWS). */
function drawStageFoot(){
  var own = MapViews.VIEWS[view].legend(lang);
  document.getElementById('stagefoot').innerHTML = own ? '<span class="vnote">'+esc(own)+'</span>' : rampLegend() + '<span>'+esc(tt().area(layers.t?'show':'hide'))+'</span>' + boardLegend();
}
function applyView(){
  var v = MapViews.VIEWS[view];
  tm.classList.toggle('vview', view !== MapViews.DEFAULT_VIEW);
  Array.prototype.forEach.call(tm.querySelectorAll('.blk'), function(e){
    var id = e.dataset.id || curBlock(), tok = id && BY[id] ? v.colour(BY[id]) : null;
    if (tok) e.style.setProperty('--view-fill', 'var(--'+tok+')'); else e.style.removeProperty('--view-fill');
    /* Gesundheits-Merkmal (Band und Wert aus dem Laufprotokoll) nur auf den Quadraten der Übersicht; Farbe allein trägt nie die Aussage. */
    var hb = e.dataset.id && BY[e.dataset.id] && v.badge ? v.badge(BY[e.dataset.id]) : null;
    if (hb){ e.dataset.hband = hb.band; e.dataset.hs = hb.text; } else { delete e.dataset.hband; delete e.dataset.hs; }
    /* Refactoring-Marke (geplant / läuft / erledigt, immer als Wort) nur auf den Quadraten der Übersicht (ORISO-Docs#222). */
    var rf = e.dataset.id && BY[e.dataset.id] && v.refactor ? v.refactor(BY[e.dataset.id], lang) : null;
    if (rf){ e.dataset.rf = rf.state; e.dataset.rft = rf.text; e.dataset.rfw = rf.word; } else { delete e.dataset.rf; delete e.dataset.rft; delete e.dataset.rfw; }
    /* Die Quadrate tragen ein aria-label; die Marke steht dann auch darin, sonst hörten Screenreader sie nicht. */
    if (e.dataset.arb === undefined && rf && e.hasAttribute('aria-label')) e.dataset.arb = e.getAttribute('aria-label');
    if (e.dataset.arb !== undefined){ if (rf) e.setAttribute('aria-label', e.dataset.arb+' – '+rf.text); else { e.setAttribute('aria-label', e.dataset.arb); delete e.dataset.arb; } }
    /* Ideen-Markierung nur auf den Quadraten der Übersicht (data-id), mit Rahmen statt nur Farbe. */
    e.classList.toggle('vmark', !!(e.dataset.id && BY[e.dataset.id] && v.mark(BY[e.dataset.id])));
  });
}
/* Werkzeugzeile über der Karte: Ideenliste in Plan, „Ideen anzeigen“ in Zustand und Gesundheit (views.js). */
function capLabel(slug){ for (var id in SLUG) if (SLUG[id]===slug && BY[id]) return L(BY[id].t); return null; }
function drawViewTools(){
  var host = document.getElementById('viewTools'); if (!host) return;
  var html = MapViews.tools(view, lang, capLabel);
  host.innerHTML = html; host.hidden = html === '';
}
function ideasChanged(focusSel){
  drawViewTools(); drawStageFoot(); applyView();
  if (stack.length) renderView();
  var f = focusSel && document.querySelector('#viewTools ' + focusSel); if (f) f.focus({preventScroll:true});
}
(function(){
  var host = document.getElementById('viewTools');
  host.addEventListener('click', function(e){
    var i = e.target.closest('[data-idea]'), t = e.target.closest('[data-ideatoggle]');
    if (i){ var id = i.getAttribute('data-idea'); MapViews.selectIdea(id); ideasChanged('[data-idea="'+id+'"]'); }
    else if (t){ MapViews.toggleIdeas(); ideasChanged('[data-ideatoggle]'); }
  });
})();
function setView(next, push){
  if (MapViews.VIEW_IDS.indexOf(next) < 0 || next === view) return;
  view = next; document.getElementById('layerRow').hidden = view !== MapViews.DEFAULT_VIEW; document.getElementById('layerHelp').hidden = view !== MapViews.DEFAULT_VIEW;
  if (push) syncHash(true); /* vor dem Neuzeichnen, sonst ersetzt renderView den Eintrag still */
  drawViewSwitch(); drawStageFoot(); applyView();
  if (stack.length) renderView();
}
function drawViewSwitch(){
  var box = document.getElementById('viewSwitch'); box.innerHTML = '';
  box.setAttribute('aria-label', de() ? 'Ansicht' : 'View');
  MapViews.VIEW_IDS.forEach(function(id){
    var b = el('button','tog vsw'); b.type = 'button'; b.dataset.mview = id;
    b.textContent = MapViews.VIEWS[id].title[lang];
    b.setAttribute('aria-pressed', id === view ? 'true' : 'false');
    b.addEventListener('click', function(){ setView(id, true); });
    box.appendChild(b);
  });
  drawViewTools();
}
function rampLegend(){
  var d = de();
  return '<div class="ramp" role="img" aria-label="'+esc(d?'Farbskala: vorher unverändert, umgearbeitet, beauftragt neu, zusätzlich neu':'Colour scale: unchanged, reworked, commissioned new, additional new')+'">'+
    '<div class="rbar"><i class="r1"><b>1</b></i><i class="r2"><b>2</b></i><i class="r3"><b>3</b></i><i class="r4"><b>4</b></i></div>'+
    '<div class="rlab"><span><b>1</b> '+(d?'vorher, unverändert':'before, unchanged')+'</span><span><b>2</b> '+(d?'umgearbeitet':'reworked')+'</span><span><b>3</b> '+(d?'beauftragt, neu':'commissioned, new')+'</span><span><b>4</b> '+(d?'zusätzlich, neu':'additional, new')+'</span></div>'+
    '<div class="rextra"><span><i class="sw t"></i>'+(d?'Tests (Schraffur; hell = schon vorher da)':'Tests (hatched; light = already existed)')+'</span><span><i class="sw gone"></i>'+(d?'gelöscht oder ersetzt':'deleted or replaced')+'</span>'+
    '<span><i class="sw pg"></i>'+(d?'geplant, nicht begonnen (Schätzung)':'planned, not started (estimate)')+'</span><span><i class="sw pb"></i>'+(d?'geplant, in Arbeit (Schätzung)':'planned, in progress (estimate)')+'</span>'+
    '<span><i class="sw fon"></i>'+(d?'weißer Rahmen = ausgewählt':'white frame = selected')+'</span><span><i class="sw frel"></i>'+(d?'roter Rahmen = hängt zusammen mit':'red frame = connected with')+'</span><span><i class="docb" data-css="position:static">'+(d?'Doku':'Docs')+'</i>'+(d?'Feature-Seite, Doku oder ADRs':'feature page, docs or ADRs')+'</span></div></div>';
}
function drawZbar(st){
  var zb = document.getElementById('zbar'), d = de(), b = st.b ? BY[st.b] : null;
  var steps = [[d?'Übersicht':'Overview', 0], [b ? L(b.t) : (d?'Bereich':'Area'), 1], [st.lvl===2 ? Z[st.b][st.m][1] : (d?'Baustein':'Module'), 2]];
  var h = (st.lvl ? '<button type="button" class="back" data-zout>‹ '+(d?'Herauszoomen':'Zoom out')+'</button>' : '')+
    '<ol class="zsteps" aria-label="'+(d?'Zoomstufe':'Zoom level')+'">'+steps.map(function(s){
      var cur = s[1]===st.lvl, reach = s[1] < st.lvl;
      return '<li>'+(reach ? '<button type="button" data-zto="'+s[1]+'">'+esc(s[0])+'</button>' : '<span'+(cur?' aria-current="step"':' class="dis"')+'>'+esc(s[0])+'</span>')+'</li>';
    }).join('')+'</ol>'+
    (st.lvl && useSheet() ? '<button type="button" class="back" data-zdet>'+(d?'Details':'Details')+' ›</button>' : '');
  zb.innerHTML = h;
  var o = zb.querySelector('[data-zout]'); if (o) o.addEventListener('click', zoomOut);
  Array.prototype.forEach.call(zb.querySelectorAll('[data-zto]'), function(x){ x.addEventListener('click', function(){ zoomTo(+x.getAttribute('data-zto')); }); });
  var dt = zb.querySelector('[data-zdet]'); if (dt) dt.addEventListener('click', function(){ opener = dt; renderView(); if (!sheet.open) sheet.showModal(); focusTitle(); });
}
function zoomTo(lvl){
  var st = mapState();
  if (lvl>=st.lvl) return;
  if (lvl===0){ hlBlock = st.b; stack = []; }
  else { if (st.lvl===2) hlMod = {b:st.b, m:st.m}; stack = stack.slice(0, st.bi+1); }
  renderView();
  var zb = document.getElementById('zbar').querySelector('[aria-current]'); if (zb && useSheet()) { zb.setAttribute('tabindex','-1'); zb.focus({preventScroll:true}); }
}
function zoomOut(){ var st = mapState(); if (st.lvl) zoomTo(st.lvl-1); }
document.querySelector('.stage').addEventListener('keydown', function(e){ if (e.key==='Escape' && mapState().lvl){ e.preventDefault(); zoomOut(); } });
function syncMap(){
  var st = mapState(), key = st.lvl+'|'+(st.b||'')+'|'+(st.m===undefined?'':st.m), anim = null;
  if (key === lastKey) { markSel(); return; }
  var prev = lastKey ? lastKey.split('|') : null; lastKey = key;
  if (prev){
    var pl = +prev[0];
    if (st.lvl > pl) anim = {dir:'in', sel: st.lvl===1 ? '[data-id="'+st.b+'"]' : '[data-mod="'+st.m+'"]'};
    else if (st.lvl < pl) anim = {dir:'out', childSel: pl===1 ? '[data-id="'+prev[1]+'"]' : '[data-mod="'+prev[2]+'"]'};
  }
  drawMap(anim);
}
function applyLayers(){
  Array.prototype.forEach.call(tm.querySelectorAll('[data-layer]'), function(e){ e.classList.toggle('off', !layers[e.dataset.layer]); });
  var all = !layers.p && !layers.old && !layers.gone && !layers.b && !layers.x && !layers.t && !layers.d;
  tm.classList.toggle('alloff', all);
}
function curBlock(){ for (var i=stack.length-1;i>=0;i--) if (stack[i].v==='block') return stack[i].id; return null; }
function markSel(){
  var st = mapState(), sel = null, rel = [], attr = 'id';
  if (st.lvl===0 && hlBlock){ sel = hlBlock; rel = (REL[sel]||[]).slice(0,4).map(function(x){return x[0];}); }
  else if (st.lvl===1 && hlMod!==null && hlMod.b===st.b){ attr='mod'; sel = String(hlMod.m); var bi=bidx(st.b);
    rel = (DS.me[bi+'|'+hlMod.m]||[]).filter(function(x){ return x[0]===bi; }).map(function(x){ return String(x[1]); }); }
  else if (st.lvl===2){ var top = stack[stack.length-1]; if (top.v==='file'){ attr='file'; sel = String(top.f); var bi2=bidx(st.b);
    rel = (DS.fe[bi2+'|'+st.m+'|'+top.f]||[]).filter(function(x){ return x[0]===bi2 && x[1]===st.m; }).map(function(x){ return String(x[2]); }); } }
  tm.classList.toggle('sel', sel!==null && sel!==undefined);
  Array.prototype.forEach.call(tm.querySelectorAll('.blk'), function(e){
    var v = e.dataset[attr];
    e.classList.toggle('on', sel!=null && v===sel);
    e.classList.toggle('rel', sel!=null && v!==undefined && rel.indexOf(v)>=0);
  });
}

/* ───────── Steuerung ───────── */
function drawControls(){
  drawViewSwitch();
  var tg = document.getElementById('layerTogs'); tg.innerHTML='';
  var defs = de() ? [
    ['p','p','Geplant','Schätzung: geplante Arbeit aus offenen GitHub-Aufgaben, als gestrichelte Erweiterung des Blocks; grau = nicht begonnen, blau = in Arbeit'],
    ['old','same','Vorher vorhanden','Schwächste Farbstufe: Code aus dem Ausgangscode, unverändert oder umgearbeitet'],
    ['gone','gone','Gelöscht','Ziegelrot gestrichelt und schraffiert: Code aus dem Ausgangscode, der gelöscht oder ersetzt wurde'],
    ['b','b','Beauftragt','Kräftige Farbstufe: neuer Code, der beauftragt war'],
    ['x','x','Zusätzlich','Kräftigste Farbstufe: neuer Code, der zusätzlich geliefert wurde'],
    ['t','t','Tests','Schraffierter Rand: automatische Tests um die Funktion; aus = Fläche nur aus Programmcode'],
    ['d','d','Doku','Kennzeichen oben rechts: Feature-Seite, Doku-Seiten oder Architekturentscheidungen vorhanden']]
   : [
    ['p','p','Planned','Estimate: planned work from open GitHub issues, drawn as a dashed extension of the block; grey = not started, blue = in progress'],
    ['old','same','Existed before','Faintest colour step: code from the starting code, unchanged or reworked'],
    ['gone','gone','Deleted','Brick-red dashed and hatched: code from the starting code that was deleted or replaced'],
    ['b','b','Commissioned','Strong colour step: new code that was commissioned'],
    ['x','x','Additional','Strongest colour step: new code delivered in addition'],
    ['t','t','Tests','Hatched border: automated tests around the function; off = area from program code only'],
    ['d','d','Docs','Badge top right: feature page, docs pages or architecture decisions exist']];
  defs.forEach(function(dd){
    var b = el('button','tog'); b.type='button';
    b.innerHTML = '<i class="sw '+dd[1]+'"></i><span class="tl">'+esc(dd[2])+'</span>';
    b.title = dd[3]; b.setAttribute('aria-label', dd[2]+': '+dd[3]);
    b.setAttribute('aria-pressed', layers[dd[0]]?'true':'false');
    b.addEventListener('click', function(){
      layers[dd[0]] = !layers[dd[0]]; b.setAttribute('aria-pressed', layers[dd[0]]?'true':'false');
      if (dd[0]==='t') drawMap(); else applyLayers();
    });
    tg.appendChild(b);
  });
  document.getElementById('layerHelp').textContent = de()
    ? 'Ebenen ein- und ausblenden. Farbstufen von schwach nach kräftig: Code aus dem Ausgangscode, umgearbeitet, beauftragt, zusätzlich geliefert. Ziegelrot = gelöscht, schraffierter Rand = automatische Tests, Kennzeichen = Doku vorhanden, gestrichelte Erweiterung = geplant (Schätzung).'
    : 'Show or hide layers. Colour steps from faint to strong: code from the starting code, reworked, commissioned, delivered in addition. Brick red = deleted, hatched border = automated tests, badge = documentation exists, dashed extension = planned (estimate).';
}

/* ───────── Drill-down: Ansichten-Stapel ───────── */
var panel = document.getElementById('panel'), sheet = document.getElementById('sheet'), sheetBody = document.getElementById('sheetBody'), opener = null;
function useSheet(){ return window.matchMedia('(max-width:980px)').matches; }
function viewTitle(v){
  var t=tt();
  if (v.v==='block') return L(BY[v.id].t);
  if (v.v==='epic') return '#'+EP[v.i].n+' '+EP[v.i].t;
  if (v.v==='mod') return Z[curBlock()][v.m][1];
  if (v.v==='file') return Z[curBlock()][v.m][12][v.f][0].split('/').pop();
  if (v.v==='mods') return de()?'Ordner':'Folders';
  return {lines:t.lines,tests:t.tests,stories:t.stories,adr:t.adr,docs:t.docs,rel:t.rel,epics:t.epics}[v.v];
}
function crumbsHTML(){
  if (stack.length<2) return '';
  return '<nav class="crumbs" aria-label="'+(de()?'Pfad':'Breadcrumb')+'">'+stack.map(function(v,i){
    var lab = viewTitle(v); if (lab.length>34) lab = lab.slice(0,32)+'…';
    return (i? '<span aria-hidden="true">›</span>':'')+(i===stack.length-1 ? '<span aria-current="page">'+esc(lab)+'</span>' : '<button type="button" data-crumb="'+i+'">'+esc(lab)+'</button>');
  }).join('')+'</nav>';
}
function frame(inner, sheetMode){
  var t=tt();
  var top = '<div class="nav-top">'+(stack.length>1 ? '<button type="button" class="back" data-back>‹ '+esc(t.back)+'</button>' : '<span class="pd-eb">'+esc(stack[0].v==='block' ? L(AUD[BY[stack[0].id].aud].s) : 'GitHub · Epic')+'</span>')+
    (sheetMode ? '<button type="button" class="pd-x" data-close aria-label="'+esc(t.close)+'"><span aria-hidden="true">×</span></button>' : '')+'</div>';
  return '<div class="pd">'+top+crumbsHTML()+inner+'</div>';
}
function numBtn(view, k, v){ return '<button type="button" class="num numb" data-view="'+view+'"><span class="k">'+esc(k)+'</span><span class="v">'+v+'</span><span class="go">'+(de()?'aufklappen ›':'open ›')+'</span></button>'; }
function plannedBox(b){
  var P = PL[b.id], d = de();
  if (!P) return '<p class="pbox">'+(d?'Geplant: keine offenen Aufgaben in den Code-Repositorien zugeordnet.':'Planned: no open issues in the code repositories assigned.')+'</p>';
  var n = P.ng+P.nb;
  return '<div class="pbox"><b>'+(d?'Geplant (Schätzung): rund +':'Planned (estimate): about +')+esc(rund(P.g+P.b))+(d?' Zeilen, aus ':' lines, from ')+n+(d?' offenen Aufgaben':' open issues')+'</b>'+
    '<span><i class="sw pg"></i>'+(d?'nicht begonnen ':'not started ')+P.ng+(P.nu? (d?' (davon '+P.nu+' ohne lesbaren Status)':' (of which '+P.nu+' without readable status)') : '')+'</span>'+
    '<span><i class="sw pb"></i>'+(d?'in Arbeit ':'in progress ')+P.nb+'</span>'+
    '<span class="dmeta">'+(d?'Aufwand S = 2, M = 4, L = 8 Personentage (fehlt = M), × '+PLF+' Zeilen je Personentag.':'Effort S = 2, M = 4, L = 8 person-days (missing = M), × '+PLF+' lines per person-day.')+'</span></div>';
}
function viewBlock(b){
  var m=b.m, t=tt(), sid = 'pdTitle';
  var newOnly = Math.max(m.newL - m.same, 0), nb = newOnly*(1-b.shareX), nx = newOnly*b.shareX, tot = m.same+m.rew+m.gone+nb+nx;
  function pc(v){ return (100*v/tot).toFixed(2)+'%'; }
  var bar = '<div class="bar3" role="img" aria-label="'+esc(t.split)+'"><i class="same" data-css="width:'+pc(m.same)+'"></i><i class="rew" data-css="width:'+pc(m.rew)+'"></i><i class="gone" data-css="width:'+pc(m.gone)+'"></i><i class="b" data-css="width:'+pc(nb)+'"></i><i class="x" data-css="width:'+pc(nx)+'"></i></div>';
  var items = b.items.map(function(i){
    var cls = {b:'ok',o:'open',x:'x',v:'old'}[i[0]];
    return '<li><span class="st '+cls+'">'+esc(t.st[i[0]])+'</span><span>'+esc(lang==='en'?i[3]:i[2])+(i[1]!=='—'?' <span class="w">'+esc(i[1])+'</span>':'')+'</span></li>';
  }).join('');
  var slug = SLUG[b.id], feat = '';
  if (slug){
    feat = LIVE.indexOf(slug)>=0
      ? '<a class="featlink" href="https://understand.oriso.org/features/'+slug+'.html" target="_blank" rel="noopener"><b>'+esc(t.feature)+'</b><span>understand.oriso.org ↗</span></a>'
      : '<div class="featlink wip"><b>'+esc(t.featureWip)+'</b><span>features/'+esc(slug)+'.html</span></div>';
  }
  var cap = capNodeId(b.id);
  if (cap) feat += '<p class="links"><a class="ua" href="'+uaNodeHref(UA.sg, cap)+'" target="_blank" rel="noopener" title="'+esc(cap)+'">'+(de()?'Im Understand-Graph öffnen':'Open in the Understand graph')+' · '+(de()?'Fähigkeit':'Capability')+' ↗</a></p>';
  var nAdr = b.adr.length, nDocs = b.docs.length + b.ua.length, nRel = (REL[b.id]||[]).length, nEp = b.ep.length;
  var nMods = (Z[b.id]||[]).length;
  var rows = [['mods',(de()?'Ordner und Dateien (Karte zoomt hinein)':'Folders and files (map zooms in)'),nMods],['epics',t.epics, nEp ? (fmt(nEp)+' · '+t.openEp(openEpics(b))) : '0'],['adr',t.adr,nAdr],['docs',t.docs,nDocs],['rel',t.rel,nRel]].map(function(r){
    return '<button type="button" class="navrow" data-view="'+r[0]+'"><span>'+esc(r[1])+'</span><span class="c">'+esc(String(r[2]))+'</span></button>';
  }).join('');
  return '<h3 id="'+sid+'" tabindex="-1">'+esc(L(b.t))+'</h3>'+
    '<p class="short">'+esc(L(b.short))+'</p>'+feat+
    '<div class="can"><h4>'+esc(t.can)+' …</h4><ul>'+L(b.can).map(function(c){return '<li>'+esc(c)+'</li>';}).join('')+'</ul></div>'+
    '<p class="before"><b>'+esc(t.before)+':</b> '+esc(L(b.before))+'</p>'+plannedBox(b)+
    '<div class="kv"><h4>'+esc(t.split)+'</h4>'+bar+'</div>'+
    (boardOf(b.id) ? boardPanel(boardOf(b.id))+findingsPanel(boardOf(b.id)) : '')+
    '<div class="nums">'+
      numBtn('lines', t.lines, '<span class="o">'+rund(m.oldL)+'</span><span class="a">→</span>'+rund(m.newL))+
      numBtn('tests', t.tests, '<span class="o">'+fmt(m.oldT)+'</span><span class="a">→</span>'+fmt(m.newT))+
      numBtn('tests', t.testl, '<span class="o">'+rund(m.oldTL)+'</span><span class="a">→</span>'+rund(m.newTL))+
      numBtn('stories', t.stories, fmt(m.st))+
      '<div class="num"><span class="k">'+esc(t.core)+'</span><span class="v" data-css="font-size:12px">'+rund(m.same)+' '+(de()?'unverändert':'unchanged')+' · '+rund(m.rew)+' '+(de()?'umgearbeitet':'reworked')+' · '+rund(m.gone)+' '+(de()?'gelöscht':'deleted')+'</span></div>'+
      '<div class="num"><span class="k">'+esc(t.addshare)+'</span><span class="v">'+Math.round(b.shareX*100)+' %</span></div>'+
    '</div>'+
    '<div class="navrows">'+rows+'</div>'+
    '<div class="kv"><h4>'+esc(t.items)+'</h4><ul class="items">'+items+'</ul></div>';
}
var LIMIT = 30;
function viewLines(b){
  var t=tt(), d=b.d;
  var rows = d.p.map(function(r){ return '<li><a href="'+GH+CODE_REPOS[r[0]]+'/tree/dev/'+r[1]+'" target="_blank" rel="noopener">'+esc(CODE_REPOS[r[0]].replace('ORISO-','')+' · '+shortPath(r[1]))+'</a><span class="c">'+fmt(r[2])+'</span></li>'; }).join('');
  var old = d.o.map(function(r){ return '<li><span>'+esc(CODE_REPOS[r[0]].replace('ORISO-','')+' · '+shortPath(r[1]))+'</span><span class="c">'+fmt(r[2])+'</span></li>'; }).join('');
  return '<h3 id="pdTitle" tabindex="-1">'+esc(t.lines)+' · '+esc(L(b.t))+'</h3>'+
    '<p class="dmeta">'+(de()?'Die größten Ordner nach Zeilen Programmcode heute ('+Math.min(d.p.length,40)+' von '+fmt(d.pn||d.p.length)+'). Jeder Ordner führt zum Quelltext auf GitHub, Zweig dev.':'The largest folders by lines of program code today ('+Math.min(d.p.length,40)+' of '+fmt(d.pn||d.p.length)+'). Each folder opens the source on GitHub, branch dev.')+'</p>'+
    '<div class="dgroup"><h5><span>'+esc(t.today)+'</span><span class="c">'+rund(b.m.newL)+'</span></h5><ul class="dlist">'+rows+'</ul></div>'+
    (old ? '<div class="dgroup"><h5><span>'+esc(t.old)+'</span><span class="c">'+rund(b.m.oldL)+'</span></h5><ul class="dlist">'+old+'</ul></div>' : '');
}
function viewTests(b, v){
  var t=tt(), groups = b.d.t, q = (v.q||'').toLowerCase(), shown = v.n || LIMIT;
  var filtered = groups.map(function(g){
    var files = q ? g[2].filter(function(f){ return (g[1]+'/'+f[0]).toLowerCase().indexOf(q)>=0; }) : g[2];
    return [g[0], g[1], files];
  }).filter(function(g){ return g[2].length; });
  var html = filtered.slice(0, shown).map(function(g){
    var sum = 0; g[2].forEach(function(f){ sum += f[1]; });
    var repo = CODE_REPOS[g[0]];
    return '<div class="dgroup"><h5><a href="'+GH+repo+'/tree/dev/'+g[1]+'" target="_blank" rel="noopener">'+esc(repo.replace('ORISO-','')+' · '+shortPath(g[1]))+'</a><span class="c">'+fmt(sum)+'</span></h5><ul class="dlist">'+
      g[2].map(function(f){ return '<li><a href="'+GH+repo+'/blob/dev/'+g[1]+'/'+f[0]+'" target="_blank" rel="noopener">'+esc(f[0])+'</a><span class="c">'+fmt(f[1])+'</span></li>'; }).join('')+'</ul></div>';
  }).join('');
  var nf = 0; filtered.forEach(function(g){ nf += g[2].length; });
  return '<h3 id="pdTitle" tabindex="-1">'+esc(t.tests)+' · '+esc(L(b.t))+'</h3>'+
    '<p class="dmeta">'+fmt(b.m.newT)+' '+esc(t.tests)+' · '+fmt(nf)+' '+esc(t.files)+' · '+fmt(filtered.length)+' '+esc(t.folders)+'. '+(de()?'Zahl je Datei = Testfälle; jede Datei führt zu GitHub.':'Number per file = test cases; each file opens on GitHub.')+'</p>'+
    '<input type="search" class="search" data-q value="'+esc(v.q||'')+'" placeholder="'+esc(t.search)+'" aria-label="'+esc(t.search)+'">'+html+
    (filtered.length > shown ? '<button type="button" class="more" data-more>'+esc(t.more(filtered.length-shown))+'</button>' : '');
}
function viewStories(b, v){
  var t=tt(), q=(v.q||'').toLowerCase(), shown = v.n || LIMIT;
  var comps = b.d.s.map(function(c){
    var st = q ? c[3].filter(function(s){ return (c[1]+' '+s).toLowerCase().indexOf(q)>=0; }) : c[3];
    return [c[0],c[1],c[2],st];
  }).filter(function(c){ return c[3].length; });
  var html = comps.slice(0, shown).map(function(c){
    var host = 'https://dev.oriso.org/'+SBH[c[0]]+'/?path=/story/';
    return '<div class="dgroup"><h5><a href="'+host+c[2]+'--'+c[3][0]+'" target="_blank" rel="noopener">'+esc(c[1])+'</a><span class="c">'+(c[0]? (de()?'Verwaltung':'Admin') : 'App')+' · '+fmt(c[3].length)+'</span></h5><ul class="dlist">'+
      c[3].map(function(s){ return '<li><a href="'+host+c[2]+'--'+s+'" target="_blank" rel="noopener">'+esc(s.replace(/-/g,' '))+'</a></li>'; }).join('')+'</ul></div>';
  }).join('');
  return '<h3 id="pdTitle" tabindex="-1">'+esc(t.stories)+' · '+esc(L(b.t))+'</h3>'+
    '<p class="dmeta">'+fmt(b.m.st)+' '+esc(t.stories)+' · '+fmt(comps.length)+' '+esc(t.comps)+'. '+(de()?'Aus den veröffentlichten Storybook-Verzeichnissen; jede Ansicht öffnet Storybook.':'From the published Storybook indexes; each view opens Storybook.')+'</p>'+
    (b.d.s.length ? '<input type="search" class="search" data-q value="'+esc(v.q||'')+'" placeholder="'+esc(t.search)+'" aria-label="'+esc(t.search)+'">' : '')+html+
    (comps.length > shown ? '<button type="button" class="more" data-more>'+esc(t.more(comps.length-shown))+'</button>' : '');
}
function viewAdr(b){
  var t=tt();
  var rows = b.adr.map(function(n){
    var id='ADR-'+('00'+n).slice(-3);
    return n<=ADR_LIVE ? '<li><a href="https://docs.oriso.org/decisions/adr-'+('00'+n).slice(-3)+'/" target="_blank" rel="noopener">'+esc(id+' '+L2(ADRT[n]))+'</a></li>'
                       : '<li><span>'+esc(id+' '+L2(ADRT[n]))+'</span><span class="c">'+esc(t.adrOff)+'</span></li>';
  }).join('');
  return '<h3 id="pdTitle" tabindex="-1">'+esc(t.adr)+' · '+esc(L(b.t))+'</h3>'+
    (rows ? '<ul class="dlist">'+rows+'</ul>' : '<p class="dmeta">'+(de()?'Keine eigene Entscheidung zugeordnet.':'No decision assigned.')+'</p>')+
    '<p class="dmeta"><a href="https://docs.oriso.org/decisions/" target="_blank" rel="noopener">'+(de()?'Alle Architekturentscheidungen':'All architecture decisions')+'</a></p>';
}
function viewDocs(b){
  var t=tt(), slug=SLUG[b.id];
  var rows = '';
  if (slug) rows += LIVE.indexOf(slug)>=0 ? '<li><a href="https://understand.oriso.org/features/'+slug+'.html" target="_blank" rel="noopener">'+esc(t.feature)+'</a><span class="c">understand</span></li>'
                                          : '<li><span>'+esc(t.featureWip)+'</span><span class="c">'+(de()?'in Arbeit':'in progress')+'</span></li>';
  b.docs.forEach(function(d){ rows += '<li><a href="https://docs.oriso.org/'+d[0]+'/" target="_blank" rel="noopener">'+esc(de()?d[1]:d[2])+'</a><span class="c">docs</span></li>'; });
  var ua = b.ua.map(function(u){ var r=UA[u[0]], id = u[1] ? REPOID[u[0]]+'::'+u[1] : r.n;
    return '<li><a href="'+(u[1] ? uaNodeHref(r, id) : r.u)+'" target="_blank" rel="noopener" title="'+esc(id)+'">'+esc(r.n+(u[1]?' · '+u[2]:''))+'</a><span class="c">'+esc(u[1]?u[1].split(':')[0]:'repo')+'</span></li>'; }).join('');
  return '<h3 id="pdTitle" tabindex="-1">'+esc(t.docs)+' · '+esc(L(b.t))+'</h3>'+
    '<div class="dgroup"><h5><span>'+(de()?'Beschreibungen':'Descriptions')+'</span></h5><ul class="dlist">'+(rows||'<li><span class="dmeta">—</span></li>')+'</ul></div>'+
    (ua ? '<div class="dgroup"><h5><span>'+esc(t.graph)+'</span></h5><ul class="dlist">'+ua+'</ul><p class="dmeta">'+(de()?'Der Graph öffnet das Dashboard des Repositoriums; die Knoten-ID steht im Tooltip.':'The graph opens the repository dashboard; the node ID is in the tooltip.')+'</p></div>' : '');
}
function viewRel(b){
  var t=tt();
  var rows = (REL[b.id]||[]).map(function(r){ return '<li><button type="button" class="more" data-css="border-style:solid" data-goto="'+r[0]+'">'+esc(L(BY[r[0]].t))+'</button><span class="c">'+fmt(r[1])+'</span></li>'; }).join('');
  return '<h3 id="pdTitle" tabindex="-1">'+esc(t.rel)+' · '+esc(L(b.t))+'</h3>'+
    '<p class="dmeta">'+(de()?'Zahl = Importe und Aufrufe zwischen den Dateien beider Fähigkeiten im Understand-Graphen. Die vier stärksten sind auf der Karte rot umrandet.':'Number = imports and calls between the files of both capabilities in the Understand graph. The four strongest are outlined on the map.')+'</p>'+
    (rows ? '<ul class="dlist" data-css="gap:6px">'+rows+'</ul>' : '<p class="dmeta">—</p>');
}
function epicCard(i){
  var e=EP[i], s=stageOf(e), t=tt();
  var pct = e.tot ? Math.round(100*e.done/e.tot) : (e.s==='c'?100:0);
  return '<div class="epicw"><button type="button" class="epic" data-epic="'+i+'"><span class="et">'+esc(e.t)+'</span>'+
    '<span class="em">'+stagePill(s)+'<span class="k">'+esc(EPR[e.r].replace('ORISO-',''))+' #'+e.n+'</span><span>'+esc(t.subs)+' '+e.done+'/'+e.tot+'</span>'+(currentReleaseOf(e)?'<span>'+esc(currentReleaseOf(e))+'</span>':'')+'</span>'+
    '<span class="prog" aria-hidden="true"><i data-css="width:'+pct+'%"></i></span></button>'+badges('epic:'+i)+'</div>';
}
function viewEpics(b){
  var t=tt();
  var list = b.ep.slice().sort(function(a,c){ return ['idea','work','near','done'].indexOf(stageOf(EP[a])) - ['idea','work','near','done'].indexOf(stageOf(EP[c])); });
  return '<h3 id="pdTitle" tabindex="-1">'+esc(t.epics)+' · '+esc(L(b.t))+'</h3>'+
    moveButton({kind:'block', id:b.id})+
    (list.length ? '<div class="elist">'+list.map(epicCard).join('')+'</div>' : '<p class="dmeta">'+esc(t.noEp)+'</p>')+
    relIssues(b);
}
function relIssues(b){
  var r = MEAS.reliss[b.id]; if (!r || !r.length) return '';
  return '<div class="dgroup"><h5><span>'+esc(tt().relIss)+'</span><span class="c">'+r.length+'</span></h5><ul class="dlist">'+r.map(function(x){
    return '<li><a href="'+GH+x[0]+'/issues/'+x[1]+'" target="_blank" rel="noopener">'+esc(x[2])+'</a><span class="c">'+esc(x[0].replace('ORISO-',''))+' #'+x[1]+'</span></li>'; }).join('')+'</ul></div>';
}
/* Gate-Schrittanzeige (ORISO-Docs#211): acht Schritte P1-P4, R1-R4; der aktuelle ist hervorgehoben, davor liegende sind gefüllt. */
function gateInfo(name){ var out = null; BoardAgg.GATES.forEach(function(g){ if (g.name===name) out = g; }); return out; }
function gateTitle(g){ return g.name+': '+L(g.criteria); }
function gateStepsHTML(x){
  if (!x.gate) return '';
  var g = gateInfo(x.gate), t = tt();
  if (!g) return '<span class="gsteps gunk"><span class="gcode">'+esc(x.gate)+'</span></span>';
  var dots = BoardAgg.GATES.map(function(h){ return '<i class="gs '+(h.step<g.step?'on':h.step===g.step?'cur':'')+'" data-phase="'+h.phase+'"></i>'; }).join('');
  return '<span class="gsteps" role="img" aria-label="'+esc(t.gStep(g.step, g.name))+'" title="'+esc(gateTitle(g))+'"><span class="gdots" aria-hidden="true">'+dots+'</span><span class="gcode" aria-hidden="true">'+esc(g.name)+'</span></span>';
}
function gateFilterHTML(ev){
  var t = tt();
  var opts = [['all', t.gAll], ['none', t.gNone]].concat(BoardAgg.GATES.map(function(g){ return [g.name, g.name]; })).map(function(o){
    return '<option value="'+esc(o[0])+'"'+(ev.gate===o[0]?' selected':'')+'>'+esc(o[1])+' ('+fmt(ev.gateCounts[o[0]])+')</option>'; }).join('');
  var legend = BoardAgg.GATES.map(function(g){ return '<li><b>'+esc(g.name)+'</b> '+esc(L(g.criteria))+'</li>'; }).join('');
  return '<div class="gfilter"><label for="gsel">'+esc(t.gate)+'</label><select id="gsel" data-gfilter>'+opts+'</select></div>'+
    '<details class="glegend"><summary>'+esc(t.gLegend)+'</summary><ol>'+legend+'</ol></details>';
}
var FILTER_KEY = {all:'fAll', accepted:'fAccepted', dev:'fDev', staging:'fStaging', open:'fOpen'};
/* Seitenansicht eines Epics mit Board-Stand (ORISO-Docs#206): Teilaufgaben nach Status, Filter, Statusleiste. */
function epicBoardHTML(v){
  var t = tt(), ev = BOARD && BoardAgg.epicView(VIEWB || MEAS.board, MEAS.epics, v.i, v.f, v.g);
  if (!ev || (!ev.total && !ev.privateCount)) return '';
  var jf = JOBS ? MapJobs.applyFilter(ev, JOBS, v.j, v.i) : null; if (jf) ev = jf.ev; /* Jobs-Filter (#216): schneidet die Gruppen zu */
  var chips = BoardAgg.FILTERS.map(function(f){
    return '<button type="button" class="tog efilt" data-efilter="'+f+'" aria-pressed="'+(ev.filter===f)+'"><span class="tl">'+esc(t[FILTER_KEY[f]])+'</span> <span class="c">'+fmt(ev.filterCounts[f])+'</span></button>';
  }).join('');
  var legend = ev.segments.filter(function(g){ return g.count>0; }).map(function(g){
    return '<li><i class="sw sseg" data-status="'+esc(g.status)+'" data-group="'+g.group+'"></i><span class="sn">'+esc(L2(STATUS_L[g.status]))+'</span><span class="sc">'+fmt(g.count)+'</span></li>';
  }).join('');
  var groups = ev.groups.map(function(g){
    var name = g.status ? L2(STATUS_L[g.status]) : t.notOnBoard;
    return '<div class="dgroup egroup"><h5><span>'+(g.status ? '<i class="sw sseg" data-status="'+esc(g.status)+'" data-group="'+g.group+'"></i> ' : '')+esc(name)+'</span><span class="c">'+fmt(g.count)+'</span></h5><ul class="dlist">'+g.items.map(function(x){
      /* Nur https-Links (wie bei den Befunden): alles andere aus board.json wird Text, nie ein href. */
      var link = /^https:\/\//.test(x.url||'') ? '<a href="'+esc(x.url)+'" target="_blank" rel="noopener">'+esc(x.title)+'</a>' : '<span class="nolink">'+esc(x.title)+'</span>';
      return '<li'+(x.gate?' class="hasgate"':'')+'>'+link+'<span class="c">'+(x.state==='CLOSED'?'✓ ':'○ ')+esc(x.repository.replace('ORISO-',''))+' #'+x.number+'</span>'+gateStepsHTML(x)+badges('item:'+x.repository+'#'+x.number)+'</li>';
    }).join('')+'</ul></div>';
  }).join('');
  return '<div class="estat" role="group" aria-label="'+esc(t.onBoardBar)+'"><h4>'+esc(t.onBoardBar)+'</h4>'+sbarHTML(ev,'big')+'<ul class="slist">'+legend+'</ul></div>'+
    '<div class="efilters" role="group" aria-label="'+esc(t.filterBy)+'">'+chips+'</div>'+
    (ev.gateAvailable ? gateFilterHTML(ev) : '')+
    (jf ? MapJobs.filterHTML(jf, lang) : '')+
    (groups || '<p class="dmeta">'+esc(t.noneShown)+'</p>')+
    (ev.privateCount ? '<p class="dmeta epriv">'+esc(t.privSubs(ev.privateCount))+'</p>' : '');
}
function viewEpic(v){
  var i=v.i, e=EP[i], t=tt(), s=stageOf(e);
  var board = epicBoardHTML(v);
  var subs = board ? '' : e.subs.map(function(x){ return '<li><a href="'+GH+EPR[x[0]]+'/issues/'+x[1]+'" target="_blank" rel="noopener">'+esc(x[2])+'</a><span class="c">'+(x[3]==='c'?'✓ ':'○ ')+esc(EPR[x[0]].replace('ORISO-',''))+' #'+x[1]+'</span></li>'; }).join('');
  var pct = e.tot ? Math.round(100*e.done/e.tot) : 0;
  return '<h3 id="pdTitle" tabindex="-1">'+esc(e.t)+'</h3>'+
    '<div class="em" data-css="display:flex;flex-wrap:wrap;gap:6px 12px;font-size:12.5px;color:var(--ink-2)">'+stagePill(s)+
      '<span>'+esc(t.subs)+' '+e.done+'/'+e.tot+' ('+pct+' %)</span>'+(e.pr?'<span>'+esc(t.prio)+': '+esc(e.pr)+'</span>':'')+(e.ef?'<span>'+esc(t.effort)+': '+esc(e.ef)+'</span>':'')+(currentReleaseOf(e)?'<span>'+esc(t.release)+': '+esc(currentReleaseOf(e))+'</span>':'')+'</div>'+
    '<div class="prog"><i data-css="width:'+pct+'%"></i></div>'+
    '<p><a href="'+GH+EPR[e.r]+'/issues/'+e.n+'" target="_blank" rel="noopener">'+esc(t.openGh)+' · '+esc(EPR[e.r])+' #'+e.n+' ↗</a></p>'+
    moveButton({kind:'epic', i:i})+
    (badges('epic:'+i) ? '<p class="wkrow">'+badges('epic:'+i)+'</p>' : '')+
    board+
    (subs ? '<div class="dgroup"><h5><span>'+esc(t.subs)+'</span><span class="c">'+e.subs.length+'</span></h5><ul class="dlist">'+subs+'</ul></div>' : '')+
    (!board && e.hid ? '<p class="dmeta">'+esc(t.hiddenSubs(e.hid))+'</p>' : '');
}
function ghPath(z, f){
  var pre = f[1]===1 ? (z[3]||z[2]) : z[2];
  return pre ? pre+'/'+f[0] : f[0];
}
var UAK = ['fe','ad','us','ts','as','ct'];
/* Knoten-ID wie im Understand-Graphen: Fähigkeit capability:<slug>, Ordner <repo>::folder:<dir>, Datei <repo>::file:<pfad>. */
function uaNodeHref(r, nodeId){ return r.u + (r.u.indexOf('?')<0 ? '?' : '&') + 'node=' + encodeURIComponent(nodeId); }
function capNodeId(blockId){ return blockId==='base' ? 'capability:shared' : SLUG[blockId] ? 'capability:'+SLUG[blockId] : null; }
function graphLink(z, path, inline, dir){
  var r = UA[UAK[z[0]]], id = path ? CODE_REPOS[z[0]]+'::file:'+path : dir ? CODE_REPOS[z[0]]+'::folder:'+dir : '';
  var a = '<a class="ua" href="'+(id ? uaNodeHref(r, id) : r.u)+'" target="_blank" rel="noopener" title="'+esc(id||r.n)+'">'+(de()?'Im Understand-Graph öffnen':'Open in the Understand graph')+' · '+esc(r.n)+' ↗</a>';
  return inline ? a : '<p class="links">'+a+'</p>';
}
function wasIst(txt){ return '<div class="wasist"><h4>'+(de()?'Was ist das?':'What is this?')+'</h4>'+txt+'</div>'; }
function modDescHTML(b, mi){
  var bi = bidx(b.id), md = DS.md[bi+'|'+mi], z = Z[b.id][mi], d = de();
  if (!md) return wasIst('<p class="dmeta">'+(d?'Für diesen Ordner gibt es im Understand-Graph noch keine Beschreibung.':'The Understand graph has no description for this folder yet.')+'</p>');
  var f = z[12][md[0]];
  return wasIst('<p><b>'+esc(f[0].split('/').pop())+':</b> <span lang="en">'+esc(DS.fd[bi+'|'+mi+'|'+md[0]])+'</span></p><p class="dmeta">'+(d?'Beschreibung der größten beschriebenen Datei; ':'Description of the largest described file; ')+md[1]+(d?' von ':' of ')+z[12].length+(d?' Dateien sind im Graph beschrieben (englisch).':' files are described in the graph.')+'</p>');
}
function fileDescHTML(b, mi, fi){
  var s = DS.fd[bidx(b.id)+'|'+mi+'|'+fi], d = de();
  return wasIst(s ? '<p><span lang="en">'+esc(s)+'</span></p><p class="dmeta">'+(d?'Aus dem Understand-Graph (englisch).':'From the Understand graph.')+'</p>' : '<p class="dmeta">'+(d?'Für diese Datei gibt es im Understand-Graph noch keine Beschreibung.':'The Understand graph has no description for this file yet.')+'</p>');
}
function relButtons(list){
  return '<div class="relb">'+list.map(function(x){ return '<button type="button" data-jump="'+x[0]+'">'+esc(x[1])+'<small>'+fmt(x[2])+'</small></button>'; }).join('')+'</div>';
}
function modRelHTML(b, mi){
  var r = DS.me[bidx(b.id)+'|'+mi]; if (!r || !r.length) return '';
  return '<div class="kv"><h4>'+(de()?'Hängt zusammen mit (Importe und Aufrufe)':'Connected with (imports and calls)')+'</h4>'+relButtons(r.map(function(x){
    var bid = DS.bids[x[0]], z = Z[bid][x[1]];
    return [bid+'|'+x[1], (bid===b.id ? '' : L(BY[bid].t)+' · ')+z[1], x[2]]; }))+'</div>';
}
function fileRelHTML(b, mi, fi){
  var r = DS.fe[bidx(b.id)+'|'+mi+'|'+fi]; if (!r || !r.length) return '';
  return '<div class="kv"><h4>'+(de()?'Hängt zusammen mit (Importe und Aufrufe)':'Connected with (imports and calls)')+'</h4>'+relButtons(r.map(function(x){
    var bid = DS.bids[x[0]], z = Z[bid][x[1]];
    return [bid+'|'+x[1]+'|'+x[2], z[12][x[2]][0].split('/').pop()+' · '+z[1], x[3]]; }))+'</div>';
}
function jumpTo(key){
  var p = key.split('|'), bid = p[0];
  stack = [{v:'block', id:bid}, {v:'mod', m:+p[1]}];
  if (p.length>2) stack.push({v:'file', m:+p[1], f:+p[2]});
  renderView(); focusTitle();
}
function viewMods(b, v){
  var mods = Z[b.id]||[], q=(v.q||'').toLowerCase(), shown=v.n||LIMIT;
  var list = mods.map(function(z,i){ return [z,i]; }).filter(function(x){ return !q || modName(x[0]).toLowerCase().indexOf(q)>=0; });
  return '<h3 id="pdTitle" tabindex="-1">'+(de()?'Ordner':'Folders')+' · '+esc(L(b.t))+'</h3>'+
    '<p class="dmeta">'+(de()?'Alle Ordner dieser Fähigkeit, nach Fläche. Ein Klick zoomt die Karte in den Ordner.':'All folders of this capability, by area. A click zooms the map into the folder.')+'</p>'+
    '<input type="search" class="search" data-q value="'+esc(v.q||'')+'" placeholder="'+esc(tt().search)+'" aria-label="'+esc(tt().search)+'">'+
    '<div class="navrows">'+list.slice(0,shown).map(function(x){ var z=x[0];
      return '<button type="button" class="navrow" data-mod="'+x[1]+'"><span>'+esc(modName(z))+'</span><span class="c">'+(z[4]?rund(z[4]):(de()?'gelöscht ':'deleted ')+rund(z[5]))+'</span></button>'; }).join('')+'</div>'+
    (list.length>shown ? '<button type="button" class="more" data-more>'+esc(tt().more(list.length-shown))+'</button>' : '');
}
function viewMod(b, v){
  var z = Z[b.id][v.m], t=tt(), q=(v.q||'').toLowerCase(), shown=v.n||LIMIT, repo=CODE_REPOS[z[0]];
  var files = z[12].map(function(f,i){ return [f,i]; }).filter(function(x){ return !q || x[0][0].toLowerCase().indexOf(q)>=0; });
  function row(x){ var f=x[0], nm=f[0];
    var kind = f[1]===1 ? (de()?'Test':'test') : f[1]===2 ? (de()?'gelöscht':'deleted') : (f[3]||f[4] ? (de()?'vorher da':'existed') : (de()?'neu':'new'));
    var num = f[1]===1 ? fmt(f[4]||0)+(de()?' Tests':' tests') : rund(f[2])+(de()?' Z.':' l.');
    var link = f[1]===2 ? '<span>'+esc(nm)+'</span>' : '<a href="'+GH+repo+'/blob/dev/'+ghPath(z,f)+'" target="_blank" rel="noopener">'+esc(nm)+'</a>';
    return '<li>'+link+'<span class="c">'+esc(kind+' · '+num)+'</span></li>'; }
  return '<h3 id="pdTitle" tabindex="-1">'+esc(modName(z))+'</h3>'+
    (z[2] && z[4] ? '<p><a href="'+GH+repo+'/tree/dev/'+z[2]+'" target="_blank" rel="noopener">'+(de()?'Ordner auf GitHub':'Folder on GitHub')+' ↗</a></p>' : '')+
    '<div class="nums">'+
      '<div class="num"><span class="k">'+esc(t.lines)+'</span><span class="v"><span class="o">'+rund(z[5])+'</span><span class="a">→</span>'+rund(z[4])+'</span></div>'+
      '<div class="num"><span class="k">'+esc(t.tests)+'</span><span class="v">'+fmt(z[11])+'</span></div>'+
      '<div class="num"><span class="k">'+esc(t.core)+'</span><span class="v" data-css="font-size:12px">'+rund(z[6])+' '+(de()?'unverändert':'unchanged')+' · '+rund(z[7])+' '+(de()?'umgearbeitet':'reworked')+' · '+rund(z[8])+' '+(de()?'gelöscht':'deleted')+'</span></div>'+
      '<div class="num"><span class="k">'+esc(t.testl)+'</span><span class="v"><span class="o">'+rund(z[10])+'</span><span class="a">→</span>'+rund(z[9])+'</span></div>'+
    '</div>'+
    modDescHTML(b, v.m)+modRelHTML(b, v.m)+graphLink(z, '', false, z[2] && z[4] ? z[2] : '')+
    '<p class="dmeta">'+fmt(z[12].length)+(de()?' Dateien. Beauftragt / zusätzlich ist je Fähigkeit geschätzt, nicht je Datei.':' files. Commissioned / additional is estimated per capability, not per file.')+'</p>'+
    '<input type="search" class="search" data-q value="'+esc(v.q||'')+'" placeholder="'+esc(t.search)+'" aria-label="'+esc(t.search)+'">'+
    '<ul class="dlist">'+files.slice(0,shown).map(row).join('')+'</ul>'+
    (files.length>shown ? '<button type="button" class="more" data-more>'+esc(t.more(files.length-shown))+'</button>' : '');
}
function viewFile(b, v){
  var z = Z[b.id][v.m], f = z[12][v.f], repo = CODE_REPOS[z[0]], d=de();
  var kind = f[1]===1 ? (d?'Testdatei':'Test file') : f[1]===2 ? (d?'Gelöscht oder ersetzt (nur im Ausgangscode)':'Deleted or replaced (starting code only)') : (f[3]||f[4] ? (d?'Aus dem Ausgangscode, weitergeführt':'From the starting code, carried on') : (d?'Neu':'New'));
  var rows = [];
  if (f[1]===0){ rows.push([d?'Zeilen heute':'Lines today', fmt(f[2])]); if (f[3]||f[4]) rows.push([d?'Zeilen vorher (unverändert / umgearbeitet)':'Lines before (unchanged / reworked)', fmt(f[3]||0)+' / '+fmt(f[4]||0)]); }
  if (f[1]===1){ rows.push([d?'Testfälle':'Test cases', fmt(f[4]||0)]); rows.push([d?'Testzeilen':'Test lines', fmt(f[2])]); if (f[3]) rows.push([d?'davon schon vorher da':'of which existed before', fmt(f[3])]); }
  if (f[1]===2) rows.push([d?'Zeilen im Ausgangscode':'Lines in the starting code', fmt(f[2])]);
  return '<h3 id="pdTitle" tabindex="-1">'+esc(f[0].split('/').pop())+'</h3>'+
    '<p class="dmeta">'+esc(kind)+' · '+esc(modName(z))+'</p>'+
    '<ul class="dlist">'+rows.map(function(r){ return '<li><span>'+esc(r[0])+'</span><span class="c">'+esc(r[1])+'</span></li>'; }).join('')+'</ul>'+
    fileDescHTML(b, v.m, v.f)+fileRelHTML(b, v.m, v.f)+
    (f[1]!==2 ? '<p class="links"><a href="'+GH+repo+'/blob/dev/'+ghPath(z,f)+'" target="_blank" rel="noopener">'+(d?'Auf GitHub öffnen':'Open on GitHub')+' ↗</a>'+graphLink(z, ghPath(z,f), true)+'</p>' : '');
}
/* "Gesundheitsprüfung senden" (ORISO-Docs#220): nur in der Ansicht Health, für den geöffneten Bereich (Fähigkeit, Ordner, Datei).
   Der Befehl je Bereich kommt aus MapViews.healthCheck; eine Datei wird als ihr Ordner geprüft. */
function hcheckScopes(v, b){
  var cap = b && capNodeId(b.id); if (!cap) return null;
  cap = cap.slice('capability:'.length);
  if (v.v==='block'){
    var seen = {}, list = [];
    (Z[b.id]||[]).forEach(function(z){ var r = CODE_REPOS[z[0]]; if (r && !seen[r]){ seen[r] = 1; list.push(r); } });
    return list.sort().map(function(r){ return {capability:cap, repo:r, path:null, kind:'capability'}; });
  }
  var z = Z[b.id] && Z[b.id][v.m]; if (!z) return null;
  var repo = CODE_REPOS[z[0]];
  if (v.v==='mod') return [{capability:cap, repo:repo, path: z[2] ? String(z[2]).replace(/\/+$/, '') || null : null, kind:'folder'}];
  var f = z[12][v.f]; if (!f || f[1]===2) return null;
  var p = ghPath(z, f), i = p.lastIndexOf('/');
  return [{capability:cap, repo:repo, path: i<0 ? null : p.slice(0, i), kind:'file', file: p.slice(i+1)}];
}
function hcheckCtx(v, b){
  if (view !== 'health') return null;
  try { return hcheckScopes(v, b); } catch (e) { return null; }
}
function hcheckHTML(v, b){
  if (view !== 'health') return '';
  try { return MapViews.healthCheck(hcheckScopes(v, b), lang); } catch (e) { return ''; }
}
/* Fügt HTML hinter den ersten Titel (h3) der Ansicht ein; ohne Titel davor. */
function afterTitle(inner, html){
  if (!html) return inner;
  var i = inner.indexOf('</h3>');
  return i < 0 ? html + inner : inner.slice(0, i + 5) + html + inner.slice(i + 5);
}
function renderView(){
  if (!stack.length){ renderEmpty(); syncMap(); syncHash(false); return; }
  var v = stack[stack.length-1], b = BY[curBlock() || ''], inner;
  if (v.v==='block') inner = viewBlock(BY[v.id]);
  else if (v.v==='lines') inner = viewLines(b);
  else if (v.v==='tests') inner = viewTests(b, v);
  else if (v.v==='stories') inner = viewStories(b, v);
  else if (v.v==='adr') inner = viewAdr(b);
  else if (v.v==='docs') inner = viewDocs(b);
  else if (v.v==='rel') inner = viewRel(b);
  else if (v.v==='epics') inner = viewEpics(b);
  else if (v.v==='epic') inner = viewEpic(v);
  else if (v.v==='mods') inner = viewMods(b, v);
  else if (v.v==='mod') inner = viewMod(b, v);
  else if (v.v==='file') inner = viewFile(b, v);
  if (v.v==='block') inner = MapViews.VIEWS[view].panel(BY[v.id], lang, capNodeId(v.id), {hcheck: hcheckCtx(v, b)}) + inner;
  else if (v.v==='mod' || v.v==='file') inner = afterTitle(inner, hcheckHTML(v, b));
  var sheetMode = useSheet();
  var host = sheetMode ? sheetBody : panel;
  host.innerHTML = frame(inner, sheetMode);
  wire(host);
  if (!sheetMode) panel.scrollTop = 0; else document.getElementById('sheetIn').scrollTop = 0;
  syncMap(); syncHash(false);
}
function focusTitle(){ var h = (useSheet()? sheetBody : panel).querySelector('#pdTitle'); if (h) h.focus({preventScroll:true}); }
function push(v){ stack.push(v); renderView(); focusTitle(); }
function back(){
  if (stack.length>1){ stack.pop(); renderView(); focusTitle(); }
  else if (stack.length===1 && !useSheet()){ hlBlock = curBlock(); stack = []; renderView(); }
}
function wire(root){
  Array.prototype.forEach.call(root.querySelectorAll('[data-view]'), function(e){ e.addEventListener('click', function(){ push({v:e.getAttribute('data-view')}); }); });
  Array.prototype.forEach.call(root.querySelectorAll('[data-epic]'), function(e){ e.addEventListener('click', function(){ push({v:'epic', i:+e.getAttribute('data-epic')}); }); if (canPlan()) dragSource(e, {kind:'epic', i:+e.getAttribute('data-epic')}); });
  Array.prototype.forEach.call(root.querySelectorAll('[data-move]'), function(e){ e.addEventListener('click', function(){ var k = e.getAttribute('data-move'), id = e.getAttribute('data-moveid'); openMove(k==='epic' ? {kind:'epic', i:+id} : {kind:'block', id:id}); }); });
  Array.prototype.forEach.call(root.querySelectorAll('[data-goto]'), function(e){ e.addEventListener('click', function(){ push({v:'block', id:e.getAttribute('data-goto')}); }); });
  Array.prototype.forEach.call(root.querySelectorAll('[data-jump]'), function(e){ e.addEventListener('click', function(){ jumpTo(e.getAttribute('data-jump')); }); });
  Array.prototype.forEach.call(root.querySelectorAll('.navrow[data-mod]'), function(e){ e.addEventListener('click', function(){ openMod(+e.getAttribute('data-mod')); }); });
  Array.prototype.forEach.call(root.querySelectorAll('[data-crumb]'), function(e){ e.addEventListener('click', function(){ stack = stack.slice(0, +e.getAttribute('data-crumb')+1); renderView(); focusTitle(); }); });
  var chips = Array.prototype.slice.call(root.querySelectorAll('[data-efilter]'));
  chips.forEach(function(c, n){
    c.addEventListener('click', function(){ var v=stack[stack.length-1]; v.f=c.getAttribute('data-efilter'); renderView(); var h=(useSheet()?sheetBody:panel).querySelector('[data-efilter="'+v.f+'"]'); if (h) h.focus({preventScroll:true}); });
    c.addEventListener('keydown', function(e){
      var to = e.key==='ArrowRight'||e.key==='ArrowDown' ? (n+1)%chips.length : e.key==='ArrowLeft'||e.key==='ArrowUp' ? (n+chips.length-1)%chips.length : e.key==='Home' ? 0 : e.key==='End' ? chips.length-1 : -1;
      if (to>=0){ e.preventDefault(); chips[to].focus(); }
    });
  });
  var gs = root.querySelector('[data-gfilter]');
  if (gs) gs.addEventListener('change', function(){ var v=stack[stack.length-1]; v.g=gs.value; renderView(); var h=(useSheet()?sheetBody:panel).querySelector('[data-gfilter]'); if (h) h.focus({preventScroll:true}); });
  Array.prototype.forEach.call(root.querySelectorAll('[data-jfilter]'), function(c){
    c.addEventListener('click', function(){ var v=stack[stack.length-1]; v.j=c.getAttribute('data-jfilter'); renderView(); var h=(useSheet()?sheetBody:panel).querySelector('[data-jfilter="'+v.j+'"]'); if (h) h.focus({preventScroll:true}); });
  });
  var bk = root.querySelector('[data-back]'); if (bk) bk.addEventListener('click', back);
  var x = root.querySelector('[data-close]'); if (x) x.addEventListener('click', function(){ sheet.close(); });
  var more = root.querySelector('[data-more]'); if (more) more.addEventListener('click', function(){ var v=stack[stack.length-1]; v.n=(v.n||LIMIT)+LIMIT; renderView(); });
  var q = root.querySelector('[data-q]');
  if (q) q.addEventListener('input', function(){ var v=stack[stack.length-1]; v.q=q.value; v.n=LIMIT; var pos=q.selectionStart; renderView(); var q2=(useSheet()?sheetBody:panel).querySelector('[data-q]'); if (q2){ q2.focus(); try{ q2.setSelectionRange(pos,pos); }catch(e){} } });
}
/* Ein direkt geöffnetes Epic schließt mit Esc ganz (Seitenansicht leeren, Bottom-Sheet zu); Zurück und Alt+← gehen schrittweise. */
function closeEpic(){
  stack = [];
  if (sheet.open) sheet.close(); else { renderView(); if (opener && document.contains(opener)) opener.focus(); }
}
function onKey(e){
  var top = stack[stack.length-1];
  if (e.key==='Escape' && top && top.direct){ e.preventDefault(); e.stopPropagation(); closeEpic(); return; }
  if ((e.key==='Escape' || (e.altKey && e.key==='ArrowLeft')) && (stack.length>1 || (stack.length===1 && !useSheet()))){ e.preventDefault(); e.stopPropagation(); back(); }
}
panel.addEventListener('keydown', onKey);
sheet.addEventListener('keydown', onKey);
sheet.addEventListener('cancel', function(e){ var top = stack[stack.length-1]; if (top && top.direct) return; if (stack.length>1){ e.preventDefault(); back(); } });
function renderEmpty(){
  panel.innerHTML = '<div class="empty"><p>'+tt().empty+'</p>'+rampLegend()+'</div>';
}
function focusZbar(){ var c = document.getElementById('zbar').querySelector('[aria-current]'); if (c){ c.setAttribute('tabindex','-1'); c.focus({preventScroll:true}); } }
function openBlock(id, btn, fromMap){
  if (btn) opener = btn;
  stack = [{v:'block', id:id}];
  renderView();
  if (useSheet()){
    if (fromMap){ focusZbar(); return; }
    if (!sheet.open){ if (sheet.showModal) sheet.showModal(); else sheet.setAttribute('open',''); }
  }
  focusTitle();
}
function openMod(i){
  var st = mapState(); stack = stack.slice(0, st.bi+1).concat([{v:'mod', m:i}]);
  renderView(); if (useSheet()) focusZbar(); else focusTitle();
}
function openFile(mi, fi){
  var st = mapState(); stack = stack.slice(0, st.mi+1).concat([{v:'file', m:mi, f:fi}]);
  renderView();
  if (useSheet() && !sheet.open) sheet.showModal();
  focusTitle();
}
function openEpicDirect(i, btn){
  var e = EP[i]; if (btn) opener = btn;
  stack = e.b ? [{v:'block',id:e.b},{v:'epics'},{v:'epic',i:i,direct:1}] : [{v:'epic',i:i,root:1,direct:1}];
  if (!e.b){ /* übergreifendes Epic ohne Block: eigene kleine Ansicht */ }
  if (useSheet()){ renderView(); if (!sheet.open) sheet.showModal(); focusTitle(); }
  else { renderView(); focusTitle(); document.getElementById('karte').scrollIntoView({behavior:reduce?'auto':'smooth'}); }
}
sheet.addEventListener('click', function(e){ if (e.target===sheet) sheet.close(); });
/* Wischen nach unten schließt das Bottom-Sheet, solange der Inhalt ganz oben steht. */
(function(){
  var sy = null, sin = document.getElementById('sheetIn');
  sin.addEventListener('touchstart', function(e){ sy = (e.touches.length===1 && sin.scrollTop<=0) ? e.touches[0].clientY : null; }, {passive:true});
  sin.addEventListener('touchend', function(e){ if (sy!==null && e.changedTouches.length && e.changedTouches[0].clientY - sy > 80){ var top = stack[stack.length-1]; if (top && top.direct) stack = []; sheet.close(); } sy = null; }, {passive:true});
})();
sheet.addEventListener('close', function(){ if (opener && document.contains(opener)) opener.focus(); if (!useSheet()) return; });
window.matchMedia('(max-width:980px)').addEventListener('change', function(e){ if (!e.matches && sheet.open) sheet.close(); renderView(); if (typeof drawPlanned==='function') drawPlanned(); });

/* ───────── Geplante Arbeit ───────── */
function drawPlanned(){
  var t=tt();
  var f = document.getElementById('stageFilters'); f.innerHTML = '<span class="clab">'+esc(t.showStage)+'</span>';
  ['idea','work','near','done'].forEach(function(s){
    var n = EP.filter(function(e){ return stageOf(e)===s; }).length;
    var b = el('button','tog'); b.type='button'; b.setAttribute('aria-pressed', stageOn[s]?'true':'false');
    b.innerHTML = stagePill(s)+'<span class="tl">'+fmt(n)+'</span>';
    b.addEventListener('click', function(){ stageOn[s]=!stageOn[s]; drawPlanned(); });
    f.appendChild(b);
  });
  var g = document.getElementById('pgrid'); g.innerHTML='';
  var groups = B.map(function(b){ return [b.id, L(b.t), b.ep]; });
  groups.push([null, t.cross, EP.map(function(e,i){return e.b?null:i;}).filter(function(i){return i!==null;})]);
  groups.forEach(function(gr){
    var vis = gr[2].filter(function(i){ return stageOn[stageOf(EP[i])]; });
    var ri = gr[0] ? relIssues(BY[gr[0]]) : '';
    if (!vis.length && !ri) return;
    var card = el('div','pcard');
    card.innerHTML = '<h3>'+(gr[0] ? '<button type="button" data-blk="'+gr[0]+'">'+esc(gr[1])+'</button>' : '<span>'+esc(gr[1])+'</span>')+'<span class="c">'+vis.length+'/'+gr[2].length+'</span></h3><div class="elist">'+vis.map(epicCard).join('')+'</div>'+ri;
    g.appendChild(card);
  });
  Array.prototype.forEach.call(g.querySelectorAll('[data-epic]'), function(x){ x.addEventListener('click', function(){ openEpicDirect(+x.getAttribute('data-epic'), x); }); if (canPlan()) dragSource(x, {kind:'epic', i:+x.getAttribute('data-epic')}); });
  Array.prototype.forEach.call(g.querySelectorAll('[data-blk]'), function(x){ x.addEventListener('click', function(){ openBlock(x.getAttribute('data-blk'), x); if(!useSheet()) document.getElementById('karte').scrollIntoView({behavior:reduce?'auto':'smooth'}); }); });
  document.getElementById('mock').innerHTML = de()
   ? '<b>Reifegrad (1–10):</b> Das Projektfeld ließ sich hier nicht lesen; die Organisations-Endpunkte für Projekte (<code>/orgs/OpenResilienceInitiative/projectsV2</code>) sind für diese Sitzung gesperrt. Die Stufen oben sind deshalb ein Ersatz aus den Teilaufgaben: keine erledigt = Idee, unter 80 % = in Arbeit, ab 80 % = fast fertig, alle erledigt oder Epic geschlossen = fertig. Priorität, Aufwand und Release kommen aus den Issue-Feldern. Für den echten Reifegrad braucht es einen nächtlichen Job mit einem Token, das Projekte lesen darf: <code>GET /orgs/OpenResilienceInitiative/projectsV2</code> → Projektnummer; <code>GET …/projectsV2/{n}/fields</code> → ID des Felds „Reifegrad“; <code>GET …/projectsV2/{n}/items?fields[]={id}&amp;per_page=100</code> (seitenweise) → je Issue der Wert. Ergebnis als <code>epics.json</code> neben diese Seite legen (<code>{repo, number, title, state, reifegrad, sub_total, sub_done, block}</code>); die Seite liest dann <code>reifegrad</code> statt der Ersatz-Stufe. Stufen nach Ihrer Skala: 1–3 Idee, 4–6 in Arbeit, 7–9 fast fertig, 10 fertig.'
   : '<b>Maturity (1–10):</b> the project field could not be read here; the organisation endpoints for projects (<code>/orgs/OpenResilienceInitiative/projectsV2</code>) are blocked for this session. The stages above are therefore a substitute based on sub-issues: none done = idea, under 80 % = in progress, 80 % and more = nearly done, all done or epic closed = done. Priority, effort and release come from the issue fields. The real maturity needs a nightly job with a token that can read projects: <code>GET /orgs/OpenResilienceInitiative/projectsV2</code> → project number; <code>GET …/projectsV2/{n}/fields</code> → ID of the “Reifegrad” field; <code>GET …/projectsV2/{n}/items?fields[]={id}&amp;per_page=100</code> (paged) → the value per issue. Store the result as <code>epics.json</code> next to this page (<code>{repo, number, title, state, reifegrad, sub_total, sub_done, block}</code>); the page then reads <code>reifegrad</code> instead of the substitute stage. Stages on your scale: 1–3 idea, 4–6 in progress, 7–9 nearly done, 10 done.';
}

/* ───────── Weitere Teile ───────── */
function drawTotals(){
  var o=MEAS.tot, p = tt().tot(fmt(o.old_l), fmt(o.new_l), fmt(o.old_t), fmt(o.new_t));
  var open = EP.filter(function(e){ return stageOf(e)!=='done'; }).length;
  document.getElementById('totals').innerHTML = p.map(function(x){ return '<span class="chip">'+x+'</span>'; }).join('')+
    '<span class="chip">'+(de()?'unverändert aus dem Ausgangscode: <b>':'unchanged from the starting code: <b>')+Math.round(100*o.old_same/o.new_l)+' %</b>'+(de()?' des heutigen Codes':' of today’s code')+'</span>'+
    '<span class="chip">'+(de()?'offene Epics auf GitHub: <b>':'open epics on GitHub: <b>')+open+'</b></span>';
}
function drawCards(){
  var c = document.getElementById('cards'); c.innerHTML='';
  ['app','adm','ops'].forEach(function(a){
    B.filter(function(b){return b.aud===a;}).forEach(function(b){
      var m=b.m, k = el('button','card'); k.type='button';
      k.innerHTML = '<span class="aude">'+esc(L(AUD[a].s))+'</span><h3>'+esc(L(b.t))+'</h3><span class="d">'+esc(L(b.can)[0])+' …</span>'+
        '<span class="m"><span>'+(de()?'Zeilen ':'lines ')+'<b>'+rund(m.oldL)+' → '+rund(m.newL)+'</b></span><span>'+(de()?'Tests ':'tests ')+'<b>'+fmt(m.oldT)+' → '+fmt(m.newT)+'</b></span>'+(b.ep.length?'<span>Epics <b>'+openEpics(b)+'/'+b.ep.length+'</b></span>':'')+'</span>'+
        (boardOf(b.id) ? sbarHTML(boardOf(b.id),'card')+'<span class="cbadges"><span class="bb">'+esc(uhText(boardOf(b.id)))+'</span><span class="bb">'+esc(readyText(boardOf(b.id)))+' · '+esc(unscoredText(boardOf(b.id)))+'</span>'+findingBadge(boardOf(b.id)).replace(' aria-hidden="true"','')+'</span>' : '');
      k.addEventListener('click', function(){ openBlock(b.id, k); if (!useSheet()) document.getElementById('karte').scrollIntoView({behavior:reduce?'auto':'smooth'}); });
      c.appendChild(k);
    });
  });
}
function drawKpis(){
  var box = document.getElementById('kpis'); box.innerHTML='';
  KPIS.forEach(function(k){
    var v;
    if (k.single) v = '<div class="v">'+fmt(k.b)+'</div>';
    else { var f = function(n){ return k.pct ? n.toLocaleString(loc(),{minimumFractionDigits:1})+(lang==='en'?'%':' %') : fmt(n); };
      v = '<div class="v"><span class="from">'+f(k.a)+'</span><span class="arr" aria-hidden="true">→</span>'+f(k.b)+'</div>'; }
    box.appendChild(el('div','kpi','<div class="vlabel">'+esc(lang==='en'?k.en:k.de)+'</div>'+v+'<div class="d">'+esc(L2(k.dd))+'</div>'));
  });
}
function drawHow(){
  var c = de() ? [
   ['Was diese Karte schon nutzt','Verwandte Fähigkeiten stammen aus den <code>imports</code>- und <code>calls</code>-Kanten des ORISO-Supergraphen (<code>.understand-anything/oriso-super-graph.json</code>). Je Block sind die passenden Konzept- und Ablauf-Knoten genannt. Storybook-Listen kommen aus den veröffentlichten <code>index.json</code>, Testlisten aus dem Quelltext auf Zweig dev, Epics aus den GitHub-Issues.'],
   ['Feature-Beschreibungen','Jeder Block verweist auf <code>understand.oriso.org/features/&lt;slug&gt;.html</code>. Veröffentlicht ist heute nur die Seite zur Fallübergabe; die übrigen stehen als „in Arbeit“ da und werden zu Links, sobald sie erreichbar sind (Prüfung beim Bauen dieser Seite).'],
   ['So wird die Karte Teil von Understand','1. Zuordnung Datei → Block als <code>capabilities.json</code> neben den Graphen legen. 2. Der nächtliche Lauf (<code>ua-nightly-full.sh</code>) zählt Zahlen, Testlisten und Stories je Block neu und exportiert die Epics samt Reifegrad. 3. Diese Seite als Startgrafik der Hub-Seite einbinden. 4. Ein Viewer-Parameter <code>?node=…</code> würde jeden Graph-Verweis direkt auf seinen Knoten springen lassen.']
  ] : [
   ['What this map already uses','Related capabilities come from the <code>imports</code> and <code>calls</code> edges of the ORISO super-graph (<code>.understand-anything/oriso-super-graph.json</code>). Each block names the matching concept and flow nodes. Storybook lists come from the published <code>index.json</code>, test lists from the source on branch dev, epics from the GitHub issues.'],
   ['Feature descriptions','Each block points to <code>understand.oriso.org/features/&lt;slug&gt;.html</code>. Today only the case handover page is published; the others show as “in progress” and become links once they are reachable (checked when this page is built).'],
   ['How the map becomes part of Understand','1. Store the file → block mapping as <code>capabilities.json</code> next to the graph. 2. The nightly run (<code>ua-nightly-full.sh</code>) recounts figures, test lists and stories per block and exports the epics with their maturity. 3. Embed this page as the main graphic of the hub page. 4. A viewer parameter <code>?node=…</code> would let each graph link jump straight to its node.']
  ];
  document.getElementById('how').innerHTML = c.map(function(x){ return '<div class="howc"><h3>'+esc(x[0])+'</h3><p>'+x[1]+'</p></div>'; }).join('');
}
var SYNC_URL = 'https://github.com/OpenResilienceInitiative/ORISO-Docs/actions/workflows/planning-board-sync.yml';
/* Stand der Board-Synchronisierung (board.json, optional) und Link zur Seite mit dem "Run workflow"-Knopf. Kein Token im Browser. */
function syncLine(){
  var at = (MEAS.board && MEAS.board.syncedAt) || MEAS.syncedAt, when = '';
  if (at){ var d = new Date(at); when = isNaN(d) ? String(at) : d.toLocaleString(de() ? 'de-DE' : 'en-GB', {dateStyle:'medium', timeStyle:'short'}); }
  var link = '<a href="'+SYNC_URL+'" target="_blank" rel="noopener">'+(de()?'Jetzt synchronisieren':'Sync now')+'</a>';
  /* Kein zweites "Stand": der eine Stand der Seite kommt aus dem Lauf-Manifest (standHtml, #201). */
  return '<div id="boardSync"><b>'+(at ? (de()?'Board synchronisiert ':'Board synced ')+esc(when) : (de()?'Board noch nicht synchronisiert':'Board not synced yet'))+'.</b> '+
    (de()?'Planungsstand aus dem GitHub-Board. ':'Planning status from the GitHub board. ')+link+'</div>';
}
/* Ein Stand für die ganze Seite: kommt aus dem Lauf-Manifest, das jede Datendatei trägt.
   Weichen die Läufe der Dateien voneinander ab oder fehlt das Manifest, steht eine Warnung dabei. */
function standInfo(){
  var docs = MEAS.runs || [], ref = null, problems = [];
  docs.forEach(function(d){ if (!d.run) problems.push(d.file + (de() ? ' ohne Lauf-Manifest' : ' has no run manifest')); else if (!ref) ref = d.run; });
  docs.forEach(function(d){ if (d.run && ref && (d.run.runId !== ref.runId || d.run.generatedAt !== ref.generatedAt)) problems.push(d.file + ' (' + d.run.runId + ')'); });
  return {ref: ref, problems: problems};
}
function standHtml(){
  var s = standInfo(), r = s.ref;
  var when = r ? r.generatedAt.replace('T', ' ').replace(/:\d\d(\.\d+)?Z$/, ' UTC') : null;
  var h = '<b>' + (de() ? 'Stand ' : 'As of ') + esc(when || (de() ? 'unbekannt' : 'unknown')) + '.</b>';
  if (r) h += ' ' + (de() ? 'Lauf ' : 'Run ') + esc(r.runId) + ', ' + (de() ? 'Commits: ' : 'commits: ') +
    Object.keys(r.commits).sort().map(function(k){ return esc(k) + ' ' + esc(r.commits[k].slice(0, 7)); }).join(', ') + '.';
  var w = '';
  if (s.problems.length) w = '<div id="stand-warning" role="alert" class="standwarn"><b>' + (de() ? 'Achtung: Die Daten stammen aus verschiedenen Läufen oder sind nicht gestempelt:' : 'Warning: the data comes from different runs or is unstamped:') + '</b> ' + s.problems.map(esc).join(', ') + '.</div>';
  return {line: h, warning: w};
}
function drawMeas(){
  var o=MEAS.tot, st=standHtml();
  var html = de()
   ? '<div>'+st.line+' Vergleichsbasis: onlineBeratung-frontend (04/2024), vi-saas-admin (02/2026) und die vi-saas-Dienste (2025) gegen ORISO-Frontend, ORISO-Admin und die vier ORISO-Dienste, Zweig dev.</div>'+
     '<div><b>Gemessen:</b> Zeilen Programm- und Testcode, Testfälle und Testdateien je Block (jede Datei genau einmal, zugeordnet über Stichworte im Pfad); Testfälle: Java @Test, @ParameterizedTest, @RepeatedTest; TypeScript it( / test( in .test-, .spec- und .cy-Dateien. Summe '+fmt(o.old_l)+' → '+fmt(o.new_l)+' Zeilen, '+fmt(o.old_t)+' → '+fmt(o.new_t)+' Tests (Leistungsübersicht: 136.955 → 512.923 Zeilen, 3.117 → 20.902 Tests; Abweichung durch die Auswahl der Dateiarten). Unverändert / umgearbeitet / gelöscht: alte Datei am selben Pfad und Anteil ihrer Zeilen ab 12 Zeichen, die wörtlich noch vorkommen. Storybook-Ansichten: veröffentlichte Story-Verzeichnisse auf dev.oriso.org. Epics, Teilaufgaben, Priorität, Aufwand, Release: GitHub-Issues in ORISO-Frontend, ORISO-Admin und ORISO-Docs zum Zeitpunkt des Laufs; Teilaufgaben aus privaten Repositorien sind nicht aufgeführt.</div>'+
     '<div><b>Geplant (Schätzung):</b> offene Teilaufgaben der Epics je Block (sowie Epics ohne Teilaufgaben) in den sechs Code-Repositorien; Aufwand S = 2, M = 4, L = 8 Personentage, fehlender Aufwand = M; mal '+PLF+' Zeilen je Personentag. Der Faktor ist die Zahl neuer Zeilen in Frontend und Verwaltung geteilt durch den Aufwand aller erledigten Aufgaben dort (gleiche Regel). „In Arbeit“ = mindestens ein Pull Request verweist auf die Aufgabe; der Projektstatus (Backlog, Ready, In progress) ist hier nicht lesbar. Nur auf der Übersicht; Ordner und Dateien haben keinen eigenen Plan. Beschreibungen „Was ist das?“: Datei-Zusammenfassungen aus den Understand-Anreicherungen (englisch, nur ein Teil der Dateien); „Hängt zusammen mit“: Import- und Aufruf-Kanten des Understand-Graphen aus demselben Lauf.</div>'+
     '<div><b>Geschätzt:</b> die Aufteilung neuer Zeilen in beauftragt und zusätzlich (Verhältnis der Testzahlen der Bausteine in der Leistungsübersicht), die Zuordnung der Epics zu Blöcken (nach Titel) und die Stufe der Epics (aus erledigten Teilaufgaben statt Reifegrad). Gezählt wird Menge, nicht Qualität.</div>'
   : '<div>'+st.line+' Baseline: onlineBeratung-frontend (04/2024), vi-saas-admin (02/2026) and the vi-saas services (2025) against ORISO-Frontend, ORISO-Admin and the four ORISO services, branch dev.</div>'+
     '<div><b>Measured:</b> lines of program and test code, test cases and test files per block (each file exactly once, assigned by keywords in its path); test cases: Java @Test, @ParameterizedTest, @RepeatedTest; TypeScript it( / test( in .test, .spec and .cy files. Total '+fmt(o.old_l)+' → '+fmt(o.new_l)+' lines, '+fmt(o.old_t)+' → '+fmt(o.new_t)+' tests (service overview: 136,955 → 512,923 lines, 3,117 → 20,902 tests; the gap comes from the choice of file types). Unchanged / reworked / deleted: old file at the same path and the share of its lines of 12+ characters that still occur verbatim. Storybook views: published story indexes on dev.oriso.org. Epics, sub-issues, priority, effort, release: GitHub issues in ORISO-Frontend, ORISO-Admin and ORISO-Docs at the time of the run; sub-issues in private repositories are not listed.</div>'+
     '<div><b>Planned (estimate):</b> open sub-issues of the epics per block (and epics without sub-issues) in the six code repositories; effort S = 2, M = 4, L = 8 person-days, missing effort = M; times '+PLF+' lines per person-day. The factor is the number of new lines in frontend and administration divided by the effort of all completed issues there (same rule). “In progress” = at least one pull request references the issue; the project status (Backlog, Ready, In progress) cannot be read here. Overview only; folders and files have no plan of their own. “What is this?” descriptions: file summaries from the Understand enrichments (only part of the files); “Connected with”: import and call edges of the Understand graph from the same run.</div>'+
     '<div><b>Estimated:</b> the split of new lines into commissioned and additional (ratio of the building blocks’ test counts in the service overview), the assignment of epics to blocks (by title) and the epics’ stage (from completed sub-issues instead of maturity). This counts quantity, not quality.</div>';
  document.getElementById('meas').innerHTML = syncLine() + html + st.warning;
}

/* ───────── Meilensteine und Releases (ORISO-Docs#209): linke Seitenleiste, schreibgeschützt ───────── */
/* Planungsabsichten (ORISO-Docs#210): Karte zeigt Board + noch nicht bestätigte Verschiebungen (plan-ui.js). */
var PLAN = (typeof PlanMove !== 'undefined') ? PlanMove.create() : null;
var RSCOPE = null, MSV = null, VIEWB = null;
function rescope(){
  VIEWB = (MEAS.board && PLAN) ? PLAN.view(MEAS.board, MEAS.epics) : (MEAS.board || null);
  RSCOPE = (typeof BoardAgg !== 'undefined') ? BoardAgg.releases(VIEWB, MEAS.epics) : null;
  MSV = (RSCOPE && MEAS.milestones) ? BoardAgg.milestones(MEAS.milestones, RSCOPE) : null;
}
rescope();
var relSel = null, relHit = {};
var PRIO_L = {Urgent:['Dringend','Urgent'], High:['Hoch','High'], Medium:['Mittel','Medium'], Low:['Niedrig','Low'], none:['ohne Priorität','no priority']};
function relTitle(m){ return m.title ? L(m.title) : m.id; }
function relFacts(sc){
  var st = sc.segments.filter(function(g){ return g.count>0; }).map(function(g){ return '<span class="bb">'+esc(L2(STATUS_L[g.status]))+' '+fmt(g.count)+'</span>'; }).join('');
  if (sc.noStatus) st += '<span class="bb">'+(de()?'ohne Status ':'no status ')+fmt(sc.noStatus)+'</span>';
  var pr = ['Urgent','High','Medium','Low','none'].filter(function(k){ return sc.priority[k]>0; }).map(function(k){ return '<span class="bb">'+esc(L2(PRIO_L[k]))+' '+fmt(sc.priority[k])+'</span>'; }).join('');
  var e = sc.effort, parts = ['S','M','L'].filter(function(k){ return e[k]>0; }).map(function(k){ return k+' '+fmt(e[k]); });
  if (e.none) parts.push(fmt(e.none)+(de()?' ohne Aufwand':' unsized'));
  return '<div class="rfacts" aria-label="'+esc(de()?'Status':'Status')+'">'+st+'</div>'+
    '<div class="rfacts" aria-label="'+esc(de()?'Priorität':'Priority')+'">'+pr+'</div>'+
    '<div class="reff"><b>'+fmt(e.days)+'</b> '+(de()?'Personentage':'person-days')+(parts.length ? ' <span class="raw">('+esc(parts.join(' · '))+')</span>' : '')+'</div>';
}
function relScopeHTML(sc, isRel){
  var empty = sc.total===0;
  var head = '<span class="rname">'+esc(isRel ? sc.name : relTitle(sc))+'</span><span class="rcount">'+fmt(sc.total)+(de()?(sc.total===1?' Aufgabe':' Aufgaben'):(sc.total===1?' issue':' issues'))+'</span>';
  var body = empty ? '<p class="rnone">'+(de()?'Keine Aufgaben auf dem Board.':'No issues on the board.')+'</p>' : sbarHTML(sc,'rsbar')+relFacts(sc);
  return {head:head, body:body};
}
function relCard(sc){
  var s = relScopeHTML(sc, true), b = el('button','relc'+(sc.total?'':' zero')); b.type='button';
  b.dataset.release = sc.name; b.setAttribute('aria-pressed', relSel===sc.name ? 'true' : 'false');
  b.innerHTML = '<span class="rhead">'+s.head+'</span>'+s.body+
    '<span class="rcaps">'+(sc.capabilities.length ? fmt(sc.capabilities.length)+(de()?(sc.capabilities.length===1?' Fähigkeit':' Fähigkeiten'):(sc.capabilities.length===1?' capability':' capabilities')) : (sc.total ? (de()?'keiner Fähigkeit zugeordnet':'not mapped to a capability') : ''))+'</span>';
  b.addEventListener('click', function(){ setRelease(relSel===sc.name ? null : sc.name); if (relMobile()) closeRel(true); });
  b.addEventListener('dragover', function(e){ if (!dragSubject) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; b.classList.add('dropok'); });
  b.addEventListener('dragleave', function(){ b.classList.remove('dropok'); });
  b.addEventListener('drop', function(e){ if (!dragSubject) return; e.preventDefault(); b.classList.remove('dropok'); var sub = dragSubject; dragSubject = null; dragOpenedRel = false; if (relMobile()) closeRel(true); openMove(sub, sc.name); });
  return b;
}
function drawRelPanel(){
  var body = document.getElementById('relbody'); if (!body) return;
  var open = document.getElementById('relopen'), pan = document.getElementById('relpanel');
  if (!MSV){ pan.hidden = true; open.hidden = true; return; }
  body.innerHTML = '';
  var live = el('p','rlive'); live.id = 'rellive'; live.setAttribute('role','status');
  body.appendChild(live);
  var clr = el('button','rclear', de()?'Filter aufheben':'Clear filter'); clr.type='button'; clr.id='relclear'; clr.hidden = relSel===null;
  clr.addEventListener('click', function(){ setRelease(null); });
  body.appendChild(clr);
  MSV.milestones.forEach(function(m){
    var sec = el('section','ms'), s = relScopeHTML(m, false);
    sec.innerHTML = '<h3 class="mh">'+s.head+'</h3>'+(m.total ? s.body : '');
    var list = el('div','rels'); m.releases.forEach(function(r){ list.appendChild(relCard(r)); });
    sec.appendChild(list); body.appendChild(sec);
  });
  if (MSV.unlisted.length){
    var u = el('section','ms'); u.innerHTML = '<h3 class="mh"><span class="rname">'+(de()?'Nicht zugeordnet':'Not assigned')+'</span></h3><p class="rnone">'+(de()?'Diese Releases stehen auf dem Board, aber noch in keinem Meilenstein (milestones.json).':'These releases are on the board but in no milestone yet (milestones.json).')+'</p>';
    var ul = el('div','rels'); MSV.unlisted.forEach(function(r){ ul.appendChild(relCard(r)); }); u.appendChild(ul); body.appendChild(u);
  }
  if (!MEAS.board) body.insertAdjacentHTML('afterbegin', '<p class="rnone">'+(de()?'Board noch nicht synchronisiert: alle Zahlen sind null.':'Board not synced yet: all figures are zero.')+'</p>');
  body.insertAdjacentHTML('beforeend', '<p class="bnote">'+(de()?'Aufwand: S = 2, M = 4, L = 8 Personentage; Aufgaben ohne Aufwand zählen nicht mit. Epic oder Fähigkeit auf ein Release ziehen oder „Zu Release verschieben …“ wählen. Die Gruppierung steht in tools/planning-map/milestones.json.':'Effort: S = 2, M = 4, L = 8 person-days; issues without effort are not counted. Drag an epic or capability onto a release, or choose “Move to release…”. The grouping is in tools/planning-map/milestones.json.')+'</p>');
  relStatus();
}
function relStatus(){
  var live = document.getElementById('rellive'); if (!live) return;
  live.textContent = relSel===null ? (de()?'Release wählen, um die berührten Fähigkeiten auf der Karte hervorzuheben.':'Pick a release to highlight the capabilities it touches on the map.')
    : relSel+': '+fmt(BoardAgg.releaseCapabilities(RSCOPE, relSel).length)+(de()?' Fähigkeit(en) hervorgehoben (Übersichtsebene).':' capability(ies) highlighted (overview level).');
}
function markRelease(){
  var on = relSel!==null;
  relHit = {}; BoardAgg.releaseCapabilities(RSCOPE, relSel).forEach(function(id){ relHit[id] = true; });
  tm.classList.toggle('relf', on);
  Array.prototype.forEach.call(tm.querySelectorAll('.blk'), function(e){ e.classList.toggle('relhit', on && e.dataset.id!==undefined && relHit[e.dataset.id]===true); });
}
function setRelease(name){
  relSel = name;
  Array.prototype.forEach.call(document.querySelectorAll('#relbody .relc'), function(b){ b.setAttribute('aria-pressed', b.dataset.release===relSel ? 'true' : 'false'); });
  var c = document.getElementById('relclear'); if (c) c.hidden = relSel===null;
  markRelease(); relStatus();
}
function relMobile(){ return window.matchMedia('(max-width:1560px)').matches; }
/* Offenes Schubfach (bis 1560 px): der Rest der Seite ist inert, damit Tab und Lesehilfen im Schubfach bleiben.
   Nicht beim Ziehen: dann ist das Schubfach nur Ablageziel, und die Quelle muss bedienbar bleiben. */
var relInert = [];
function setPageInert(on){
  relInert.forEach(function(n){ n.removeAttribute('inert'); }); relInert = [];
  if (!on) return;
  var keep = [document.getElementById('relpanel'), document.getElementById('relback')], node = keep[0];
  while (node && node.parentElement && node!==document.body){
    var parent = node.parentElement;
    Array.prototype.forEach.call(parent.children, function(sib){
      if (sib===node || keep.indexOf(sib)>=0 || sib.tagName==='DIALOG' || sib.tagName==='SCRIPT' || sib.hasAttribute('inert')) return;
      sib.setAttribute('inert',''); relInert.push(sib);
    });
    node = parent;
  }
}
function openRel(noFocus, viaDrag){
  var p = document.getElementById('relpanel'); p.classList.add('open'); document.getElementById('relback').hidden = false;
  document.getElementById('relopen').setAttribute('aria-expanded','true');
  if (viaDrag!==true && relMobile()) setPageInert(true);
  if (noFocus!==true) document.getElementById('relclose').focus();
}
function closeRel(noFocus){
  var p = document.getElementById('relpanel'); if (!p.classList.contains('open')) return;
  setPageInert(false);
  p.classList.remove('open'); document.getElementById('relback').hidden = true;
  var o = document.getElementById('relopen'); o.setAttribute('aria-expanded','false'); if (!noFocus) o.focus();
}
document.getElementById('relopen').addEventListener('click', function(){ openRel(); });
document.getElementById('relclose').addEventListener('click', function(){ closeRel(); });
document.getElementById('relback').addEventListener('click', function(){ closeRel(); });
/* Escape schließt zuerst das Schubfach (Capture-Phase), erst das nächste Escape zoomt heraus oder schließt Ansichten. */
document.addEventListener('keydown', function(e){
  if (e.key!=='Escape' || !document.getElementById('relpanel').classList.contains('open')) return;
  if ((movedlg && movedlg.open) || sheet.open) return;
  e.preventDefault(); e.stopPropagation(); closeRel();
}, true);
window.matchMedia('(max-width:1560px)').addEventListener('change', function(q){ if (!q.matches) closeRel(true); });


/* ───────── Verschieben in ein Release (ORISO-Docs#210) ─────────
   Ziehen (Epic-Karte, Fähigkeits-Block) oder Tastatur („Zu Release verschieben …“) führen in denselben Dialog.
   Danach: sofort sichtbar (optimistisch), dann window.PlanningTransport; ohne Transport der Befehl für plan.mjs;
   bei Fehler wird zurückgerollt und der Grund gezeigt. Die Seite selbst schreibt nie nach GitHub. */
var dragSubject = null, dragOpenedRel = false;
var ORGN = (MEAS.board && MEAS.board.source && MEAS.board.source.owner) || 'OpenResilienceInitiative';
function canPlan(){ return !!(PLAN && MEAS.board && MSV); }
function subjectEpics(sub){ return sub.kind==='epic' ? [EP[sub.i]] : (BY[sub.id] ? BY[sub.id].ep.map(function(i){ return EP[i]; }) : []); }
function subjectTitle(sub){
  if (sub.kind==='epic') return EP[sub.i].t;
  var n = subjectEpics(sub).length;
  return L(BY[sub.id].t)+' ('+n+(de()?(n===1?' Epic':' Epics'):(n===1?' epic':' epics'))+')';
}
function releaseNames(){
  var out = [];
  MSV.milestones.forEach(function(m){ m.releases.forEach(function(r){ out.push(r.name); }); });
  MSV.unlisted.forEach(function(r){ out.push(r.name); });
  return out;
}
function boardRelease(e){
  if (!VIEWB) return undefined;
  var k = PlanMove.key(EPR[e.r], e.n), hit;
  VIEWB.items.forEach(function(it){ if (it.contentType==='Issue' && it.repository && PlanMove.key(it.repository, it.number)===k) hit = it; });
  return hit ? (hit.platformRelease || null) : undefined;
}
function currentReleaseOf(e){ var r = boardRelease(e); return r===undefined ? (e.rl || '') : (r || ''); }
/* Erwartung für den Schreibbefehl: der zuletzt SYNCHRONISIERTE Board-Stand (MEAS.board), nie die optimistische Ansicht:
   eine noch nicht geschriebene Verschiebung ist auf GitHub nicht zu sehen und würde sonst als Konflikt enden. */
function syncedRelease(e){
  if (!MEAS.board) return undefined;
  var k = PlanMove.key(EPR[e.r], e.n), hit;
  MEAS.board.items.forEach(function(it){ if (it.contentType==='Issue' && it.repository && PlanMove.key(it.repository, it.number)===k) hit = it; });
  return hit ? (hit.platformRelease || null) : undefined;
}
function moveButton(sub){
  if (!canPlan() || !subjectEpics(sub).length) return '';
  var b = sub.kind==='epic';
  return '<p><button type="button" class="mvbtn" data-move="'+sub.kind+'" data-moveid="'+esc(String(b ? sub.i : sub.id))+'">'+esc(b ? (de()?'Zu Release verschieben …':'Move to release…') : (de()?'Alle Epics zu einem Release verschieben …':'Move all epics to a release…'))+'</button></p>';
}
var movedlg = document.getElementById('movedlg'), mvSub = null, mvOpener = null;
function openMove(sub, preset){
  if (!canPlan()) return;
  var epics = subjectEpics(sub); if (!epics.length) return;
  mvSub = sub; mvOpener = document.activeElement;
  var one = epics.length===1, cur = one ? currentReleaseOf(epics[0]) : '';
  document.getElementById('mvTitle').textContent = de() ? 'In ein Release verschieben' : 'Move to a release';
  document.getElementById('mvWhat').textContent = subjectTitle(sub)+(one && cur ? ' · '+(de()?'jetzt: ':'now: ')+cur : '');
  document.getElementById('mvrelL').textContent = 'Release';
  var sel = document.getElementById('mvrel'); sel.innerHTML = '';
  releaseNames().forEach(function(n){ var o = document.createElement('option'); o.value = n; o.textContent = n; sel.appendChild(o); });
  sel.value = preset || (cur && releaseNames().indexOf(cur)>=0 ? cur : releaseNames()[0]);
  var subs = document.getElementById('mvsubs'); subs.checked = false;
  document.getElementById('mvsubsL').textContent = de() ? 'Teilaufgaben mitverschieben' : 'Move sub-issues too';
  document.getElementById('mvcancel').textContent = de() ? 'Abbrechen' : 'Cancel';
  document.getElementById('mvgo').textContent = de() ? 'Verschieben' : 'Move';
  movedlg.showModal(); sel.focus();
}
function closeMove(){ if (movedlg.open) movedlg.close(); if (mvOpener && document.contains(mvOpener)) mvOpener.focus(); mvOpener = null; }
function submitMove(){
  var sub = mvSub, epics = sub ? subjectEpics(sub) : []; if (!epics.length) return;
  var intent = {action:'assignRelease', release: document.getElementById('mvrel').value, withSubIssues: document.getElementById('mvsubs').checked,
    issues: epics.map(function(e){ var i = {repository: PlanMove.fullName(EPR[e.r], ORGN), number: e.n}, was = syncedRelease(e); if (was!==undefined) i.expect = was; return i; }), label: subjectTitle(sub)};
  intent.otherRelease = PlanMove.otherRelease(MEAS.board, MEAS.epics, intent);
  mvSub = null; closeMove();
  if (sheet.open) sheet.close(); /* Handy: das Bottom-Sheet ist modal und würde die Meldung darunter verdecken */
  setTimeout(function(){ var pl = document.getElementById('planlog'); if (pl && !pl.hidden) pl.scrollIntoView({block:'nearest'}); }, 0);
  PLAN.run(intent, window.PlanningTransport).then(function(x){ if (x.status==='failed') announcePlan(x); });
}
document.getElementById('mvform').addEventListener('submit', function(e){ e.preventDefault(); submitMove(); });
document.getElementById('mvcancel').addEventListener('click', closeMove);
movedlg.addEventListener('cancel', function(){ mvSub = null; });
/* ───── Branches und Pull Requests: Badge und Pop-up (ORISO-Docs#215) ───── */
var WK = {
  de:{branch:['Branch','Branches'], pr:['PR','PRs'], title:'Branches, Pull Requests und Jobs', close:'Schließen', open:'Branches und Pull Requests zeigen',
    last:'letzter Commit', src:{linked:'auf GitHub verknüpft', pr:'über Pull Request', name:'nur über den Namen zugeordnet'},
    state:{OPEN:'offen', MERGED:'gemergt', CLOSED:'geschlossen'}, draft:'Entwurf', checks:{SUCCESS:'Prüfungen grün', FAILURE:'Prüfungen fehlgeschlagen', ERROR:'Prüfungen fehlgeschlagen', PENDING:'Prüfungen laufen', EXPECTED:'Prüfungen laufen'},
    review:{APPROVED:'freigegeben', CHANGES_REQUESTED:'Änderungen angefordert', REVIEW_REQUIRED:'Review ausstehend'}, none:'Keine Branches oder Pull Requests.',
    hidden:function(n){ return n+(n===1?' Verweis':' Verweise')+' in einem privaten Repository, nur gezählt'; }, forEpic:'Epic', pri:'Pull Requests',
    truncated:'GitHub hat nicht alle Verweise geliefert (höchstens 10 verknüpfte Branches, 10 schließende und 20 erwähnende Pull Requests je Aufgabe): Es gibt mehr, „+“ an der Zahl.'},
  en:{branch:['branch','branches'], pr:['PR','PRs'], title:'Branches, pull requests and jobs', close:'Close', open:'Show branches and pull requests',
    last:'last commit', src:{linked:'linked on GitHub', pr:'via pull request', name:'matched by name only'},
    state:{OPEN:'open', MERGED:'merged', CLOSED:'closed'}, draft:'draft', checks:{SUCCESS:'checks passing', FAILURE:'checks failing', ERROR:'checks failing', PENDING:'checks running', EXPECTED:'checks running'},
    review:{APPROVED:'approved', CHANGES_REQUESTED:'changes requested', REVIEW_REQUIRED:'review required'}, none:'No branches or pull requests.',
    hidden:function(n){ return n+(n===1?' reference':' references')+' in a private repository, counted only'; }, forEpic:'Epic', pri:'Pull requests',
    truncated:'GitHub did not return every reference (at most 10 linked branches, 10 closing and 20 mentioning pull requests per task): there are more, "+" on the number.'}
};
function wk(){ return WK[de()?'de':'en']; }
function workOf(ref){
  if (!WORKIDX || typeof ref!=='string') return null;
  var m = /^(epic|item):(.+)$/.exec(ref); if (!m) return null;
  if (m[1]==='epic') { var s = WORKIDX.byEpic[+m[2]]; return s ? {kind:'epic', branches:s.branches, prs:s.prs, hidden:s.hidden, truncated:s.truncated, issues:s.issues} : null; }
  var x = WORKIDX.byItem[m[2]]; return x ? {kind:'item', branches:x.branches, prs:x.prs, hidden:x.hidden, truncated:x.truncated, issues:[x]} : null;
}
function workLabel(s){
  var t = wk();
  var plus = s.truncated ? '+' : '';
  return fmt(s.branches)+plus+' '+t.branch[s.branches===1&&!plus?0:1]+' · '+fmt(s.prs)+plus+' '+t.pr[s.prs===1&&!plus?0:1];
}
function workBadge(ref){
  var s = workOf(ref); if (!s || (!s.branches && !s.prs)) return '';
  return '<button type="button" class="wkbadge" data-work="'+esc(ref)+'" aria-haspopup="dialog" title="'+esc(wk().open)+'">'+esc(workLabel(s))+'</button>';
}
/* Branch- und Job-Badge nebeneinander (beide öffnen #workdlg über data-work). */
function badges(ref){
  var a = workBadge(ref), b = JOBS ? MapJobs.badgeHTML(JOBS, ref, lang) : '';
  return a && b ? '<span class="wkbadges">'+a+b+'</span>' : a || b;
}
/* Nur https-Links: alles andere aus board.json bleibt Text, nie ein href (wie bei den Teilaufgaben). */
function wkLink(url, text){ return /^https:\/\//.test(url||'') ? '<a href="'+esc(url)+'" target="_blank" rel="noopener">'+esc(text)+'</a>' : '<span class="nolink">'+esc(text)+'</span>'; }
function wkDate(d){ return /^\d{4}-\d{2}-\d{2}/.test(d||'') ? d.slice(0,10) : ''; }
function wkIssueHTML(x, head){
  var t = wk();
  var bl = x.branchList.map(function(b){
    var when = wkDate(b.lastCommitDate), prs = (b.prs||[]).map(function(n){ return '#'+n; }).join(' ');
    return '<li>'+wkLink(b.url, b.name)+' <span class="wksrc" data-source="'+esc(b.source)+'">'+esc(t.src[b.source]||b.source)+'</span>'+
      (when ? ' <span class="c">'+esc(t.last)+' '+esc(when)+'</span>' : '')+(prs ? ' <span class="c">'+esc(prs)+'</span>' : '')+'</li>';
  }).join('');
  var pl = x.prList.map(function(p){
    var bits = [t.state[p.state]||p.state];
    if (p.isDraft) bits.push(t.draft);
    if (p.checks && t.checks[p.checks]) bits.push(t.checks[p.checks]);
    if (p.reviewDecision && t.review[p.reviewDecision]) bits.push(t.review[p.reviewDecision]);
    return '<li>'+wkLink(p.url, '#'+p.number+' '+p.title)+' <span class="c">'+esc(bits.join(' · '))+'</span></li>';
  }).join('');
  return '<section class="wkissue">'+(head ? '<h4>'+wkLink(x.url, x.title)+' <span class="c">'+esc(x.repository.replace('ORISO-',''))+' #'+x.number+'</span></h4>' : '')+
    (bl ? '<ul class="dlist wklist">'+bl+'</ul>' : '')+(pl ? '<h5 class="wkh">'+esc(t.pri)+'</h5><ul class="dlist wklist">'+pl+'</ul>' : '')+'</section>';
}
var workdlg = document.getElementById('workdlg'), wkOpener = null, wkRef = null;
function openWork(ref, opener){
  var s = workOf(ref) || (JOBS && MapJobs.stub(JOBS, ref)); if (!s) return;
  var t = wk(), item = s.kind==='item' ? s.issues[0] : null, jobs = JOBS ? MapJobs.popupHTML(JOBS, ref, lang) : '';
  wkRef = ref; wkOpener = opener || document.activeElement;
  document.getElementById('wkTitle').textContent = item ? '#'+item.number+' '+item.title : s.title || t.title+' · '+(EP[+ref.slice(5)]||{}).t;
  document.getElementById('wkclose').textContent = t.close;
  document.getElementById('wkBody').innerHTML = jobs+(s.issues.length ? s.issues.map(function(x){ return wkIssueHTML(x, s.kind==='epic'); }).join('') : jobs ? '' : '<p class="dmeta">'+esc(t.none)+'</p>')+
    (s.hidden ? '<p class="dmeta wkpriv">'+esc(t.hidden(s.hidden))+'</p>' : '')+
    (s.truncated ? '<p class="dmeta wktrunc" data-wk-truncated>'+esc(t.truncated)+'</p>' : '');
  workdlg.showModal();
  document.getElementById('wkTitle').focus({preventScroll:true});
}
function closeWork(){ if (workdlg.open) workdlg.close(); }
workdlg.addEventListener('close', function(){
  var o = wkOpener && document.contains(wkOpener) ? wkOpener : (wkRef ? document.querySelector('[data-work="'+wkRef.replace(/"/g,'')+'"]') : null);
  wkOpener = null; if (o) o.focus();
});
workdlg.addEventListener('click', function(e){ if (e.target===workdlg) closeWork(); }); /* Klick auf den Hintergrund */
document.getElementById('wkclose').addEventListener('click', closeWork);
document.addEventListener('click', function(e){
  var b = e.target.closest && e.target.closest('[data-work]'); if (!b) return;
  e.preventDefault(); e.stopPropagation(); openWork(b.getAttribute('data-work'), b);
});
/* Knöpfe mit data-copy (Gesundheitsprüfung, ORISO-Docs#220) kopieren ihren Befehl. */
document.addEventListener('click', function(e){
  var b = e.target.closest && e.target.closest('[data-copy]'); if (!b) return;
  e.preventDefault(); copyText(b.getAttribute('data-copy'), b);
});
function copyText(txt, btn){
  function done(){ var t = btn.textContent; btn.textContent = de() ? 'Kopiert' : 'Copied'; setTimeout(function(){ btn.textContent = t; }, 1600); }
  if (navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(done, function(){ btn.textContent = de() ? 'Bitte von Hand kopieren' : 'Please copy by hand'; }); }
  else btn.textContent = de() ? 'Bitte von Hand kopieren' : 'Please copy by hand';
}
function announcePlan(x){ var box = document.getElementById('planlog'); if (box){ var f = box.querySelector('[data-plan="'+x.id+'"] .pmsg'); if (f) f.focus(); } }
function drawPlanLog(){
  var box = document.getElementById('planlog'); if (!box || !PLAN) return;
  var list = PLAN.intents.filter(function(x){ return x.status!=='discarded' && !x.dismissed; });
  box.hidden = !list.length; box.innerHTML = '';
  list.forEach(function(x){
    var row = el('div','plrow '+x.status); row.dataset.plan = x.id;
    var what = esc(x.label)+' → <b>'+esc(x.release)+'</b>'+(x.withSubIssues ? (de()?' (mit Teilaufgaben)':' (with sub-issues)') : '');
    var msg, btns = '';
    var other = (x.otherRelease && x.otherRelease.length && x.status!=='failed') ? '<br>'+(de()?'Teilaufgaben in einem anderen Release, werden mitverschoben: ':'Sub-issues in another release, moved too: ')+
      x.otherRelease.map(function(o){ return esc(String(o.issue).replace(/^[^\/]*\//,'')+' ('+o.before+')'); }).join(', ') : '';
    if (x.status==='pending') msg = (de()?'Wird gespeichert: ':'Saving: ')+what;
    else if (x.status==='confirmed') msg = (x.partial ? (de()?'Nur teilweise auf GitHub gespeichert: ':'Only partly saved on GitHub: ') : (de()?'Auf GitHub gespeichert: ':'Saved on GitHub: '))+what+(x.partial ? ' · '+esc(PlanMove.reason(x.error, lang)+' '+(x.error.issue||'')) : '');
    else if (x.status==='failed') msg = (de()?'Nicht gespeichert, zurückgesetzt: ':'Not saved, rolled back: ')+what+'<br>'+esc(PlanMove.reason(x.error, lang))+(x.error.message ? ' <span class="raw">('+esc(x.error.message)+')</span>' : '');
    else {
      msg = (de()?'Geplant, noch nicht auf GitHub: ':'Planned, not on GitHub yet: ')+what+'<br>'+(de()?'Dieser Befehl schreibt es (erst ohne, dann mit --apply):':'This command writes it (first without, then with --apply):');
      btns = '<code class="plcmd">'+esc(PlanMove.command(x, false, ORGN))+'</code>';
    }
    row.innerHTML = '<p class="pmsg" tabindex="-1">'+msg+other+'</p>'+btns;
    var bar = el('div','plbtns');
    function add(txt, fn){ var b = el('button','plb', esc(txt)); b.type='button'; b.addEventListener('click', function(){ fn(b); }); bar.appendChild(b); }
    if (x.status==='command'){
      add(de()?'Befehl kopieren':'Copy command', function(b){ copyText(PlanMove.command(x, false, ORGN), b); });
      add(de()?'Mit --apply kopieren':'Copy with --apply', function(b){ copyText(PlanMove.command(x, true, ORGN), b); });
      add(de()?'Zurücknehmen':'Undo', function(){ PLAN.discard(x.id); });
    } else if (x.status!=='pending') add(de()?'Schließen':'Dismiss', function(){ PLAN.dismiss(x.id); });
    row.appendChild(bar); box.appendChild(row);
  });
}
/* Nach jeder Änderung neu zeichnen; liegt der Fokus in der Seitenansicht und verschwindet mit dem Neuzeichnen,
   landet er auf dem neuen „Zu Release verschieben …“-Knopf (gleiches Ziel) oder auf dem Titel der Ansicht. */
function refocusView(mv){
  var root = useSheet() ? sheetBody : panel, b = null;
  if (mv) b = root.querySelector('.mvbtn[data-move="'+CSS.escape(mv[0])+'"][data-moveid="'+CSS.escape(mv[1])+'"]');
  if (b) b.focus({preventScroll:true}); else focusTitle();
}
if (PLAN) PLAN.onChange(function(){
  var a = document.activeElement;
  var inView = a && a!==document.body && (panel.contains(a) || sheetBody.contains(a));
  var mv = inView && a.classList.contains('mvbtn') ? [a.getAttribute('data-move'), a.getAttribute('data-moveid')] : null;
  rescope(); drawRelPanel(); markRelease(); relStatus(); drawPlanLog(); drawPlanned(); if (stack.length) renderView();
  if (inView && !document.contains(a)) refocusView(mv);
});
/* Ziehen: Epic-Karten und Fähigkeits-Blöcke sind Quellen, die Release-Karten im Panel Ziele. */
/* Nicht im Bottom-Sheet-Modus (Handy): dort öffnet ein Tipp die Ansicht, Ziehen würde mit dem Scrollen kollidieren. */
function dragSource(node, sub){
  if (useSheet()){ node.removeAttribute('draggable'); return; }
  node.draggable = true;
  node.addEventListener('dragstart', function(e){
    if (useSheet()){ e.preventDefault(); return; }
    dragSubject = sub; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'oriso-plan:'+sub.kind);
    /* Schmale Fenster: das Release-Panel ist ein Schubfach; es geht für die Dauer des Ziehens auf (nach dem Start, damit der Zug nicht abbricht). */
    if (relMobile() && !document.getElementById('relpanel').classList.contains('open')){ dragOpenedRel = true; setTimeout(function(){ if (dragSubject) openRel(true, true); }, 0); }
  });
  node.addEventListener('dragend', function(){
    dragSubject = null; if (dragOpenedRel){ dragOpenedRel = false; closeRel(true); }
    Array.prototype.forEach.call(document.querySelectorAll('.relc.dropok'), function(b){ b.classList.remove('dropok'); });
  });
}

/* ───────── Sprache und Start ───────── */
function setLang(l){
  lang=l;
  renderAll();
}
document.addEventListener('oriso:languagechange', function(e){ if (e.detail && (e.detail.lang==='de'||e.detail.lang==='en') && e.detail.lang!==lang) setLang(e.detail.lang); });
/* ───────── Deep-Link aus dem Understand-Viewer: /map/#node=<knoten-id> ───────── */
function resolveNode(id){
  var m, bid, i, j, z, f;
  if (/^capability:./.test(id)){
    for (bid in BY) if (capNodeId(bid) === id) return [{v:'block', id:bid}];
    return null;
  }
  if ((m = /^(ORISO-[A-Za-z]+)::(folder|file):(.*)$/.exec(id))){
    var repo = m[1], kind = m[2], rest = m[3];
    for (bid in BY){
      var zs = Z[bid] || [];
      for (i=0;i<zs.length;i++){
        z = zs[i]; if (CODE_REPOS[z[0]] !== repo) continue;
        if (kind === 'folder'){ if (z[2] && z[4] && z[2] === rest) return [{v:'block', id:bid}, {v:'mod', m:i}]; continue; }
        for (j=0;j<z[12].length;j++){ f = z[12][j]; if (f[1] !== 2 && ghPath(z, f) === rest) return [{v:'block', id:bid}, {v:'mod', m:i}, {v:'file', m:i, f:j}]; }
      }
    }
  }
  return null;
}
/* Der Hash trägt Ansicht und Knoten: #view=<ansicht>&node=<id>. #node=<id> allein ist die Ansicht State (#199, #214). */
function nodeOfStack(){
  for (var i=stack.length-1;i>=0;i--){
    var v = stack[i], z;
    if (v.v==='block') return capNodeId(v.id);
    if (v.v==='file' || v.v==='mod'){
      z = Z[curBlockAt(i)][v.m]; if (!z) continue;
      if (v.v==='mod'){ if (z[2] && z[4] && CODE_REPOS[z[0]]) return CODE_REPOS[z[0]]+'::folder:'+z[2]; continue; }
      var f = z[12][v.f]; if (f && f[1]!==2 && CODE_REPOS[z[0]]) return CODE_REPOS[z[0]]+'::file:'+ghPath(z, f);
    }
  }
  return null;
}
function curBlockAt(i){ for (;i>=0;i--) if (stack[i].v==='block') return stack[i].id; return null; }
var hashReady = false;
function syncHash(push){
  if (!hashReady) return;
  var node = stack.length ? nodeOfStack() : notFoundId, h = MapViews.buildHash(view, node);
  if (h === (location.hash || '')) return;
  var url = location.pathname + location.search + h;
  if (push) history.pushState(null, '', url); else history.replaceState(null, '', url);
}
var notFoundId = null;
function drawNotice(){
  var old = document.querySelector('.map-notfound'); if (old) old.remove();
  if (notFoundId === null) return;
  var n = el('div','map-notfound'); n.setAttribute('role','status');
  n.innerHTML = '<b>'+(de()?'Knoten nicht gefunden':'Node not found')+'</b> <span>'+(de()
    ? 'Auf der Karte gibt es keinen Eintrag für diesen Verweis. Die Karte zeigt die Übersicht.'
    : 'The map has no entry for this link. Showing the overview.')+'</span> <code>'+esc(notFoundId)+'</code>';
  var host = document.getElementById('karte'); host.insertBefore(n, host.querySelector('.controls'));
}
/* Während der Hash gelesen wird, schreibt syncHash ihn nicht zurück (sonst überschreibt der alte Stapel den neuen Link). */
function applyHash(){
  var was = hashReady; hashReady = false;
  try { applyHashNow(); } finally { hashReady = was; }
  syncHash(false);
}
function applyHashNow(){
  var h = MapViews.parseHash(location.hash);
  if (h.hasView && h.view !== view) setView(h.view, false);
  else if (!h.hasView && h.node !== null && view !== MapViews.DEFAULT_VIEW) setView(MapViews.DEFAULT_VIEW, false);
  var id = h.node; if (id === null) return;
  var path = resolveNode(id);
  notFoundId = path ? null : id;
  drawNotice();
  if (!path) return;
  stack = path; renderView();
  if (useSheet()) focusZbar(); else focusTitle();
  document.getElementById('karte').scrollIntoView({behavior:reduce?'auto':'smooth'});
}
window.addEventListener('hashchange', applyHash);
function renderAll(){ drawNotice(); drawPlanLog(); drawRelPanel(); drawTotals(); drawControls(); drawMap(); drawPlanned(); drawCards(); drawKpis(); drawHow(); drawMeas(); if (stack.length) renderView(); else renderEmpty(); }
var rt=null, lastW=0;
window.addEventListener('resize', function(){ clearTimeout(rt); rt=setTimeout(function(){ if (tm.clientWidth!==lastW){ lastW=tm.clientWidth; drawMap(); } },120); });
renderAll(); lastW = tm.clientWidth; applyHash(); hashReady = true; syncHash(false);
}

/* ───────── Daten ─────────
   Alle Messwerte liegen als erzeugte JSON-Dateien in data/ neben dieser Seite
   (Erzeuger: build-map-data.mjs). OPTIONAL_DATA sind Dateien, die nur geladen werden, wenn links.json sie
   unter "optional" meldet; ihr Inhalt liegt in MEAS unter dem Dateinamen ohne .json (board.json wird zu MEAS.board). */
var DATA_FILES = ['counts.json', 'descriptions.json', 'drill.json', 'epics.json', 'links.json', 'zoom.json'];
var OPTIONAL_DATA = ['board.json', 'milestones.json', 'criteria.json', 'ideas.json', 'health.json', 'steering.json'];
/* Optionale Dateien, die der vereinheitlichte Lauf stempelt (tools/planning-map/nightly-run.mjs). */
var RUN_DATA = ['board.json'];
function fetchJson(name, optional){
  return fetch('/map/data/' + name, {credentials: 'same-origin'}).then(function(r){
    if (!r.ok){ if (optional) return null; throw new Error(name + ' ' + r.status); }
    return r.json();
  }).catch(function(e){ if (optional) return null; throw e; });
}
function mergeDocs(docs, names, runs){
  var meas = {};
  docs.forEach(function(doc, i){
    if (!doc) return;
    if (runs) runs.push({file: names[i], run: doc.run || null});
    Object.keys(doc).forEach(function(k){ if (k !== 'schemaVersion' && k !== 'run') meas[k] = doc[k]; });
  });
  return meas;
}
function loadMeasurements(){
  return Promise.all(DATA_FILES.map(function(n){ return fetchJson(n, false); })).then(function(docs){
    var runs = [], meas = mergeDocs(docs, DATA_FILES, runs);
    /* Optionale Dateien nur laden, wenn der Erzeuger sie in links.json meldet (kein 404 in der Konsole). */
    var wanted = (meas.optional || []).filter(function(n){ return OPTIONAL_DATA.indexOf(n) >= 0; });
    return Promise.all(wanted.map(function(n){ return fetchJson(n, true); })).then(function(extra){
      /* Optionale Dateien behalten ihre Form (board.json folgt tools/planning-map/board.schema.json) und liegen unter ihrem Dateinamen: MEAS.board.
         Erzeugnisse des Laufs (RUN_DATA, nicht die gepflegte milestones.json) zählen trotzdem für den gemeinsamen Stand (#201). */
      extra.forEach(function(doc, i){
        if (!doc) return;
        if (RUN_DATA.indexOf(wanted[i]) >= 0) runs.push({file: wanted[i], run: doc.run || null});
        meas[wanted[i].replace(/\.json$/, '')] = doc;
      });
      meas.runs = runs;
      return meas;
    });
  });
}
/* Wertet data-css-Attribute über die Style-API aus (die Seite erlaubt keine style-Attribute). */
function applyCss(node){
  if (node.nodeType !== 1) return;
  var list = node.hasAttribute('data-css') ? [node] : [];
  Array.prototype.push.apply(list, node.querySelectorAll('[data-css]'));
  list.forEach(function(e){ e.style.cssText = e.getAttribute('data-css'); e.removeAttribute('data-css'); });
}
new MutationObserver(function(muts){ muts.forEach(function(m){ Array.prototype.forEach.call(m.addedNodes, applyCss); }); })
  .observe(document.body, {childList: true, subtree: true});
loadMeasurements().then(startMap).catch(function(e){
  var box = document.getElementById('tm');
  if (box) box.textContent = 'Daten konnten nicht geladen werden / Data could not be loaded: ' + e.message;
});
