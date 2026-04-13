# 🚀 Deployment Quick Start

Nachdem Sie die **consolidated README.md** gelesen haben, führen Sie diese Schritte aus:

---

## 1️⃣ GitHub Repository erstellen

1. Gehen Sie auf [github.com/new](https://github.com/new)
2. **Repository name:** `sc-lainsitztal-wochenplaner`
3. **Description:** Wochenplaner mit ÖFB Webcal Integration
4. **Visibility:** Public (damit Render zugreifen kann)
5. **Klick:** "Create repository"

---

## 2️⃣ Code zu GitHub pushen

Im Terminal (in `d:\Projects\WeekSchedule\`):

```bash
# Remote hinzufügen (YOUR_USERNAME ersetzen)
git remote add origin https://github.com/YOUR_USERNAME/sc-lainsitztal-wochenplaner.git

# Branch umbenennen falls nötig
git branch -M main

# Hochladen
git push -u origin main
```

✅ Ihr Code ist jetzt auf GitHub!

---

## 3️⃣ Render.com Web Service erstellen

1. **[render.com](https://render.com)** öffnen → Sign up/Login
2. **Dashboard** → **New +** → **Web Service**
3. **GitHub Repository verbinden:**
   - Klick auf GitHub → Autorisieren
   - Repository auswählen: `sc-lainsitztal-wochenplaner`
   - Klick: "Connect"

4. **Konfiguriere Service:**
   ```
   Name:                sc-lainsitztal-wochenplaner
   Environment:         Node
   Region:              Frankfurt (eu-central-1)
   Branch:              main
   Build Command:       npm install
   Start Command:       npm start
   ```

5. **Scroll down** → **"Create Web Service"**

⏳ **Deployment läuft... (~2-3 Minuten)**

---

## 4️⃣ Environment Variables auf Render setzen

1. **Render Dashboard** → **Ihr Service** → **Settings**
2. **Tab: "Environment"** öffnen
3. **Add Environment Variable** für jede Zeile:

```
PORT                3000
NODE_ENV            production
WEBCAL_U7           https://www.fussballoesterreich.at/netzwerk/icalendar/[U7-URL-HIER]
WEBCAL_U8           https://www.fussballoesterreich.at/netzwerk/icalendar/[U8-URL-HIER]
WEBCAL_U10          https://www.fussballoesterreich.at/netzwerk/icalendar/[U10-URL-HIER]
WEBCAL_U11          https://www.fussballoesterreich.at/netzwerk/icalendar/[U11-URL-HIER]
WEBCAL_U12          https://www.fussballoesterreich.at/netzwerk/icalendar/[U12-URL-HIER]
WEBCAL_U13          https://www.fussballoesterreich.at/netzwerk/icalendar/[U13-URL-HIER]
WEBCAL_U14          https://www.fussballoesterreich.at/netzwerk/icalendar/[U14-URL-HIER]
WEBCAL_U15          https://www.fussballoesterreich.at/netzwerk/icalendar/[U15-URL-HIER]
LOG_LEVEL           info
```

4. **"Save"** klicken
5. Service wird **automatisch neu gestartet**

✅ **App ist jetzt live!**

---

## 5️⃣ Live-URL testen

Im Render Dashboard:
- **URL kopieren** (Format: `https://sc-lainsitztal-wochenplaner.onrender.com`)
- **In Browser öffnen**
- ✅ Wochenplaner sollte laden
- ✅ Spiele sollten angezeigt werden (aus Webcal)
- ✅ **+ Spiel**, **🔄 Sync**, **⬇ Export** testen

---

## 🔄 Auto-Deploy aktivieren

**Optional:** Render kann automatisch deployen bei jedem GitHub Push:

1. **Render Dashboard** → **Settings**
2. **Auto-Deploy** → **Yes**
3. Jetzt: `git push` = Auto-Deploy ✨

---

## 📞 Troubleshooting

| Problem | Lösung |
|---------|--------|
| **Spiele laden nicht** | .env-Variablen in Render checken, neu starten |
| **Fehler im Logs** | Render Dashboard → **Logs** → Fehlertext copieren |
| **Deploy gescheitert** | Build Logs prüfen, `npm install` funktioniert? |
| **URL nicht erreichbar** | Service noch starten (~2 min), Render F5 drücken |

---

**Viel Erfolg!** ⚽🎉

Falls Probleme: Siehe **README.md** → **FAQ & Troubleshooting** Abschnitt
