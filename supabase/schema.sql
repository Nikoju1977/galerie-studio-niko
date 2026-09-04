-- ============================================================
-- Galerie 3D — Studio Niko Design
-- Schéma de publication en ligne (Supabase)
--
-- À coller dans : Dashboard → SQL Editor → New query → Run
-- Aucune donnée existante n'est touchée.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Les galeries publiées
-- ------------------------------------------------------------
create table if not exists public.galeries (
  slug         text primary key
               check (slug ~ '^[a-z0-9-]{3,40}$'),
  titre        text not null default 'Galerie',
  intro        text default '',
  artiste      text default '',
  bio          text default '',
  portrait     text default '',              -- vignette en dataURL (petite)
  liens        jsonb not null default '{}'::jsonb,
  oeuvres      jsonb not null default '[]'::jsonb,  -- [{slot, titre, annee, technique, dims, notice, url}]
  jeton_edition uuid not null default gen_random_uuid(),  -- permet de modifier ensuite
  cree_le      timestamptz not null default now(),
  maj_le       timestamptz not null default now()
);

comment on table public.galeries is
  'Une ligne par exposition publiée. Le jeton d''édition reste chez l''artiste.';

-- ------------------------------------------------------------
-- 2. Codes d'invitation : seuls les artistes invités publient
--    (sans cela, n''importe quel visiteur dépose n''importe quoi
--     sous ton nom de domaine)
-- ------------------------------------------------------------
create table if not exists public.invitations (
  code        text primary key,
  pour        text default '',               -- à qui tu l'as donné
  utilisations int not null default 0,
  max_utilisations int not null default 1,
  expire_le   timestamptz,
  cree_le     timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. Accès : lecture publique, écriture interdite en direct
-- ------------------------------------------------------------
alter table public.galeries    enable row level security;
alter table public.invitations enable row level security;

drop policy if exists "lecture publique des galeries" on public.galeries;
create policy "lecture publique des galeries"
  on public.galeries for select
  using (true);

-- aucune policy d'insert/update/delete : tout passe par les fonctions ci-dessous.
-- aucune policy sur invitations : les codes restent invisibles depuis le web.

-- ------------------------------------------------------------
-- 4. Publier une galerie (vérifie le code d'invitation)
-- ------------------------------------------------------------
create or replace function public.publier_galerie(
  p_code    text,
  p_slug    text,
  p_titre   text,
  p_intro   text,
  p_artiste text,
  p_bio     text,
  p_portrait text,
  p_liens   jsonb,
  p_oeuvres jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv invitations%rowtype;
  v_jeton uuid;
begin
  select * into v_inv from invitations where code = p_code for update;
  if not found then
    raise exception 'Code d''invitation inconnu';
  end if;
  if v_inv.expire_le is not null and v_inv.expire_le < now() then
    raise exception 'Code d''invitation expiré';
  end if;
  if v_inv.utilisations >= v_inv.max_utilisations then
    raise exception 'Code d''invitation déjà utilisé';
  end if;

  if exists (select 1 from galeries where slug = p_slug) then
    raise exception 'Cette adresse est déjà prise : %', p_slug;
  end if;

  insert into galeries (slug, titre, intro, artiste, bio, portrait, liens, oeuvres)
  values (p_slug, coalesce(p_titre,'Galerie'), coalesce(p_intro,''),
          coalesce(p_artiste,''), coalesce(p_bio,''), coalesce(p_portrait,''),
          coalesce(p_liens,'{}'::jsonb), coalesce(p_oeuvres,'[]'::jsonb))
  returning jeton_edition into v_jeton;

  update invitations set utilisations = utilisations + 1 where code = p_code;
  return v_jeton;
end;
$$;

-- ------------------------------------------------------------
-- 5. Mettre à jour sa galerie (avec le jeton d'édition)
-- ------------------------------------------------------------
create or replace function public.maj_galerie(
  p_slug    text,
  p_jeton   uuid,
  p_titre   text,
  p_intro   text,
  p_artiste text,
  p_bio     text,
  p_portrait text,
  p_liens   jsonb,
  p_oeuvres jsonb
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update galeries set
    titre = coalesce(p_titre, titre),
    intro = coalesce(p_intro, intro),
    artiste = coalesce(p_artiste, artiste),
    bio = coalesce(p_bio, bio),
    portrait = coalesce(p_portrait, portrait),
    liens = coalesce(p_liens, liens),
    oeuvres = coalesce(p_oeuvres, oeuvres),
    maj_le = now()
  where slug = p_slug and jeton_edition = p_jeton;

  if not found then
    raise exception 'Galerie introuvable ou jeton invalide';
  end if;
  return true;
end;
$$;

-- ------------------------------------------------------------
-- 6. Droits d'exécution : le rôle public peut appeler ces deux
--    fonctions, et rien d'autre
-- ------------------------------------------------------------
revoke all on function public.publier_galerie from public, anon;
revoke all on function public.maj_galerie     from public, anon;
grant execute on function public.publier_galerie to anon;
grant execute on function public.maj_galerie     to anon;

-- ------------------------------------------------------------
-- 7. Stockage des médias
--    Bucket public en lecture ; dépôt limité aux images et sons.
--    Les vidéos restent en local : 1 Go d'offre gratuite part vite.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('oeuvres', 'oeuvres', true, 8388608,
        array['image/jpeg','image/png','image/webp','audio/mpeg','audio/ogg','audio/wav'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "lecture publique des medias" on storage.objects;
create policy "lecture publique des medias"
  on storage.objects for select
  using (bucket_id = 'oeuvres');

drop policy if exists "depot des medias" on storage.objects;
create policy "depot des medias"
  on storage.objects for insert to anon
  with check (bucket_id = 'oeuvres');

-- ------------------------------------------------------------
-- 8. Créer tes premiers codes d'invitation
--    (change les valeurs, garde-les pour toi)
-- ------------------------------------------------------------
-- insert into invitations (code, pour, max_utilisations) values
--   ('NIKO-2026-AAAA', 'moi',        50),
--   ('EXPO-INVITE-01', 'artiste 1',   1);

-- ------------------------------------------------------------
-- Vérification
-- ------------------------------------------------------------
select 'galeries' as objet, count(*) from public.galeries
union all
select 'invitations', count(*) from public.invitations;
