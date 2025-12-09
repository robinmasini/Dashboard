# 🚀 Guide de démarrage rapide

## ✅ Installation terminée

Les dépendances sont installées pour les deux dashboards.

## 📍 URLs locales

### Dashboard Client
```
http://localhost:5173
```

### Dashboard Freelance
```
http://localhost:5174
```
(ou le port suivant disponible si 5174 est occupé)

## 🎯 Pour démarrer les dashboards

### Option 1 : Lancer manuellement

**Terminal 1 - Dashboard Client :**
```bash
cd "/Users/robinmasini/Desktop/Dashboard Client"
npm run dev
```

**Terminal 2 - Dashboard Freelance :**
```bash
cd "/Users/robinmasini/Desktop/Dashboard Freelance EI RM"
npm run dev
```

### Option 2 : Script automatique (macOS/Linux)

Créez un fichier `start-both.sh` dans votre Desktop :

```bash
#!/bin/bash
cd "/Users/robinmasini/Desktop/Dashboard Client" && npm run dev &
cd "/Users/robinmasini/Desktop/Dashboard Freelance EI RM" && npm run dev &
wait
```

Puis exécutez :
```bash
chmod +x start-both.sh
./start-both.sh
```

## ⚠️ Notes importantes

1. **Version Node.js** : Vous avez Node.js v18.8.0, mais certains packages recommandent v18.18.0+. Les warnings sont normaux et n'empêchent pas le fonctionnement.

2. **Ports** : Si un port est occupé, Vite utilisera automatiquement le suivant (5174, 5175, etc.)

3. **Synchronisation** : Les deux dashboards partagent le même stockage IndexedDB. Toute modification dans un dashboard apparaît dans l'autre.

4. **Première connexion Dashboard Client** : Entrez un code à 4 chiffres (ex: 1234). Ce code sera défini comme code d'accès.

## 🔧 En cas de problème

1. **Erreur "command not found"** : Vérifiez que vous êtes dans le bon dossier
2. **Port déjà utilisé** : Fermez l'application qui utilise le port ou laissez Vite choisir un autre port
3. **Erreurs de compilation** : Vérifiez la console du terminal pour les détails

## 📝 Commandes utiles

```bash
# Voir les processus en cours
lsof -i :5173
lsof -i :5174

# Arrêter un serveur
# Appuyez sur Ctrl+C dans le terminal correspondant
```

