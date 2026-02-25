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
})

export const RequestUpdateSchema = z.object({
  status: z.enum(['ABERTO', 'EM_ANDAMENTO', 'EM_PROGRESSO', 'CONCLUIDO', 'REJEITADO']).optional(),
  notes: z.string().optional().nullable(),
  linkedTitleId: z.string().uuid().optional().nullable(),
  audioType: z.string().optional().nullable(),
  seasonNumber: z.number().int().optional().nullable(),
})

export const UserCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'USER']).default('USER'),
})

export const UserUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['ADMIN', 'USER']).optional(),
  password: z.string().min(6).optional(),
})
