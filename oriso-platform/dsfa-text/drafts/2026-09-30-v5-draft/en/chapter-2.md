Chapter 2

## Threshold analysis

Result
DPIA required — carried out

Preliminary questions
Is the processing included in the list of operations for which the competent supervisory authority requires a DPIA (“mandatory list”)? Section 35(5) KDG / Article 35(4) GDPR: No
Does a statutory example apply in which the law presumes a high risk? Section 35(4) KDG / Article 35(3) GDPR: Yes

Assessment questions (WP 248 criteria) — a DPIA is required if two or more answers are yes
Are data subjects evaluated or classified (scoring, profiling)? No
Are automated decisions made with legal effects or similarly significant adverse effects? No
Are data subjects systematically monitored? No
Are confidential, highly personal data or special categories of personal data processed? Yes
Is processing carried out on a large scale? Yes
Are datasets matched or combined? No
Are vulnerable data subjects involved, or do several controllers cooperate? Yes
Are innovative technologies used in a novel way? No
Does processing prevent data subjects from exercising a right? No
Does processing take place in publicly accessible locations? No

A DPIA **must be carried out**: special categories of personal data under Section 11 KDG / Article 9 GDPR are expected, the platform serves a large number of people seeking advice, some particularly vulnerable, and several controllers cooperate.

Technical part — maintained by ORISO — the result paragraph in 2.3 is organisational —

Before carrying out a data protection impact assessment (“DPIA”), it must be assessed whether the processing activity is likely to result in a high risk to the rights and freedoms of natural persons, making a DPIA mandatory under Section 35 KDG / Article 35 GDPR. Assessment has two stages: first the two preliminary questions (the competent supervisory authority’s mandatory list and statutory examples), then the ten assessment questions corresponding to the criteria of the Article 29 Working Party (WP 248).

### 2.1 Preliminary questions

The statutory example applies because processing involves substantial amounts of special categories of personal data under Section 11 KDG / Article 9 GDPR — particularly health data, information about sex life, religious or philosophical beliefs — and also addresses a population that is partly particularly vulnerable.

**Note on the compliance preset.** Under the General Data Protection Regulation, the reasoning follows a different route: online counselling concerning crises and health through digital channels is generally already included in the mandatory lists of the competent state data protection authorities, so the first preliminary question is answered yes there. The threshold analysis has the same result under both regimes; only the chain of reasoning changes.

### 2.2 Assessment questions

The decision rule is: **if two or more questions are answered yes, a DPIA is required.**

**Question 4.** Counselling inherently concerns confidential content; depending on the specialist area, health data and information about substance use, pregnancy, domestic violence or suicidal tendencies are expected. The scope of collection is controlled for each specialist area through the counselling-type configuration (including age, gender, federal state, substances and reason for seeking advice); the platform stores these details in structured form alongside the counselling session. Counselling topics additionally involve categorising information that can itself reveal the reason for seeking advice.

**Question 5.** The platform is designed as a multi-tenant service for numerous organisations, counselling centres and specialist areas; the numbers of registered advice seekers, counselling centres and active counsellors are stated in Chapter 3 with a reporting date. The scale of the population reached already indicates increased risk.

**Question 7.** Several controllers cooperate (platform operator, organisations and counselling centres; see Chapter 5). At the same time, some specialist areas explicitly address vulnerable groups, particularly minors and young adults and people experiencing acute crises or dependency.

**Question 8 — distinction.** The technologies used (the Matrix protocol with Olm/Megolm end-to-end encryption, WebRTC video communication through a self-operated media relay and central identity management) are established, open-source standard technologies in widespread use. They are used here as intended, rather than in a novel manner; this question is therefore answered no. Their use reduces risk and is described in detail in Chapter 6.

**Question 3 — distinction.** No systematic monitoring takes place: there are no tracking or analytics services, advertising networks, external fonts or third-party scripts; no product or error telemetry is collected in users’ browsers. Nevertheless, transparency requires acknowledging that platform operation processes behavioural and presence metadata — notification read times, online status (presence) in the chat service, read receipts and activity times — without combining these to evaluate or monitor individuals. The processing concerned and the planned minimisation measures are described in Sections 6.10, 6.12 and 6.14.

### 2.3 Result

Three of the ten assessment questions are answered yes, exceeding the decision-rule threshold. **A DPIA must be carried out.** The decisive factors are the expected special categories of personal data under Section 11 KDG / Article 9 GDPR, the large scale of processing and cooperation between several controllers involving a partly particularly vulnerable population. This DPIA fulfils that obligation.

The result paragraph also records the operator’s own assessment of the remaining risk; the operator-specific version is maintained through the free-text slot `resultParagraph`.

Organisational part — maintained by the platform operator (contractual documents) — editing in the administration area will follow —

This section describes the organisation, decision-making processes and legal balancing by the organisation. It cannot be derived from source code and is therefore not maintained by ORISO. Until the organisation writes it, the document contains only the draft text, originally collapsed; the square brackets deliberately mark open fields.

Show draft text

Three of the ten assessment questions are answered yes; the threshold is therefore exceeded and a data protection impact assessment must be carried out. The decisive factors are the expected special categories of personal data under Section 11 KDG / Article 9 GDPR, the large scale of processing — as at [date], [number] registered advice seekers in [number] counselling centres — and cooperation between several controllers involving a partly particularly vulnerable population. [Additional controller assessment, e.g. risk classification or special features of individual specialist areas.] This DPIA fulfils that obligation; its result is recorded in Chapter 10.
