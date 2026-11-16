# Team functions and term sweep: input snapshot, 7 November 2026

Editorial input for the glossary. It records the naming confirmed by the product owner on 7 November 2026,
and the measurements behind it. It is not an architecture decision and not runtime verification.

## The two team functions

| | Teamberatung / Team counselling | Team-Chat / Team chat |
| --- | --- | --- |
| Set by | Counselling centre (agency setting `teamAgency`) | Provider (switch `featureTeamDiscussionEnabled`) |
| Meaning | All counsellors of the counselling centre see all chats and can join at any time. | Counsellors coordinate on an open enquiry in a team-only room. The room closes when the enquiry is accepted. |
| Earlier names in the Admin UI | Teamberatungsstelle, Team counseling center, Teamberatung anbieten | Team-Besprechung, Team discussion, "Teamchats" (used for the chats of the first function) |

The product owner asked that both functions carry one name and one description wherever they can be set
(provider functions tab, counselling centre master data), and that the glossary names them.
The Admin reads both strings from one shared source (`teamFunctions.*` in the Admin locale files).

Open follow-ups outside the glossary: the counsellor app still shows "Team-Besprechung" / "Team discussion";
ADR-016 keeps its historical title.

## Term sweep: spelling variants seen in the Admin locale files

Counts are translation strings, not page views, measured on 7 November 2026.

- Counselling centre (English): agency 129, counselling centre(s) 132, counseling center(s) 31, advice center/centre 24, consulting center 4, advisory center 2.
- Counsellor (English): counsellor 141, advisor 22, consultant 29, counselor 23.
- Help-seeker (English): advice seeker 70, client 9, help seeker 1.
- Administrator roles: Träger-Admin 45, Plattform-Admin 34, BST-Admin 22, Beratungsstellen-Admin 9, Agentur-Admin 4; tenant admin 37, platform admin 35, agency admin 30.
- Counsellor, German gender forms: Berater:in 50, Berater*in 15, Berater_in 3.

Preferred terms stay as already recorded in the catalog. The variants above are search aliases only.
Renaming user-facing text beyond the two team functions needs a separate decision.
