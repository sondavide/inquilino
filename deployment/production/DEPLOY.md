# Deploy InquilinoFacile.it — Guida completa

> VPS OVH Ubuntu (accesso root), dominio `inquilinofacile.it`  
> Stack: PostgreSQL + MinIO + Spring Boot backend + React frontend + Nginx + Let's Encrypt

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
# Crea utente non-root per l'app (opzionale ma consigliato)
useradd -m -s /bin/bash ubuntu
usermod -aG docker ubuntu

# Cartella di lavoro
mkdir -p /opt/inquilinofacile
chown ubuntu:ubuntu /opt/inquilinofacile
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
├── scripts/
│   └── init-letsencrypt.sh
└── data/          ← creata automaticamente (dati persistenti)
    ├── postgres/  ← database PostgreSQL
    ├── minio/     ← file MinIO
    └── certbot/   ← certificati SSL
```

> **Backup e migrazione**: per spostare tutti i dati su un altro server basta copiare la cartella `data/`.

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

MinIO console e Adminer sono accessibili **solo via SSH tunnel**, non esposti su internet.

```bash
# MinIO console → http://localhost:9001
ssh -L 9001:localhost:9001 root@<IP_VPS>

# Adminer (DB) → http://localhost:8888
ssh -L 8888:localhost:8888 root@<IP_VPS>
```

---

## Aggiornare le immagini (deploy nuovo rilascio)

1. Pubblica la nuova immagine da GitHub Actions (inserisci tag, es. `1.1.0`)
2. Sul server:

```bash
cd /opt/inquilinofacile/production

# Aggiorna il tag nel .env se hai usato un tag specifico
# oppure scarica semplicemente latest:

docker compose pull backend frontend
docker compose up -d --no-deps backend frontend
```

---

## Comandi utili

```bash
# Log in tempo reale di un servizio
docker compose logs -f backend
docker compose logs -f nginx

# Riavvia un singolo servizio
docker compose restart backend

# Stato di tutti i servizi
docker compose ps

# Entrare nel container del backend
docker compose exec backend sh

# Entrare nel database
docker compose exec postgres psql -U inquilino -d inquilino

# Rinnovo manuale del certificato SSL (normalmente automatico)
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload

# Fermare tutto (i dati in ./data/ restano intatti)
docker compose down

# Fermare e rimuovere anche i container orfani
docker compose down --remove-orphans
```

---

## Backup dei dati

I dati persistenti sono tutti nella cartella `data/`:

```bash
# Backup completo
tar czf backup-$(date +%Y%m%d).tar.gz /opt/inquilinofacile/production/data/

# Solo database
docker compose exec postgres pg_dump -U inquilino inquilino > backup-db-$(date +%Y%m%d).sql

# Restore database
cat backup-db.sql | docker compose exec -T postgres psql -U inquilino -d inquilino
```

---

## Firewall (raccomandato)

```bash
# Consenti solo le porte necessarie
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (redirect a HTTPS)
ufw allow 443/tcp   # HTTPS
ufw enable
```

Le porte 5432 (Postgres), 9000/9001 (MinIO), 8080 (Backend), 8888 (Adminer) sono legate a `127.0.0.1` e non raggiungibili dall'esterno.
