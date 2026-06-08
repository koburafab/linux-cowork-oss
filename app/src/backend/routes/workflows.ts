/**
 * Workflow routes — GET /api/workflows, POST /api/workflows/:id/run
 */

import { Hono } from 'hono'

export interface Workflow {
  id: string
  name: string
  description: string
  icon: string
  mode: 'chat' | 'file-ops' | 'computer-use'
  prompt: string
}

export const DEFAULT_WORKFLOWS: Workflow[] = [
  {
    id: 'organize-downloads',
    name: 'Ranger les téléchargements',
    description: 'Trier ~/Téléchargements par type',
    icon: 'folder',
    mode: 'file-ops',
    prompt:
      'Liste les fichiers de ~/Téléchargements et propose un rangement par type (documents, images, vidéos, archives). Crée les dossiers et déplace les fichiers. Réponds en français.',
  },
  {
    id: 'system-health',
    name: 'État du système',
    description: 'Disque, mémoire, CPU et services',
    icon: 'heart-pulse',
    mode: 'file-ops',
    prompt:
      "Vérifie l'état du système : espace disque (df -h), mémoire (free -h), charge CPU (uptime), services actifs (systemctl list-units --state=running | head -20). Résume les éventuels problèmes en français.",
  },
  {
    id: 'screenshot-describe',
    name: 'Décris mon écran',
    description: "Capture l'écran et le décrit",
    icon: 'camera',
    mode: 'computer-use',
    prompt: 'Prends une capture de mon écran et décris en détail tout ce que tu vois, en français.',
  },
  {
    id: 'find-large-files',
    name: 'Trouver les gros fichiers',
    description: 'Les 20 plus gros fichiers du dossier perso',
    icon: 'search',
    mode: 'file-ops',
    prompt:
      'Trouve les 20 plus gros fichiers de mon dossier personnel (du -sh ~/* | sort -rh | head -20). Dis-moi ce que c\'est et lesquels peuvent être supprimés sans risque. Réponds en français.',
  },
  {
    id: 'git-status',
    name: 'Rapport Git',
    description: 'État de tous les dépôts git du dossier perso',
    icon: 'git-branch',
    mode: 'file-ops',
    prompt:
      "Vérifie tous les dépôts git de mon dossier personnel (find ~ -name .git -type d 2>/dev/null | head -30). Pour chacun, montre la branche, le statut et le dernier commit. Réponds en français.",
  },
  {
    id: 'daily-summary',
    name: 'Résumé du jour',
    description: 'Activité, disque, fichiers récents',
    icon: 'calendar',
    mode: 'file-ops',
    prompt:
      "Fais-moi un résumé de la journée : uptime du système, usage disque, fichiers modifiés dans les dernières 24h (find ~ -mtime 0 -type f 2>/dev/null | head -20), et les tâches de fond en cours. Réponds en français.",
  },
]

export function createWorkflowRoutes(): Hono {
  const app = new Hono()

  app.get('/workflows', (c) => {
    return c.json({ workflows: DEFAULT_WORKFLOWS })
  })

  app.post('/workflows/:id/run', async (c) => {
    const id = c.req.param('id')
    const workflow = DEFAULT_WORKFLOWS.find((w) => w.id === id)
    if (!workflow) {
      return c.json({ error: `Workflow '${id}' not found` }, 400)
    }
    return c.json({
      ok: true,
      workflow: { id: workflow.id, name: workflow.name, mode: workflow.mode },
      prompt: workflow.prompt,
    })
  })

  return app
}
