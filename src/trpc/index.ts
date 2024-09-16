import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { privateProcedure, publicProcedure, router } from './trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import db from '@/db'

export const appRouter = router({
  authCallback: publicProcedure.query(async() => {
      const { getUser } = getKindeServerSession();
      const user = getUser();

      if (!(await user).id || !(await user).email) 
        throw new TRPCError({ code: 'UNAUTHORIZED'});

        // CHECK IF THE USER IS IN THE DATABASE
        const dbUser = await db.user.findFirst({
            where: {
                id: (await user).id,
            },
        })

        if(!dbUser) {
            // IF THE USER IS NOT IN THE DATABASE, CREATE A NEW USER
            await db.user.create({
                data: {
                    id: (await user).id,
                    email: (await user).email!,
                },
            })
        }

        return { success: true };
  }),
  getUserFiles: privateProcedure.query(async({ ctx }) => {
    const { userId } = ctx;

    return await db.file.findMany({
        where: {
            userId,   
        },
    });
  }),
  getFile: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async({ input, ctx }) => {
        const { userId } = ctx;
        const file = await db.file.findFirst({
            where: {
                key: input.id,
                userId,
            },
        });

        if(!file) throw new TRPCError({ code: 'NOT_FOUND' });

        return file;
    }),
  deleteFile: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async({ ctx, input }) => {
        const {userId} = ctx;
        const file = await db.file.findFirst({
            where: {
                id: input.id,
                userId,
            },
        });

        if(!file) throw new TRPCError({ code: 'NOT_FOUND' });

        await db.file.delete({
            where: {
                id: input.id,
            },
        });
        return file;
    }),
});
 

export type AppRouter = typeof appRouter; 