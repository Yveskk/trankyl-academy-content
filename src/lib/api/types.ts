export interface Competence {
  id: number;
  niveau_id: number;
  code: string;
  titre: string;
  description: string | null;
  ordre: number;
}

export interface Niveau {
  id: number;
  metier_id: number;
  numero: number;
  nom: string;
  description: string | null;
  competences: Competence[];
}

export interface Metier {
  id: number;
  code: string;
  nom: string;
  description: string | null;
}

export interface MetierDetail extends Metier {
  niveaux: Niveau[];
}

export interface ModuleItem {
  id: number;
  competence_id: number;
  code: string;
  titre: string;
  contenu: string | null;
  duree_heures: number;
  ordre: number;
  has_quiz: boolean;
}

export interface QuizChoice {
  id: number;
  texte: string;
  ordre: number;
}

export interface QuizQuestion {
  id: number;
  texte: string;
  ordre: number;
  choix: QuizChoice[];
}

export interface Quiz {
  id: number;
  module_id: number;
  titre: string;
  seuil_reussite_pct: number;
  questions: QuizQuestion[];
}

export interface QuizResult {
  score_pct: number;
  reussi: boolean;
  seuil_reussite_pct: number;
}

export interface Enrollment {
  id: number;
  module_id: number;
  statut: "en_cours" | "termine";
  started_at: string;
  completed_at: string | null;
}

export interface Certification {
  id: number;
  niveau_id: number;
  code: string;
  taxonomy_version: number;
  delivree_at: string;
}

export interface Apprenant {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  phone: string | null;
  created_at: string;
}
