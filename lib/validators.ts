import { z } from 'zod'

const EpisodeItemSchema = z.object({
  season: z.number().int().min(1),
  episode: z.number().int().min(1),
})

export const TitleCreateSchema = z.object({
  tmdbId: z.number().int(),
  type: z.enum(['MOVIE', 'TV']),
  title: z.string().min(1),
  overview: z.string().optional(),
  posterUrl: z.string().url().optional().nullable(),
  releaseYear: z.number().int().optional().nullable(),
  genres: z.array(z.string()).default([]),
  tvSeasons: z.number().int().optional().nullable(),
  tvEpisodes: z.number().int().optional().nullable(),
  tvStatus: z.enum(['EM_ANDAMENTO', 'FINALIZADA']).optional().nullable(),
  internalStatus: z.enum(['AGUARDANDO_DOWNLOAD', 'DISPONIVEL', 'INDISPONIVEL']).default('AGUARDANDO_DOWNLOAD'),
  hasP1: z.boolean().default(false),
  hasP2: z.boolean().default(false),
  audioType: z.string().optional().nullable(),
  episodesData: z.array(EpisodeItemSchema).optional().default([]),
})

export const EpisodesUpdateSchema = z.object({
  episodesData: z.array(EpisodeItemSchema),
})

export const TitleUpdateSchema = TitleCreateSchema.partial()

export const RequestCreateSchema = z.object({
  requestedTitle: z.string().min(1),
  type: z.enum(['MOVIE', 'TV']),
  tmdbId: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
  preferredSystem: z.enum(['P1', 'P2', 'AMBOS']).optional().nullable(),
  posterUrl: z.string().url().optional().nullable(),
  isUpdate: z.boolean().default(false),
  seasonNumber: z.number().int().optional().nullable(),
  audioType: z.string().optional().nullable(),
  linkedTitleId: z.string().uuid().optional().nullable(),
  source: z.enum(['ADMIN', 'VITRINE', 'PEDIDO']).default('ADMIN'),
  status: z.enum(['ABERTO', 'EM_ANDAMENTO', 'EM_PROGRESSO', 'CONCLUIDO', 'REJEITADO']).optional(),
  priority: z.boolean().default(false),
})

export const RequestUpdateSchema = z.object({
  status: z.enum(['ABERTO', 'EM_ANDAMENTO', 'EM_PROGRESSO', 'CONCLUIDO', 'REJEITADO']).optional(),
  notes: z.string().optional().nullable(),
  linkedTitleId: z.string().uuid().optional().nullable(),
  audioType: z.string().optional().nullable(),
  seasonNumber: z.number().int().optional().nullable(),
  priority: z.boolean().optional(),
})

export const UserCreateSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(3, 'Mínimo 3 caracteres'),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'USER']).default('USER'),
})

export const UserUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'USER']).optional(),
  password: z.string().min(6).optional(),
})

export const CorrecoesCreateSchema = z.object({
  title: z.string().min(1).max(255),
  type: z.enum(['MOVIE', 'TV']),
  tmdbId: z.number().int().positive().optional().nullable(),
  posterUrl: z.string().url().optional().nullable(),
  server: z.enum(['B2P', 'P2B']).optional().nullable(),
  notes: z.string().min(1).max(1000),
  seasonNumber: z.number().int().positive().optional().nullable(),
  episodeNotes: z.string().max(200).optional().nullable(),
})

export const RecepcaoRequestSchema = z.object({
  title: z.string().min(1).max(255),
  type: z.enum(['MOVIE', 'TV']),
  tmdbId: z.number().int().positive().optional().nullable(),
  posterUrl: z.string().url().optional().nullable(),
})

export const LimparConcluidosSchema = z.object({
  scope: z.enum(['corrections', 'requests', 'atualizacoes']),
})
