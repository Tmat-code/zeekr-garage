import type { Severity, Status, IssueType } from '@/lib/config';

export type Model = {
  id: string;
  slug: string;
  name: string;
  platform: string;
  display_order: number;
};

// Variant/trim pr. model (fx "Long Range RWD").
export type Variant = { id: string; name: string };
// model_id -> dens varianter (til "mig med"-flowet).
export type VariantMap = Record<string, Variant[]>;

// Brugerens primaere bil (den der vises i garage-badget overalt).
export type MinBil = {
  modelId: string;
  variantId: string | null;
  modelName: string;
  variantName: string | null;
};

// En konkret bil i brugerens garage (cars-raekke) - baerer sit eget id,
// saa en bekraeftelse kan knyttes til netop denne bil.
export type GarageBil = {
  carId: string;
  modelId: string;
  variantId: string | null;
  modelName: string;
  variantName: string | null;
};

// En fejl som den vises paa boardet: med koblede modeller og optalte bekraeftelser.
export type IssueRow = {
  id: string;
  type: IssueType;
  title: string;
  description: string;
  category: string | null;
  severity: Severity;
  status: Status;
  created_at: string;
  // Modeller fejlen er tagget til (via issue_models).
  models: Pick<Model, 'id' | 'slug' | 'name' | 'platform'>[];
  // Antal "mig med"-bekraeftelser i alt (= antal bekraeftede biler).
  confirmations: number;
  // Antal kommentarer ("Byggemøde").
  comments: number;
  // Seneste softwareversion nogen har bekraeftet paa (valgfri visning).
  software_version: string | null;
  // Vedhaeftede billeder (foto-bevis) - offentlige URL'er, i display-raekkefoelge.
  billeder: string[];
};

// En kommentar ("Byggemøde") paa en melding.
export type Kommentar = {
  id: string;
  body: string;
  is_solution: boolean;
  created_at: string;
  author_id: string | null;
  author_navn: string | null;
};

// =========================================================================
// Forum
// =========================================================================

// En forum-kategori (model-forum hvis modelId != null, ellers tvaergaaende).
export type ForumKategori = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  groupLabel: string;
  groupOrder: number;
  displayOrder: number;
  modelId: string | null;
  isLocked: boolean;
};

// Ejer-graf pr. model (P6 social proof). Kommer fra Min garage (cars), ikke
// fra forum-traade, saa model-foraene er substantierede selv med 0 traade.
export type ModelEjerTal = {
  ejere: number;         // antal distinkte ejere (owner_id i cars) med modellen
  biler: number;         // antal biler (cars-raekker) med modellen
  bekraeftelser: number; // antal "mig med"-bekraeftelser paa modellen
};

// Kategori + optalte tal (til oversigts-raekken, a la Polestar).
export type ForumKategoriStat = ForumKategori & {
  traade: number;       // antal traade
  indlaeg: number;      // antal indlaeg i alt (aabninger + svar)
  visninger: number;    // sum af visninger
  sidstAktiv: string | null; // seneste aktivitet (ISO) eller null
  // Ejer-graf (P6). Kun model-fora (modelId != null) har reelle tal; paa
  // tvaergaaende kategorier er de 0 og vises ikke.
  ejere: number;
  biler: number;
  bekraeftelser: number;
};

// En gruppe af kategorier (gruppe-overskrift + raekker).
export type ForumGruppe = { label: string; kategorier: ForumKategoriStat[] };

// En traad-raekke i en kategori-liste.
export type ForumTraadRow = {
  id: string;
  slug: string;
  title: string;
  forfatter: string | null;
  bil: string | null;       // garage-badge ("Zeekr 7GT · Long Range RWD")
  createdAt: string;
  lastPostAt: string;
  replyCount: number;
  viewCount: number;
  isPinned: boolean;
  isLocked: boolean;
};

// Et indlaeg i en traad.
export type ForumIndlaeg = {
  id: string;
  threadId: string;
  body: string;
  forfatter: string | null;
  bil: string | null;
  authorId: string | null;
  createdAt: string;
  edited: boolean;
  isOpening: boolean;
  billeder: string[]; // offentlige URL'er til vedhæftede billeder
  billederPaths: string[]; // rå storage-paths, parallelt ordnet med billeder (til redigering)
};

// Et tvaergaaende soege-resultat (en traad der matcher i titel eller indlaeg).
export type ForumSoegeResultat = {
  id: string;
  slug: string;
  title: string;
  kategoriSlug: string;
  kategoriNavn: string;
  kategoriIcon: string | null;
  modelId: string | null;      // != null => model-forum (typografisk badge)
  forfatter: string | null;
  bil: string | null;          // garage-badge ("Zeekr 7GT · Long Range RWD")
  lastPostAt: string;
  replyCount: number;
  viewCount: number;
  isPinned: boolean;
  isLocked: boolean;
  rank: number;                // relevans (ts_rank, titel vejer tungest)
  uddrag: string | null;       // highlightet uddrag; match-markoerer \u0001/\u0002
};

// En traad med dens kategori (til detalje-siden).
export type ForumTraadDetalje = {
  id: string;
  slug: string;
  title: string;
  createdAt: string;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  replyCount: number;
  kategori: { slug: string; name: string; icon: string | null; modelId: string | null; isLocked: boolean };
};

// =========================================================================
// Nyttige links (P19) - admin-styrede links grupperet efter emne, med et
// valgfrit model-tag pr. link (modelSlug == null => "gaelder alle").
// =========================================================================
export type LinkPost = {
  id: string;
  navn: string;
  kilde: string | null;
  url: string;
  modelSlug: string | null; // null => gaelder alle modeller
  modelNavn: string | null;  // fuldt navn, fx "Zeekr 7GT" (til badge/filter)
  displayOrder: number;
};

export type LinkGruppe = {
  id: string;
  titel: string;
  displayOrder: number;
  links: LinkPost[];
};

// =========================================================================
// Events / meetups
// =========================================================================
export type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isCancelled: boolean;
  signupCount: number;
  opretter: string | null;
};

export type EventDeltager = { navn: string | null; note: string | null };
export type EventOpdatering = {
  id: string;
  body: string;
  createdAt: string;
  forfatter: string | null;
};

export type EventDetalje = EventRow & {
  deltagere: EventDeltager[];
  opdateringer: EventOpdatering[];
};

// Brugerens egen tilmelding til et event.
export type MinTilmelding = { tilmeldt: boolean; note: string | null };

// =========================================================================
// Private beskeder (PB / chat)
// =========================================================================
// Den anden part i en 1:1-samtale.
export type AndenPart = { id: string; navn: string | null; bil: string | null };

// En samtale i indbakke-listen.
export type SamtaleRow = {
  id: string;
  andenPart: AndenPart;
  sidsteBesked: string | null;
  sidsteTidspunkt: string;
  ulaest: boolean;
};

// En enkelt besked.
export type Besked = {
  id: string;
  body: string;
  senderId: string | null;
  createdAt: string;
  // Vedhaeftede billeder (P10) - private serve-rute-URL'er, i display-raekkefoelge.
  billeder: string[];
};

// En samtale med dens beskeder (detalje-siden).
export type SamtaleDetalje = {
  id: string;
  andenPart: AndenPart;
  beskeder: Besked[];
  jegHarBlokeret: boolean;
};

// =========================================================================
// Notifikationer
// =========================================================================
export type Notifikation = {
  id: string;
  type: string;        // forum_svar | pb_besked | ...
  tekst: string;       // denormaliseret visningstekst
  href: string;        // hvor klik foerer hen
  erLaest: boolean;
  createdAt: string;
};
