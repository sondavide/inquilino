# Deploy InquilinoFacile.it — Guida completa

> VPS OVH Ubuntu (accesso root), dominio `inquilinofacile.it`  
> Stack: PostgreSQL · MinIO · Spring Boot backend · React frontend · Nginx · Let's Encrypt  
> Monitoring: Prometheus · cAdvisor · node_exporter · Loki · Promtail · Grafana (alert via email)

---

## Prerequisiti locali (prima di toccare il server)

1. **Immagini Docker pubblicate** su ghcr.io  
   Vai su GitHub → Actions → "Build & Push Backend" → Run workflow  
   Poi ripeti per "Build & Push Frontend"

2. **DNS configurato**  
   Nel pannello OVH, entrambi i record devono puntare all'IP del VPS:
   ```
   A   inquilinofacile.it      → <IP_VPS>
   A   www.inquilinofacile.it  → <IP_VPS>
   ```
   Aspetta la propagazione DNS (5–30 min) prima di richiedere il certificato.

3. **OAuth2** (se usi login social)  
   Aggiungi nelle console Google / Facebook / LinkedIn:
   ```
   https://inquilinofacile.it/login/oauth2/code/google
   https://inquilinofacile.it/login/oauth2/code/facebook
   https://inquilinofacile.it/login/oauth2/code/linkedin
   ```

---

## Step 1 — Connessione al VPS e installazione Docker

```bash
ssh root@<IP_VPS>
```

```bash
# Aggiorna sistema
apt-get update && apt-get upgrade -y

# Installa dipendenze
apt-get install -y ca-certificates curl gnupg

# Aggiungi repo Docker ufficiale
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verifica
docker --version
docker compose version
```

---

## Step 2 — Crea utente applicativo e cartella di lavoro

```bash
useradd -m -s /bin/bash inquilinofacile
usermod -aG docker inquilinofacile

mkdir -p /opt/inquilinofacile
chown inquilinofacile:inquilinofacile /opt/inquilinofacile
```

---

## Step 3 — Copia i file di deploy sul server

Dal tuo PC locale, dalla root del repository:

```bash
scp -r deployment/production/ root@<IP_VPS>:/opt/inquilinofacile/
```

Sul server:

```bash
cd /opt/inquilinofacile/production
```

La struttura sarà:
```
/opt/inquilinofacile/production/
├── docker-compose.yml
├── .env.example
├── nginx/
│   └── app.conf
├── monitoring/
│   ├── prometheus/prometheus.yml
│   ├── loki/loki-config.yaml
│   ├── promtail/promtail-config.yaml
│   └── grafana/
│       ├── config.env
│       └── provisioning/
│           ├── datasources/
│           └── alerting/
├── scripts/
│   └── init-letsencrypt.sh
└── data/          ← creata automaticamente (dati persistenti)
    ├── postgres/
    ├── minio/
    └── certbot/
```

I dati dei volumi named (Prometheus, Loki, Grafana) sono gestiti da Docker in `/var/lib/docker/volumes/`.

> **Backup e migrazione**: per i dati relazionali e file usa `data/`. Per i volumi named vedi la sezione Backup.

---

## Step 4 — Crea il file .env

```bash
cp .env.example .env
nano .env
```

Compila tutti i campi `CHANGE_ME`. In particolare:

| Variabile | Note |
|-----------|------|
| `DB_PASSWORD` | Password robusta, min 20 caratteri |
| `JWT_SECRET` | Genera con: `openssl rand -base64 64` |
| `OPENAI_API_KEY` | Chiave OpenAI dal dashboard |
| `SUPERADMIN_PASSWORD` | Password admin iniziale |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | Credenziali MinIO |
| `GRAFANA_ADMIN_PASSWORD` | Password accesso Grafana |
| `GRAFANA_SMTP_PASSWORD` | Password SMTP per alert email (OVH) |

---

## Step 5 — Autenticazione su ghcr.io

Le immagini sono nel tuo repository privato. Il VPS deve poter scaricarle:

```bash
# Crea un Personal Access Token su GitHub con scope: read:packages
# Settings → Developer settings → Personal access tokens → Tokens (classic)

echo "<GITHUB_PAT>" | docker login ghcr.io -u sondavide --password-stdin
```

---

## Step 6 — Ottieni il certificato SSL (una tantum)

```bash
chmod +x scripts/init-letsencrypt.sh
bash scripts/init-letsencrypt.sh
```

Lo script:
1. Scarica i parametri TLS raccomandati
2. Crea un certificato self-signed temporaneo
3. Avvia nginx
4. Richiede il certificato reale a Let's Encrypt via webroot
5. Ricarica nginx con il certificato reale

> **Prerequisito**: la porta 80 deve essere libera e il DNS già propagato.

---

## Step 7 — Avvia lo stack completo

```bash
docker compose up -d
```

Verifica che tutti i container siano `running`:

```bash
docker compose ps
```

Controlla i log del backend (attendi che Flyway applichi le migration):

```bash
docker compose logs -f backend
```

Quando vedi `Started InquilinoBackendApplication`, il backend è pronto.

---

## Step 8 — Verifica finale

```bash
# Health check backend
curl https://inquilinofacile.it/api/ping

# Certificato SSL
curl -I https://inquilinofacile.it
```

Apri `https://inquilinofacile.it` nel browser: dovresti vedere la landing page.

---

## Accesso ai pannelli di amministrazione (SSH tunnel)

Tutti i pannelli interni sono accessibili **solo via SSH tunnel**, non esposti su internet.

```bash
# MinIO console → http://localhost:9001
ssh -L 9001:localhost:9001 root@<IP_VPS>

# Adminer (DB) → http://localhost:8888
ssh -L 8888:localhost:8888 root@<IP_VPS>

# Grafana (monitoring) → http://localhost:3000
ssh -L 3000:localhost:3000 root@<IP_VPS>
```

Per aprire più tunnel nella stessa sessione:

```bash
ssh -L 9001:localhost:9001 -L 8888:localhost:8888 -L 3000:localhost:3000 root@<IP_VPS>
```

### Primo accesso a Grafana

1. Apri `http://localhost:3000`
2. Login: `admin` / valore di `GRAFANA_ADMIN_PASSWORD` nel tuo `.env`
3. Le dashboard e le regole di alert sono già caricate tramite provisioning
4. Per testare l'invio email: **Alerting → Contact points → email-alerts → Test**

---

## Monitoring — cosa viene monitorato

### Alert infrastruttura (Prometheus)
| Alert | Soglia | Severità |
|---|---|---|
| CPU alta | >85% per 5 min | warning |
| RAM alta | >90% per 5 min | warning |
| Disco alto | >90% | critical |
| Container down | assente da >2 min (backend, postgres, nginx, minio) | critical |

### Alert applicativi (Loki)
| Alert | Condizione | Severità |
|---|---|---|
| Nginx 503 | almeno 1 errore in 5 min | critical |
| PostgreSQL unreachable | >3 errori di connessione in 5 min | critical |

### Politica notifiche email
- **critical**: email entro 10 secondi, ripete ogni ora
- **warning**: email entro 30 secondi, ripete ogni 4 ore
- Destinatario: `sondavide@msn.com`

---

## Aggiornare le immagini (deploy nuovo rilascio)

1. Pubblica la nuova immagine da GitHub Actions (con tag specifico o `latest`)
2. Sul server:

```bash
cd /opt/inquilinofacile/production

docker compose pull backend frontend
docker compose up -d --no-deps backend frontend
```

---

## Comandi utili

```bash
# Log in tempo reale
docker compose logs -f backend
docker compose logs -f nginx
docker compose logs -f grafana

# Stato di tutti i servizi
docker compose ps

# Riavvia un singolo servizio
docker compose restart backend

# Entrare nel container del backend
docker compose exec backend sh

# Entrare nel database
docker compose exec postgres psql -U inquilino -d inquilino

# Rinnovo manuale del certificato SSL (normalmente automatico)
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload

# Fermare tutto (i dati restano intatti)
docker compose down

# Fermare e rimuovere container orfani
docker compose down --remove-orphans
```

---

## Backup dei dati

### Dati applicativi (bind mount in `data/`)

```bash
# Backup completo bind mounts
tar czf backup-data-$(date +%Y%m%d).tar.gz /opt/inquilinofacile/production/data/

# Solo database
docker compose exec postgres pg_dump -U inquilino inquilino > backup-db-$(date +%Y%m%d).sql

# Restore database
cat backup-db.sql | docker compose exec -T postgres psql -U inquilino -d inquilino
```

### Dati monitoring (volumi named Docker)

```bash
# Backup Grafana (dashboard custom, utenti, alert history)
docker run --rm \
  -v production_grafana_data:/data:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/backup-grafana-$(date +%Y%m%d).tar.gz -C /data .

# Backup Prometheus (metriche storiche)
docker run --rm \
  -v production_prometheus_data:/data:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/backup-prometheus-$(date +%Y%m%d).tar.gz -C /data .

# I log Loki sono riproducibili da Docker, backup opzionale
```

> Il prefisso `production_` nei nomi dei volumi è aggiunto da Docker Compose dal nome della cartella di lavoro.

---

## Firewall (raccomandato)

```bash
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (redirect a HTTPS)
ufw allow 443/tcp   # HTTPS
ufw enable
```

Tutte le porte interne sono legate a `127.0.0.1` e non raggiungibili dall'esterno:

| Porta | Servizio |
|---|---|
| 5432 | PostgreSQL |
| 9000/9001 | MinIO / MinIO Console |
| 8080 | Backend (diretto, bypassa nginx) |
| 8888 | Adminer |
| 3000 | Grafana |
