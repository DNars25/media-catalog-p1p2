import { Resend } from 'resend'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

const FROM = process.env.EMAIL_FROM ?? 'Media Catalog <noreply@example.com>'

export async function sendRequestCreated(params: {
  adminEmails: string[]
  requestTitle: string
  requestedByName: string
  type: string
  notes?: string | null
}): Promise<void> {
  const resend = getResend()
  if (!resend || params.adminEmails.length === 0) return

  const html = `
    <h2>Novo Pedido Criado</h2>
    <p><strong>Título:</strong> ${escapeHtml(params.requestTitle)}</p>
    <p><strong>Tipo:</strong> ${escapeHtml(params.type)}</p>
    <p><strong>Solicitado por:</strong> ${escapeHtml(params.requestedByName)}</p>
    ${params.notes ? `<p><strong>Notas:</strong> ${escapeHtml(params.notes)}</p>` : ''}
    <p><a href="${BASE_URL}/dashboard/requests">Ver pedidos</a></p>
  `

  await resend.emails.send({
    from: FROM,
    to: params.adminEmails,
    subject: `[Media Catalog] Novo pedido: ${params.requestTitle}`,
    html,
  }).catch(() => {})
}

export async function sendRequestStatusChanged(params: {
  toEmail: string
  toName: string
  requestTitle: string
  oldStatus: string
  newStatus: string
}): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const statusLabel: Record<string, string> = {
    ABERTO: 'Aberto',
    EM_ANDAMENTO: 'Em Andamento',
    EM_PROGRESSO: 'Em Progresso',
    CONCLUIDO: 'Concluído',
    REJEITADO: 'Rejeitado',
  }

  const html = `
    <h2>Atualização do seu Pedido</h2>
    <p>Olá, ${escapeHtml(params.toName)}!</p>
    <p>O status do seu pedido <strong>${escapeHtml(params.requestTitle)}</strong> foi atualizado.</p>
    <p><strong>Status anterior:</strong> ${escapeHtml(statusLabel[params.oldStatus] ?? params.oldStatus)}</p>
    <p><strong>Novo status:</strong> ${escapeHtml(statusLabel[params.newStatus] ?? params.newStatus)}</p>
    <p><a href="${BASE_URL}/dashboard/requests">Ver pedidos</a></p>
  `

  await resend.emails.send({
    from: FROM,
    to: [params.toEmail],
    subject: `[Media Catalog] Pedido "${params.requestTitle}" — ${statusLabel[params.newStatus] ?? params.newStatus}`,
    html,
  }).catch(() => {})
}

export async function sendPublicRequestCreated(params: {
  adminEmails: string[]
  requestTitle: string
  source: string
  type: string
}): Promise<void> {
  const resend = getResend()
  if (!resend || params.adminEmails.length === 0) return

  const html = `
    <h2>Novo Pedido via ${escapeHtml(params.source)}</h2>
    <p><strong>Título:</strong> ${escapeHtml(params.requestTitle)}</p>
    <p><strong>Tipo:</strong> ${escapeHtml(params.type)}</p>
    <p><strong>Origem:</strong> ${escapeHtml(params.source)}</p>
    <p><a href="${BASE_URL}/dashboard/requests">Ver pedidos</a></p>
  `

  await resend.emails.send({
    from: FROM,
    to: params.adminEmails,
    subject: `[Media Catalog] Novo pedido via ${params.source}: ${params.requestTitle}`,
    html,
  }).catch(() => {})
}
