# Cookie Policy
### ai sensi dell'art. 122 D.Lgs. 196/2003, del Provvedimento Garante 10 giugno 2021 e del GDPR

**Piattaforma:** InquilinoFacile.it  
**Versione:** 1.0  
**Data ultimo aggiornamento:** 08 aprile 2026  

---

## 1. Cosa sono i Cookie

I cookie sono piccoli file di testo che un sito web deposita nel browser dell'utente al momento della visita. Vengono ritrasmessi al sito a ogni visita successiva, consentendo al server di riconoscere il dispositivo e mantenere lo stato della sessione.

---

## 2. Cookie Utilizzati da InquilinoFacile.it

InquilinoFacile.it utilizza **esclusivamente cookie tecnici strettamente necessari**. Non utilizziamo cookie di profilazione, cookie di tracciamento pubblicitario né SDK di analisi di terze parti (es. Google Analytics, Hotjar, Meta Pixel).

### 2.1 Cookie Tecnici di Sessione (JWT)

| Nome | Tipo | Scopo | Durata | Prima / Terza parte |
|------|------|-------|--------|---------------------|
| `auth_token` | Cookie di sessione / HTTP-only | Contiene il token JWT per mantenere l'utente autenticato dopo il login. Senza questo cookie non è possibile utilizzare le funzionalità autenticate della piattaforma. | Sessione (scade alla chiusura del browser) o fino a scadenza del token (configurabile, default: 24 ore) | Prima parte (InquilinoFacile.it) |
| `refresh_token` | Cookie persistente / HTTP-only / Secure | Token di rinnovo della sessione, consente di mantenere l'accesso senza reinserire le credenziali. | 30 giorni (rinnovabile ad ogni accesso attivo) | Prima parte (InquilinoFacile.it) |

**Attributi di sicurezza applicati:**
- `HttpOnly`: il cookie non è accessibile via JavaScript, prevenendo attacchi XSS
- `Secure`: il cookie è trasmesso solo su connessioni HTTPS
- `SameSite=Strict`: il cookie non viene inviato in richieste cross-site, prevenendo attacchi CSRF

### 2.2 Cookie di Preferenze UI (opzionale)

| Nome | Tipo | Scopo | Durata | Prima / Terza parte |
|------|------|-------|--------|---------------------|
| `ui_preferences` | Cookie persistente | Memorizza preferenze dell'interfaccia (es. lingua, tema). Non contiene dati personali identificativi. | 12 mesi | Prima parte (InquilinoFacile.it) |

---

## 3. Cookie di Terze Parti

Al momento InquilinoFacile.it **non installa cookie di terze parti**. 

Nel caso in cui future integrazioni (es. analytics, mappe) richiedano cookie di terze parti, questa policy sarà aggiornata e, ove necessario, sarà richiesto il consenso preventivo dell'utente attraverso un banner di cookie management.

---

## 4. Base Giuridica

I cookie tecnici elencati al punto 2.1 e 2.2 sono necessari per l'erogazione del servizio richiesto dall'utente e rientrano nella categoria dei **cookie strettamente necessari**, per i quali non è richiesto il consenso ai sensi dell'art. 122, comma 1, D.Lgs. 196/2003 e del Provvedimento del Garante Privacy del 10 giugno 2021.

Non essendovi cookie di profilazione o analitici, non viene mostrato un banner di consenso ai cookie. Qualora venissero introdotte categorie di cookie che richiedono consenso, il meccanismo di raccolta del consenso sarà implementato prima del rilascio.

---

## 5. Come Gestire o Disabilitare i Cookie

Puoi gestire, bloccare o eliminare i cookie direttamente dalle impostazioni del tuo browser:

- **Google Chrome:** Impostazioni → Privacy e sicurezza → Cookie e altri dati dei siti
- **Mozilla Firefox:** Impostazioni → Privacy e sicurezza → Cookie e dati dei siti
- **Safari:** Preferenze → Privacy → Gestisci dati siti web
- **Microsoft Edge:** Impostazioni → Cookie e autorizzazioni del sito

> **Attenzione:** Disabilitare o eliminare il cookie `auth_token` comporterà la disconnessione automatica dalla piattaforma. I cookie tecnici di sessione sono necessari per il funzionamento del servizio.

---

## 6. Conservazione dei Dati di Sessione

I dati associati ai token di sessione (es. identificativo utente, timestamp di login, IP di accesso) sono conservati nel database della piattaforma per un massimo di **12 mesi** a fini di sicurezza e audit, ai sensi dell'art. 6.1.f GDPR (legittimo interesse alla sicurezza informatica).

---

## 7. Contatti

Per qualsiasi domanda relativa all'utilizzo dei cookie su InquilinoFacile.it, scrivi a:  
**privacy@inquilinofacile.it**

---

## 8. Modifiche alla Cookie Policy

Ci riserviamo di modificare questa Cookie Policy in caso di variazioni tecnologiche o normative. La data di aggiornamento in cima al documento indica l'ultima versione in vigore.
