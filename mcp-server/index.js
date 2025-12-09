#!/usr/bin/env node

/**
 * MCP Server pour le Dashboard Client
 * Réutilise les mêmes outils que le Dashboard Freelance
 * pour garantir la synchronisation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Chemin vers le dossier assets du projet
const ASSETS_DIR = path.resolve(__dirname, '../src/assets');

// S'assurer que le dossier assets existe
async function ensureAssetsDir() {
  try {
    await fs.access(ASSETS_DIR);
  } catch {
    await fs.mkdir(ASSETS_DIR, { recursive: true });
  }
}

// Fonction pour sauvegarder une image depuis base64
async function saveImageFromBase64(base64Data, filename) {
  await ensureAssetsDir();
  
  // Supprimer le préfixe data:image/...;base64, si présent
  const base64String = base64Data.includes(',') 
    ? base64Data.split(',')[1] 
    : base64Data;
  
  // Décoder le base64
  const buffer = Buffer.from(base64String, 'base64');
  
  // Chemin complet du fichier
  const filePath = path.join(ASSETS_DIR, filename);
  
  // Sauvegarder le fichier
  await fs.writeFile(filePath, buffer);
  
  return filePath;
}

// Fonction pour sauvegarder une image depuis une URL
async function saveImageFromUrl(url, filename) {
  await ensureAssetsDir();
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  
  const buffer = Buffer.from(await response.arrayBuffer());
  const filePath = path.join(ASSETS_DIR, filename);
  
  await fs.writeFile(filePath, buffer);
  
  return filePath;
}

const server = new Server(
  {
    name: 'dashboard-client-image-importer',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Liste des outils disponibles (mêmes que Dashboard Freelance)
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'import_image',
      description: 'Import an image into the dashboard assets folder. Accepts base64 encoded image data or an image URL.',
      inputSchema: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: 'The filename for the image (e.g., "my-image.png", "logo.jpg"). Must include extension.',
          },
          imageData: {
            type: 'string',
            description: 'Base64 encoded image data (with or without data URI prefix)',
          },
          imageUrl: {
            type: 'string',
            description: 'URL of the image to download and save',
          },
        },
        required: ['filename'],
        oneOf: [
          { required: ['imageData'] },
          { required: ['imageUrl'] },
        ],
      },
    },
  ],
}));

// Gestion des appels d'outils
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'import_image') {
    try {
      const { filename, imageData, imageUrl } = args;

      if (!filename) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: filename is required',
            },
          ],
          isError: true,
        };
      }

      // Valider l'extension du fichier
      const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
      const ext = path.extname(filename).toLowerCase();
      if (!validExtensions.includes(ext)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: Invalid file extension. Allowed extensions: ${validExtensions.join(', ')}`,
            },
          ],
          isError: true,
        };
      }

      let filePath;
      
      if (imageData) {
        // Sauvegarder depuis base64
        filePath = await saveImageFromBase64(imageData, filename);
      } else if (imageUrl) {
        // Télécharger et sauvegarder depuis URL
        filePath = await saveImageFromUrl(imageUrl, filename);
      } else {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Either imageData or imageUrl must be provided',
            },
          ],
          isError: true,
        };
      }

      const relativePath = path.relative(path.resolve(__dirname, '..'), filePath);
      
      return {
        content: [
          {
            type: 'text',
            text: `Image successfully imported to: ${relativePath}\n\nYou can now use it in your code with:\nimport imageName from '${relativePath.replace(/\\/g, '/')}'`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error importing image: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: `Unknown tool: ${name}`,
      },
    ],
    isError: true,
  };
});

// Démarrer le serveur
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Dashboard Client Image Importer MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});

