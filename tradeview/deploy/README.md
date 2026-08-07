# Déploiement AWS

Le moteur et IB Gateway tournent sur une seule instance EC2. Rien n'est exposé
sur Internet : on atteint le moteur par un tunnel SSH.

## Pourquoi cette forme

**Une seule instance.** Séparer le Gateway du moteur ajouterait un saut réseau
entre eux sans rien apporter — ils se parlent en `localhost`.

**Rien d'ouvert sauf SSH.** Le WebSocket accepte `PlaceOrder`. Ouvrir le port
8080 ferait du jeton partagé la seule chose entre un inconnu et ton compte.
Le tunnel supprime le problème plutôt que de l'atténuer.

**`t3.small`, pas plus.** IB Gateway réclame 1,5 à 2 Go ; le moteur Rust, 50 Mo.
Le `t3.micro` de l'offre gratuite (1 Go) ne tiendra pas. Au-delà de 2 Go, tu
paierais du processeur qui s'ennuie : le goulot est la latence réseau vers le
CME, jamais le calcul.

## 1. Provisionner

```bash
cd tradeview/deploy/terraform

terraform init
terraform apply \
  -var="ssh_public_key=$(cat ~/.ssh/id_ed25519.pub)" \
  -var="operator_cidr=$(curl -s https://checkip.amazonaws.com)/32"
```

`operator_cidr` n'a volontairement pas de valeur par défaut : ouvrir SSH au
monde entier doit être une décision, jamais un oubli.

Terraform affiche à la fin l'adresse IP et les commandes de tunnel.

## 2. Renseigner les identifiants

Rien de secret ne passe par Terraform ni par les données utilisateur — celles-ci
sont lisibles depuis le service de métadonnées de l'instance.

```bash
ssh ubuntu@<IP>
sudo -u tradeview nano /opt/tradeview/ibc.env
```

Renseigne `IB_LOGIN_ID` (ton identifiant paper, `ekpvlj045`) et `IB_PASSWORD`.
Le fichier est en `600`, lisible du seul compte de service.

## 3. Installer les services

```bash
scp tradeview/deploy/systemd/*.service ubuntu@<IP>:/tmp/
ssh ubuntu@<IP> 'sudo mv /tmp/*.service /etc/systemd/system/ && sudo systemctl daemon-reload'
```

## 4. Envoyer le moteur

Compilé pour Linux depuis ton Mac (voir `scripts/deploy-engine.sh`), ou
directement sur l'instance.

```bash
./tradeview/deploy/scripts/deploy-engine.sh <IP>
```

## 5. Démarrer

```bash
ssh ubuntu@<IP>
sudo systemctl enable --now ibgateway
# Laisse au Gateway le temps de se connecter avant de lancer le moteur.
sleep 60
sudo systemctl enable --now tradeview-engine

sudo journalctl -u tradeview-engine -f
```

## 6. Y accéder

```bash
ssh -N -L 8080:127.0.0.1:8080 ubuntu@<IP>
```

Le tunnel ouvert, ton navigateur atteint le moteur sur `ws://localhost:8080/ws`
exactement comme lorsque tout tourne en local — **aucune variable à changer
côté front.**

## Vérifier la première connexion du Gateway

La toute première connexion demande parfois une validation à l'écran. Pour le
voir :

```bash
ssh ubuntu@<IP> 'x11vnc -display :1 -localhost -nopw -forever &'
ssh -N -L 5900:127.0.0.1:5900 ubuntu@<IP>
# puis un client VNC sur localhost:5900
```

## Ce qu'il reste à faire

- **La déconnexion quotidienne** est prise en charge par IBC, mais à vérifier
  sur une vraie nuit avant d'y confier quoi que ce soit.
- **L'horloge** : `chrony` est installé, car chaque bougie et chaque ordre porte
  un horodatage, et une machine qui dérive les étiquette tous faux en silence.
- **Les sauvegardes** n'existent pas : l'event store est en mémoire. C'est la
  Phase 3 de l'audit.
- **L'accès depuis n'importe où** demandera un jeton court délivré par
  l'authentification Supabase existante, plutôt qu'un secret inscrit dans le
  JavaScript envoyé au navigateur.
