export interface Competence {
  id: number;
  niveau_id: number;
  code: string;
  titre: string;
  description: string | null;
  titre_en: string | null;
  description_en: string | null;
  ordre: number;
  modules: ModuleItem[];
}

export interface Niveau {
  id: number;
  metier_id: number;
  numero: number;
  nom: string;
  description: string | null;
  nom_en: string | null;
  description_en: string | null;
  date_debut: string | null;
  competences: Competence[];
}

export interface Metier {
  id: number;
  code: string;
  nom: string;
  description: string | null;
  nom_en: string | null;
  description_en: string | null;
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
  titre_en: string | null;
  contenu_en: string | null;
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

export interface NiveauEnrollmentDetail extends NiveauEnrollment {
  niveau_nom: string;
  niveau_nom_en: string | null;
  niveau_numero: number;
  date_debut: string | null;
  metier_code: string;
  metier_nom: string;
  metier_nom_en: string | null;
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
  created_at: string | null;
}

export interface TrustScore {
  apprenant_id: number;
  score_pct: number;
  rules_score: number;
  rules_breakdown: Record<string, unknown>;
  llm_score: number | null;
  justification: string;
  computed_at: string;
}

export type ContactRequestStatus = "pending" | "approved" | "rejected";

export interface ContactRequestBase {
  id: number;
  client_id: number;
  prestataire_id: number;
  initial_message: string | null;
  status: ContactRequestStatus;
  created_at: string;
  reviewed_at: string | null;
  unread_count: number;
  last_message: string | null;
  last_message_at: string | null;
}

export interface ContactRequestClient extends ContactRequestBase {
  prestataire_nom: string;
}

export interface ContactRequestPrestataire extends ContactRequestBase {
  client_nom: string;
}

export interface ContactRequestAdmin extends ContactRequestBase {
  client_nom: string;
  client_email: string;
  client_phone: string | null;
  client_created_at: string | null;
  client_total_requests: number;

  prestataire_nom: string;
  prestataire_email: string;
  prestataire_phone: string | null;
  prestataire_is_verified: boolean;
  prestataire_trust_score: number | null;
  prestataire_certifications: string[];
  prestataire_created_at: string | null;

  message_count: number;
  last_message_at: string | null;
}

export interface ContactMessage {
  id: number;
  contact_request_id: number;
  sender_role: "client" | "prestataire";
  content: string;
  read: boolean;
  created_at: string;
}

export interface Review {
  id: number;
  prestataire_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  client_firstname: string;
}

export interface ReviewSummary {
  average_rating: number | null;
  review_count: number;
  reviews: Review[];
}

export interface Client {
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
  is_verified: boolean;
  trust_score: number | null;
}

export interface MatchBreakdownItem {
  label: string;
  value_pct: number;
  weight: number;
  detail: string;
}

export interface Prestataire {
  id: number;
  firstname: string;
  lastname: string;
  certifications: string[];
  trust_score: number | null;
  match_score: number | null;
  match_breakdown: Record<string, MatchBreakdownItem> | null;
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
  title_en: string | null;
  subtitle_en: string | null;
  is_active: boolean;
  updated_at: string;
}

export interface BlogArticle {
  id: number;
  title: string | null;
  excerpt: string | null;
  category: string | null;
  cover_image_url: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
  is_active: boolean | null;
  published_at: string | null;
  updated_at: string | null;
}

export interface BlogArticleDetail extends BlogArticle {
  content: string[];
}

export interface Banner {
  id: number;
  ordre: number;
  image_url: string;
  image_url_mobile: string | null;
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

export interface MetierStat {
  metier_code: string;
  metier_nom: string;
  metier_nom_en: string | null;
  certified_count: number;
}

export interface NiveauStat {
  metier_code: string;
  metier_nom: string;
  niveau_numero: number;
  certifications_count: number;
}

export interface GenreStat {
  genre: string;
  count: number;
}

export interface PublicImpactStats {
  total_apprenants: number;
  total_reservations: number;
  total_modules_completed: number;
  total_certifications: number;
  certifications_par_niveau: NiveauStat[];
  repartition_par_metier: MetierStat[];
  taux_completion_moyen_pct: number | null;
  profils_verifies: number;
  score_confiance_moyen: number | null;
  pct_profils_bloques_verification: number | null;
  nombre_villes: number;
  repartition_genre: GenreStat[];
}
