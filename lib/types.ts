import type { Severity, Status, IssueType } from '@/lib/config';

export type Model = {
  id: string;
  slug: string;
  name: string;
  platform: string;
  display_order: number;
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
