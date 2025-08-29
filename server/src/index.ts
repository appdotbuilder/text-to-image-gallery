import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  registerInputSchema,
  loginInputSchema,
  generateImageInputSchema,
  saveToGalleryInputSchema,
  getUserGalleryInputSchema,
  getUserImageGenerationsInputSchema,
  updateGalleryImageInputSchema,
  deleteGalleryImageInputSchema,
  shareImageInputSchema
} from './schema';

// Import handlers
import { register } from './handlers/register';
import { login } from './handlers/login';
import { generateImage } from './handlers/generate_image';
import { saveToGallery } from './handlers/save_to_gallery';
import { getUserGallery } from './handlers/get_user_gallery';
import { getUserImageGenerations } from './handlers/get_user_image_generations';
import { updateGalleryImage } from './handlers/update_gallery_image';
import { deleteGalleryImage } from './handlers/delete_gallery_image';
import { shareImage } from './handlers/share_image';
import { downloadImage } from './handlers/download_image';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  register: publicProcedure
    .input(registerInputSchema)
    .mutation(({ input }) => register(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  // Image generation routes
  generateImage: publicProcedure
    .input(generateImageInputSchema)
    .mutation(({ input }) => generateImage(input)),

  getUserImageGenerations: publicProcedure
    .input(getUserImageGenerationsInputSchema)
    .query(({ input }) => getUserImageGenerations(input)),

  // Gallery routes
  saveToGallery: publicProcedure
    .input(saveToGalleryInputSchema)
    .mutation(({ input }) => saveToGallery(input)),

  getUserGallery: publicProcedure
    .input(getUserGalleryInputSchema)
    .query(({ input }) => getUserGallery(input)),

  updateGalleryImage: publicProcedure
    .input(updateGalleryImageInputSchema)
    .mutation(({ input }) => updateGalleryImage(input)),

  deleteGalleryImage: publicProcedure
    .input(deleteGalleryImageInputSchema)
    .mutation(({ input }) => deleteGalleryImage(input)),

  // Sharing and download routes
  shareImage: publicProcedure
    .input(shareImageInputSchema)
    .mutation(({ input }) => shareImage(input)),

  downloadImage: publicProcedure
    .input(z.object({
      imageGenerationId: z.number(),
      userId: z.number()
    }))
    .query(({ input }) => downloadImage(input.imageGenerationId, input.userId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();