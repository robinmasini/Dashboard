# Dashboard Image Importer MCP Server

Ce serveur MCP permet d'importer des images dans le dossier `src/assets/` du projet dashboard.

## Installation

Les dépendances sont déjà installées. Le serveur est configuré dans `.cursor/mcp.json`.

## Utilisation

Une fois le serveur MCP configuré et Cursor redémarré, vous pouvez utiliser l'outil `import_image` pour importer des images.

### Paramètres

- `filename` (requis) : Le nom du fichier avec extension (ex: "logo.png", "avatar.jpg")
- `imageData` (optionnel) : Données d'image encodées en base64 (avec ou sans préfixe data URI)
- `imageUrl` (optionnel) : URL de l'image à télécharger

**Note** : Vous devez fournir soit `imageData` soit `imageUrl`, mais pas les deux.

### Extensions supportées

- .png
- .jpg / .jpeg
- .gif
- .svg
- .webp

### Exemple d'utilisation

```json
{
  "filename": "my-logo.png",
  "imageData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

ou

```json
{
  "filename": "avatar.jpg",
  "imageUrl": "https://example.com/image.jpg"
}
```

Les images seront sauvegardées dans `src/assets/` et pourront être importées dans votre code React avec :

```typescript
import myImage from './assets/my-logo.png'
```

