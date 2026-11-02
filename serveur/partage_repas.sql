-- Partage d'un repas avec des amis choisis (Carbon FOODprint)
-- À passer une fois dans Supabase › SQL Editor. Idempotent.

-- 1) La portée « choisis » réellement appliquée à la lecture.
--    Jusqu'ici posts_lecture laissait TOUS les amis lire un post restreint :
--    cocher deux amis sur cinq n'enlevait rien aux trois autres.
--    cfp_destinataire() est SECURITY DEFINER : pas de récursion posts <-> post_people.
drop policy if exists posts_lecture on public.posts;
create policy posts_lecture on public.posts for select using (
  author = (select auth.uid())
  or public.cfp_destinataire(id)
  or (scope is distinct from 'choisis' and exists (
        select 1 from public.friend_requests f
         where f.status = 'accepted'
           and ((f.requester = (select auth.uid()) and f.addressee = posts.author)
             or (f.addressee = (select auth.uid()) and f.requester = posts.author))))
);

-- 2) Nouveau type de publication : un repas
alter table public.posts drop constraint if exists posts_kind_chk;
alter table public.posts add constraint posts_kind_chk
  check (kind = any (array['badge','recipe','challenge','meal']));

-- 3) Libellé de la notification envoyée au destinataire
create or replace function public.trg_notif_post_choisi()
 returns trigger language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare p record;
begin
  select author, kind into p from public.posts where id = new.post;
  if p is null then return null; end if;
  perform notif_ecrit(
    new.person, 'feed_partage',
    push_pseudo(p.author) || ' a partagé ' ||
      case p.kind when 'badge' then 'un badge'
                  when 'recipe' then 'une recette'
                  when 'recap' then 'son récap'
                  when 'meal' then 'un repas'
                  else 'une publication' end || ' avec vous',
    '', 'feed', 'actu', p.author, new.post, new.post::text);
  return null;
end $function$;
