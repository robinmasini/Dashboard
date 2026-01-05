/**
 * Upload Service - Gestion des uploads vers Supabase Storage
 * Supporte les images et les PDFs
 */

import { supabase } from './supabaseClient'

const BUCKET_NAME = 'documents'

/**
 * Upload un fichier vers Supabase Storage
 * @param file - Le fichier à uploader
 * @param folder - Le dossier de destination (proposals, tickets, invoices)
 * @returns L'URL publique du fichier uploadé
 */
export async function uploadFile(
    file: File,
    folder: 'proposals' | 'tickets' | 'invoices' | 'avatars' | 'general' = 'general'
): Promise<{ url: string | null; error: string | null }> {
    try {
        // Générer un nom de fichier unique
        const timestamp = Date.now()
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const fileName = `${folder}/${timestamp}_${sanitizedName}`

        console.log('Uploading file to Supabase Storage:', fileName)

        // Upload vers Supabase Storage
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false,
            })

        if (error) {
            console.error('Upload error:', error)
            // Provide clear error messages
            if (error.message.includes('Bucket not found')) {
                return { url: null, error: 'Le bucket "documents" n\'existe pas. Créez-le dans Supabase Storage.' }
            }
            if (error.message.includes('row-level security') || error.message.includes('policy')) {
                return { url: null, error: 'Erreur de permission. Vérifiez les policies RLS du bucket.' }
            }
            return { url: null, error: error.message }
        }

        // Récupérer l'URL publique
        const { data: publicUrlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(data.path)

        console.log('Upload successful, public URL:', publicUrlData.publicUrl)
        return { url: publicUrlData.publicUrl, error: null }
    } catch (err: any) {
        console.error('Upload failed:', err)
        return { url: null, error: err.message || 'Upload failed' }
    }
}

/**
 * Supprime un fichier de Supabase Storage
 * @param fileUrl - L'URL publique du fichier
 */
export async function deleteFile(fileUrl: string): Promise<{ success: boolean; error: string | null }> {
    try {
        // Extraire le chemin du fichier depuis l'URL
        const url = new URL(fileUrl)
        const pathParts = url.pathname.split(`/${BUCKET_NAME}/`)
        if (pathParts.length < 2) {
            return { success: false, error: 'Invalid file URL' }
        }

        const filePath = pathParts[1]

        const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath])

        if (error) {
            console.error('Delete error:', error)
            return { success: false, error: error.message }
        }

        return { success: true, error: null }
    } catch (err: any) {
        console.error('Delete failed:', err)
        return { success: false, error: err.message || 'Delete failed' }
    }
}

/**
 * Convertit un fichier en base64 pour preview
 */
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

/**
 * Vérifie si un fichier est un PDF
 */
export function isPDF(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

/**
 * Vérifie si un fichier est une image
 */
export function isImage(file: File): boolean {
    return file.type.startsWith('image/')
}

/**
 * Vérifie si une URL pointe vers un PDF
 */
export function isPDFUrl(url: string): boolean {
    return url.toLowerCase().endsWith('.pdf') || url.includes('application/pdf')
}
