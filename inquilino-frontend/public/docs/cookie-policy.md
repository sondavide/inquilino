# Cookie Policy
### ai sensi dell'art. 122 D.Lgs. 196/2003, del Provvedimento Garante 10 giugno 2021 e del GDPR

**Piattaforma:** InquilinoFacile.it  
**Versione:** 1.0  
**Data ultimo aggiornamento:** 13 aprile 2026  

---

## 1. Cosa sono i Cookie

I cookie sono piccoli file di testo che un sito web deposita nel browser dell'utente al momento della visita. Vengono ritrasmessi al sito a ogni visita successiva, consentendo al server di riconoscere il dispositivo e mantenere lo stato della sessione.

---

## 2. Cookie Utilizzati da InquilinoFacile.it

InquilinoFacile.it utilizza due categorie di cookie: **cookie tecnici strettamente necessari** (attivi sempre) e **cookie analitici di terze parti** (attivati solo previo consenso).

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

### 2.3 Cookie Analitici — Google Analytics (previo consenso)

InquilinoFacile.it utilizza **Google Analytics 4** (Google LLC) per misurare il traffico e le interazioni con il sito in forma aggregata e anonimizzata. Questi cookie vengono installati **solo se l'utente acconsente** tramite il banner di scelta cookie.

| Nome | Tipo | Scopo | Durata | Parte |
|------|------|-------|--------|-------|
| `_ga` | Cookie persistente | Distingue gli utenti univoci assegnando un ID casuale anonimo. | 2 anni | Terza parte (Google LLC) |
| `_ga_G-YZQTSGQ7GM` | Cookie persistente | Mantiene lo stato della sessione Analytics per questa proprietà specifica. | 2 anni | Terza parte (Google LLC) |

**Misure di tutela applicate:**
- IP anonimizzato prima dell'invio a Google (`anonymize_ip` attivo per impostazione predefinita in GA4)
- Dati non utilizzati da Google per scopi pubblicitari (configurazione Analytics senza segnali di Google Ads)
- Trasferimento verso USA con garanzie adeguate (Standard Contractual Clauses)

Per maggiori informazioni: [privacy.google.com](https://policies.google.com/privacy)  
Per rinunciare al tracciamento di Google Analytics: [tools.google.com/dlpage/gaoptout](https://tools.google.com/dlpage/gaoptout)

---

## 3. Cookie di Terze Parti

InquilinoFacile.it installa cookie di terze parti **esclusivamente in caso di consenso esplicito** dell'utente. Il fornitore terzo attualmente utilizzato è:

| Fornitore | Finalità | Trasferimento extra-UE |
|-----------|----------|------------------------|
| Google LLC (Google Analytics 4) | Analisi statistica del traffico (anonimizzata) | Sì — USA, con Standard Contractual Clauses (SCC) |

---

## 4. Base Giuridica

| Categoria cookie | Base giuridica |
|------------------|----------------|
| Cookie tecnici (2.1 e 2.2) | Necessità tecnica — non richiedono consenso ai sensi dell'art. 122, comma 1, D.Lgs. 196/2003 e del Provvedimento Garante 10 giugno 2021 |
| Cookie analitici Google Analytics (2.3) | **Consenso preventivo** ai sensi dell'art. 122, comma 1, D.Lgs. 196/2003 e dell'art. 6.1.a GDPR — raccolto tramite banner di scelta cookie prima dell'attivazione dello script |

Il consenso ai cookie analitici è **facoltativo**: rifiutarlo non pregiudica l'accesso al servizio. Il consenso può essere revocato in qualsiasi momento dalle impostazioni del browser o tramite il link "Gestisci preferenze cookie" presente nel footer.

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
**info@inquilinofacile.it**

---

## 8. Modifiche alla Cookie Policy

Ci riserviamo di modificare questa Cookie Policy in caso di variazioni tecnologiche o normative. La data di aggiornamento in cima al documento indica l'ultima versione in vigore.
