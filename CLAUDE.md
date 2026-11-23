# Kraftwerk (kraftwerk.ascensus.fit)

Kraftwerk ist das Trainingsbuch von ASCENSUS (Patrick Spengler) als installierbare App
(PWA). Reines HTML, CSS und Vanilla-JavaScript, kein Build-Schritt, kein Paketmanager.
Es ist am Anfang aus `trainingsbuch.html` des Repos `ascensus-homepage` hervorgegangen;
**ab jetzt wird hier weiterentwickelt, nicht mehr dort** (dort liegt nur noch eine
Weiterleitung).

Die Daten liegen unverändert in PocketBase (`https://pb.ascensus.fit`, Sammlungen
`trainingsbuch_entries`, `trainingsplaene`, `koerperwerte`, `uebung_notizen`,
`uebungskatalog`, `tests`, `test_ergebnisse` u. a.). Mitgliederbereich auf ascensus.fit
(Dashboard, Badges) und der Coach-Bereich (`coach.ascensus.fit`) lesen dieselben Daten.
Der PocketBase-Zugang läuft über das Mitglieder-Konto (`members`), wie im
Mitgliederbereich: gleiche Zugangsdaten, aber **die Anmeldung gilt je Adresse**, hier
meldet man sich einmal separat an.

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | die ganze App (HTML, CSS und JS in einer Datei, wie bisher) |
| `login.html` | Anmeldung, Passwort-Link anfordern, Installationshinweis |
| `manifest.webmanifest` | Name, Icons, Farben, `display: standalone` |
| `sw.js` | Service Worker (App-Hülle offline, siehe unten) |
| `kw-app.js` | Registriert den Service Worker, zeigt den Installationshinweis |
| `icons/` | App-Icons (Platzhalter: ASCENSUS-Bildmarke auf Olivgrün) |
| `ascensus.css`, `ascensus.js`, `Inter-*`, `fonts/`, `logo-wordmark.png`, `pocketbase.umd.js` | Kopien aus `ascensus-homepage`, damit nichts von Drittservern geladen wird |

Die Kopfzeile der App stammt von der Website; ihre Verweise (Übersicht, Quiz, Badges,
Profil) zeigen absolut auf `https://ascensus.fit/…`. Impressum und Datenschutz stehen im
Fuß der Übersicht und auf der Anmeldeseite und zeigen ebenfalls dorthin.

## Service Worker: VERSION hochzählen

`sw.js` hält die App-Hülle (Liste `SHELL`) im Cache, damit Kraftwerk auch bei schlechtem
Empfang öffnet. Seiten lädt er zuerst aus dem Netz (nach 4 s Rückfall auf den Cache),
alle anderen Dateien aus dem Cache und erneuern sie im Hintergrund. PocketBase-Aufrufe
fasst er nie an: **Daten werden nur mit Verbindung gespeichert** (ein Offline-Speichern
mit späterem Abgleich gibt es noch nicht).

- Neue Datei, die die App braucht (Skript, Schrift, Bild)? In `SHELL` eintragen.
- Datei der Hülle geändert? `VERSION` in `sw.js` hochzählen (`kw-1` → `kw-2`), sonst
  halten Geräte die alte Fassung, bis der Hintergrundabgleich sie erneuert hat.

## Anmeldung

`index.html` leitet ohne gültige Anmeldung auf `login.html`. Bei jedem Start wird die
Anmeldung per `authRefresh()` verlängert (wer die App regelmäßig öffnet, bleibt drin);
lehnt PocketBase den Token ab (401/403/404), geht es mit Hinweis auf die Anmeldung,
ohne Netz bleibt alles, wie es ist.

## Deployment

Coolify (Hostinger-VPS), Quelle GitHub App, Build strategy *Static*, `nginx:alpine`,
Publish directory `/`, Domain `kraftwerk.ascensus.fit` (A-Eintrag `kraftwerk` auf die
IP des VPS bei Porkbun), Auto-Deploy aktiv:

```
Push auf main  →  GitHub sendet push  →  Coolify deployt  →  live
```

### nginx-Konfiguration liegt in Coolify, nicht hier

*General → Build pipeline → Custom Nginx configuration*. Sie ist nicht versioniert,
deshalb hier eine Kopie:

```nginx
server {
    root /usr/share/nginx/html;

    add_header Cache-Control "no-cache" always;
    add_header X-Robots-Tag "noindex, nofollow" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Interne Dateien nicht ausliefern (Publish directory ist /)
    location ~ ^/(tools|\.claude|\.git)(/|$) { return 404; }
    location = /CLAUDE.md { return 404; }

    location / {
        index index.html;
        try_files $uri $uri/ =404;
    }

    # nginx:alpine kennt die Endung .webmanifest nicht, ohne das kommt octet-stream
    location = /manifest.webmanifest {
        default_type application/manifest+json;
        add_header Cache-Control "no-cache" always;
    }

    # Der Service Worker darf nie lange im Cache liegen, sonst kommen Updates nicht an
    location = /sw.js {
        add_header Cache-Control "no-cache" always;
    }

    location ~* \.(woff2|woff)$ {
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }
    location ~* \.(png|ico|svg)$ {
        add_header Cache-Control "public, max-age=604800" always;
    }
    location ~* \.(css|js)$ {
        add_header Cache-Control "public, max-age=3600, must-revalidate" always;
    }
}
```

Prüfen:

```bash
curl -sSI https://kraftwerk.ascensus.fit/ | grep -i -E "cache-control|x-robots"
curl -sSI https://kraftwerk.ascensus.fit/sw.js | grep -i cache-control          # no-cache
curl -sSI https://kraftwerk.ascensus.fit/manifest.webmanifest | grep -i content-type
curl -sSI https://kraftwerk.ascensus.fit/CLAUDE.md | head -1                     # 404
```

## Konventionen

- Deutsche Oberfläche, Dezimalkomma, Umlaute ausgeschrieben im Code, echte Umlaute im Text.
- Keine Ressourcen von Drittservern, alles liegt lokal im Repo. Kein Cookie-Banner nötig:
  die App setzt keine Cookies und nutzt keinen Analyse- oder Werbedienst (nur lokaler
  Speicher für Anmeldung und Einstellungen, in der Datenschutzerklärung genannt). Kommt
  je ein Tracking-Dienst dazu, Klaro und die Datenschutzerklärung (DE und EN in
  `ascensus-homepage`) mit anpassen.
- Der Plan-Editor ist die Vorlage für den Plan-Editor im Coach-Bereich (Repo `coach`,
  `index.html`). Änderungen hier bei Bedarf dort nachziehen.
- Eine englische Fassung gibt es nicht (das Trainingsbuch war nie übersetzt).
- Die Icons sind Platzhalter. Ein eigenes Kraftwerk-Logo: `icons/` ersetzen (192, 512,
  maskable 512 mit Sicherheitszone, Apple-Touch 180, Favicon 64) und `VERSION` hochzählen.
