---
title: "DSFA-Quellen, Versionen und Veröffentlichung"
description: "Wie technische Nachweise und zweisprachige Rechtsdokumente vorbereitet, geprüft und verknüpft werden, ohne die DSFA zu kopieren."
source: "docs/platform/dpia-publication.md"
---

Die verbindliche DSFA liegt unter [Understand Legal](https://understand.oriso.org/legal/dsfa/). Diese Seite erklärt den technischen Veröffentlichungsweg. Sie kopiert oder genehmigt das Rechtsdokument nicht.

## Quellen und Nachweise

[PR119](https://github.com/OpenResilienceInitiative/ORISO-Docs/pull/119) enthält die Kapitelquellen, Belegkarte, Versionsgeschichte und den zweisprachigen Prüfentwurf. Repository-ADRs erklären die technischen Entscheidungen. Graphbelege beschreiben angegebene Repository-Referenzen und vollständige Quellcommits; sie belegen weder das Live-Verhalten noch rechtliche Konformität.

Beginne mit dem [technischen Verfahren](https://understand.oriso.org/legal/dsfa/#kap6), den [Betroffenenrechten](https://understand.oriso.org/legal/dsfa/#kap8) und dem [Ergebnis](https://understand.oriso.org/legal/dsfa/#kap10) der DSFA. Diese Links führen zur eigenen Version des veröffentlichten Dokuments. Sie kann von einem neueren Dev-Prüfpaket abweichen.

## Bindung der deutschen und englischen Fassung

Jedes Entwurfskapitel besitzt eine stabile Kapitel-ID, Hashes der deutschen und englischen Quelle sowie eine Übersetzungsbindung. Eine Änderung der deutschen Quelle macht die englische Bindung ungültig, bis das Paar geprüft wurde. HTML und PDF verwenden dieselbe geprüfte Spracheingabe, Version und dasselbe Datum. Ein Artefaktmanifest hält ihre Byte-Hashes und die Hashes der Render-Eingaben fest.

Das September-Prüfpaket enthält alle zehn Kapitel, den Auszug aus Anlage1 und das Anlagenverzeichnis. Anlage2 fehlt weiterhin. Betreiberfelder und widersprüchliche Quellaussagen benötigen eine Prüfung durch die Verantwortlichen; eine vollständige Übersetzung ist keine Freigabe.

## Drei getrennte Freigaben

Die technische Prüfung kontrolliert Quellaussagen und die Konsistenz der Artefakte. Die Betreiberprüfung bestätigt den tatsächlichen Verantwortlichen, Prozesse und organisatorische Angaben. Die juristische Prüfung bewertet die konkreten Texte und Anlagen. Jeder Nachweis muss prüfende Person, Zeitpunkt und Beleg nennen und dieselbe Version und denselben Manifest-Hash binden. Ein Nachweis für einen anderen Quellenstand wird zurückgewiesen.

Entwürfe dürfen erzeugt werden, während Freigaben fehlen. Eine öffentliche Aktivierung muss fehlende Freigaben, fehlende Anlagen und ungeklärte Voraussetzungen zurückweisen. Interne Hinweise werden vor dem Export aus HTML und PDF entfernt; sie lediglich mit CSS auszublenden reicht nicht.

## Veröffentlichung und Prüfung

Quellbelege werden mit jedem veröffentlichten Plattform-Release anhand seiner exakten Repository-Versionen und vollständigen Commitliste erneut geprüft. Ein Dev-Merge oder zeitgesteuerter Lauf darf keinen neuen öffentlichen Graphen oder technischen Dokumentationsstand veröffentlichen. Geänderte juristische Aussagen gehen in die Prüfliste; die drei Freigaben binden weiterhin unabhängig die konkrete DSFA-Version.

Historische Veröffentlichungen bleiben unverändert. Eine neue freigegebene Version erhält ihr eigenes Verzeichnis und Inhaltsmanifest. Der aktuelle Verweis wechselt erst, nachdem das neue Artefakt geprüft wurde. Deutsches HTML, englisches HTML und beide PDFs müssen dieselbe freigegebene Version ausweisen.

Vergleiche nach der Aktivierung die tatsächlich öffentlichen Bytes mit dem geprüften Manifest. Prüfe Kapitellinks, Sprachwechsel und PDF-Downloads im Browser. Lokaler Build, gemergter PR und öffentlicher Rückvergleich sind getrennte Nachweise.

## Grenze des aktuellen Prüfpakets

Die am 30.September2026 gelesene Live-Seite zeigte v0.1-draft vom14.August, während die PDF-Beschriftung den17.August nannte. Der neue v5-draft ist ein Prüfpaket. Veröffentlichung, Betreiber- und juristische Freigabe sowie die fehlende Anlage2 bleiben in [Issue80](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/80) offen; diese Seite behauptet keine Aktualisierung der Live-Version.

Die technische Docs-Veröffentlichung wird getrennt in [Issue140](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/140) verfolgt. [Graph-Herkunft](/de/plattform/knowledge-graphs/understand-anything) erklärt den Unterschied zwischen Quellgeneration und veröffentlichtem Understand-Graph.
