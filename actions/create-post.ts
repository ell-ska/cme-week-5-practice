'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { postSchema } from './schemas'
import { createClient } from '@/utils/supabase/server'
import { uploadImage } from '@/utils/supabase/upload-image'
import { slugify } from '@/utils/slugify'

export const createPost = async (data: z.infer<typeof postSchema>) => {
  const parsedData = postSchema.parse(data)

  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('not authenticated')
  }

  const imageFile = data.image.get('image')
  if (!(imageFile instanceof File) && imageFile !== null) {
    throw new Error('malformed image')
  }

  const imagePublicUrl = imageFile ? await uploadImage(imageFile) : null

  const { data: post } = await supabase
    .from('posts')
    .insert([
      {
        title: parsedData.title,
        content: parsedData.content,
        image: imagePublicUrl,
        user_id: user.id,
        slug: slugify(parsedData.title),
      },
    ])
    .select('slug')
    .single()
    .throwOnError()

  if (!post?.slug) {
    throw new Error('could not redirect')
  }

  revalidatePath('/')
  redirect(`/post/${post.slug}`)
}
