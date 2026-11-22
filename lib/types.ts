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

// Brugerens registrerede bil (til ét-kliks "mig med").
export type MinBil = {
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

// Kategori + optalte tal (til oversigts-raekken, a la Polestar).
export type ForumKategoriStat = ForumKategori & {
  traade: number;       // antal traade
  indlaeg: number;      // antal indlaeg i alt (aabninger + svar)
  visninger: number;    // sum af visninger
  sidstAktiv: string | null; // seneste aktivitet (ISO) eller null
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
