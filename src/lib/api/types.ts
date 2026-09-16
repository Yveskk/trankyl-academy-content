export interface Competence {
  id: number;
  niveau_id: number;
  code: string;
  titre: string;
  description: string | null;
  ordre: number;
  modules: ModuleItem[];
}

export interface Niveau {
  id: number;
  metier_id: number;
  numero: number;
  nom: string;
  description: string | null;
  date_debut: string | null;
  competences: Competence[];
}

export interface Metier {
  id: number;
  code: string;
  nom: string;
  description: string | null;
  is_active: boolean;
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

export interface NiveauEnrollment {
  id: number;
  niveau_id: number;
  metier_id: number;
  created_at: string;
}

export interface NiveauEnrollmentAdmin {
  id: number;
  apprenant_id: number;
  apprenant_nom: string;
  apprenant_email: string;
  niveau_id: number;
  niveau_nom: string;
  niveau_numero: number;
  date_debut: string | null;
  metier_id: number;
  metier_code: string;
  metier_nom: string;
  created_at: string;
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

export interface ApprenantDetail extends Apprenant {
  certifications: string[];
  enrollment_count: number;
  completed_count: number;
}

export interface Prestataire {
  id: number;
  firstname: string;
  lastname: string;
  certifications: string[];
}

export interface MatchingRequest {
  id: number;
  client_id: number;
  metier_code: string;
  description: string | null;
  created_at: string;
}

export interface Match {
  id: number;
  request_id: number;
  prestataire_id: number;
  score: number;
  created_at: string;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  match_id: number | null;
  content: string;
  read: boolean;
  created_at: string;
}

export interface ContentSection {
  key: string;
  title: string;
  subtitle: string | null;
  is_active: boolean;
  updated_at: string;
}

export interface Conversation {
  other_user_id: number;
  other_user_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}
