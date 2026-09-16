import type {
  Apprenant,
  Certification,
  Competence,
  Enrollment,
  Metier,
  MetierDetail,
  ModuleItem,
  Niveau,
  Quiz,
  QuizResult,
} from "$lib/api/types";

// --- Referentiel statique (demo hors-ligne, sans backend) ---

interface MockChoice {
  id: number;
  texte: string;
  est_correct: boolean;
  ordre: number;
}

interface MockQuestion {
  id: number;
  texte: string;
  ordre: number;
  choix: MockChoice[];
}

interface MockQuiz {
  id: number;
  module_id: number;
  titre: string;
  seuil_reussite_pct: number;
  questions: MockQuestion[];
}

const metiers: Metier[] = [
  { id: 1, code: "nounou", nom: "Nounou", description: "Garde d'enfants a domicile, de la naissance a l'adolescence." },
  { id: 2, code: "aide-domicile", nom: "Aide a domicile", description: "Accompagnement du quotidien pour personnes agees ou dependantes." },
  { id: 3, code: "cuisinier", nom: "Cuisinier", description: "Preparation de repas a domicile ou pour evenements." },
  { id: 4, code: "agent-entretien", nom: "Agent d'entretien", description: "Nettoyage et entretien de logements et locaux." },
];

const niveaux: Niveau[] = [
  { id: 1, metier_id: 1, numero: 1, nom: "Bases", description: "Hygiene, securite, premiers secours.", competences: [] },
  { id: 2, metier_id: 1, numero: 2, nom: "Intermediaire", description: "Developpement de l'enfant et alimentation adaptee.", competences: [] },
  { id: 3, metier_id: 2, numero: 1, nom: "Bases", description: "Entretien du logement et accompagnement de la personne agee.", competences: [] },
  { id: 4, metier_id: 3, numero: 1, nom: "Bases", description: "Hygiene alimentaire et techniques culinaires de base.", competences: [] },
  { id: 5, metier_id: 4, numero: 1, nom: "Bases", description: "Produits et techniques de nettoyage.", competences: [] },
];

const competences: Competence[] = [
  { id: 1, niveau_id: 1, code: "nounou_hygiene_base", titre: "Hygiene et securite de base", description: "Lavage des mains, securite alimentaire du nourrisson.", ordre: 1 },
  { id: 2, niveau_id: 1, code: "nounou_secours_base", titre: "Premiers secours", description: "Reagir face aux urgences les plus courantes.", ordre: 2 },
  { id: 3, niveau_id: 2, code: "nounou_dev_enfant", titre: "Developpement de l'enfant", description: "Comprendre les besoins par tranche d'age.", ordre: 1 },
  { id: 4, niveau_id: 2, code: "nounou_alimentation", titre: "Alimentation adaptee", description: "Preparer des repas adaptes a l'age de l'enfant.", ordre: 2 },
  { id: 5, niveau_id: 3, code: "aide_domicile_entretien", titre: "Entretien du logement", description: "Techniques et bonnes pratiques de nettoyage.", ordre: 1 },
  { id: 6, niveau_id: 3, code: "aide_domicile_accompagnement", titre: "Accompagnement de la personne agee", description: "Gestes et postures, aide au quotidien.", ordre: 2 },
  { id: 7, niveau_id: 4, code: "cuisinier_haccp", titre: "Hygiene alimentaire (HACCP)", description: "Normes de securite alimentaire de base.", ordre: 1 },
  { id: 8, niveau_id: 4, code: "cuisinier_techniques", titre: "Techniques culinaires de base", description: "Decoupe, cuisson, dressage.", ordre: 2 },
  { id: 9, niveau_id: 5, code: "agent_entretien_produits", titre: "Produits et techniques de nettoyage", description: "Utilisation securisee des produits d'entretien.", ordre: 1 },
];

const modules: ModuleItem[] = [
  { id: 1, competence_id: 1, code: "nounou_hygiene_base_m1", titre: "Hygiene et lavage des mains", contenu: "Les bons gestes d'hygiene avant chaque soin ou repas : lavage des mains, desinfection du materiel, tenue adaptee.", duree_heures: 2, ordre: 1, has_quiz: true },
  { id: 2, competence_id: 1, code: "nounou_hygiene_base_m2", titre: "Securite alimentaire du nourrisson", contenu: "Preparation et conservation des biberons, temperatures de securite, hygiene des ustensiles.", duree_heures: 2, ordre: 2, has_quiz: true },
  { id: 3, competence_id: 2, code: "nounou_secours_base_m1", titre: "Premiers secours enfant", contenu: "Position laterale de securite, etouffement, brulures legeres : les gestes qui sauvent.", duree_heures: 3, ordre: 1, has_quiz: true },
  { id: 4, competence_id: 3, code: "nounou_dev_enfant_m1", titre: "Developpement par tranche d'age", contenu: "Les grandes etapes du developpement moteur, cognitif et social de 0 a 12 ans.", duree_heures: 2, ordre: 1, has_quiz: false },
  { id: 5, competence_id: 4, code: "nounou_alimentation_m1", titre: "Preparation de repas adaptes", contenu: "Diversification alimentaire, textures adaptees, allergenes courants.", duree_heures: 2, ordre: 1, has_quiz: false },
  { id: 6, competence_id: 5, code: "aide_domicile_entretien_m1", titre: "Techniques de nettoyage", contenu: "Methodes et produits adaptes a chaque surface, organisation efficace du menage.", duree_heures: 2, ordre: 1, has_quiz: true },
  { id: 7, competence_id: 6, code: "aide_domicile_accompagnement_m1", titre: "Gestes et postures", contenu: "Aide au lever/coucher, transferts en securite, prevention des chutes.", duree_heures: 2, ordre: 1, has_quiz: false },
  { id: 8, competence_id: 7, code: "cuisinier_haccp_m1", titre: "Normes HACCP de base", contenu: "Chaine du froid, temperatures de cuisson, tracabilite des produits.", duree_heures: 3, ordre: 1, has_quiz: true },
  { id: 9, competence_id: 8, code: "cuisinier_techniques_m1", titre: "Decoupe et cuisson", contenu: "Techniques de decoupe, modes de cuisson, dressage d'assiette.", duree_heures: 2, ordre: 1, has_quiz: false },
  { id: 10, competence_id: 9, code: "agent_entretien_produits_m1", titre: "Utilisation securisee des produits", contenu: "Lecture des etiquettes, dosages, produits a ne jamais melanger.", duree_heures: 2, ordre: 1, has_quiz: true },
];

const quizzes: MockQuiz[] = [
  {
    id: 1,
    module_id: 1,
    titre: "Quiz hygiene des mains",
    seuil_reussite_pct: 70,
    questions: [
      {
        id: 1,
        texte: "Combien de temps faut-il se laver les mains ?",
        ordre: 1,
        choix: [
          { id: 1, texte: "20 secondes minimum", est_correct: true, ordre: 1 },
          { id: 2, texte: "2 secondes", est_correct: false, ordre: 2 },
          { id: 3, texte: "Ce n'est pas necessaire", est_correct: false, ordre: 3 },
        ],
      },
    ],
  },
  {
    id: 2,
    module_id: 2,
    titre: "Quiz securite alimentaire",
    seuil_reussite_pct: 70,
    questions: [
      {
        id: 2,
        texte: "Combien de temps peut-on conserver un biberon prepare au refrigerateur ?",
        ordre: 1,
        choix: [
          { id: 4, texte: "24 heures maximum", est_correct: true, ordre: 1 },
          { id: 5, texte: "Une semaine", est_correct: false, ordre: 2 },
        ],
      },
    ],
  },
  {
    id: 3,
    module_id: 3,
    titre: "Quiz premiers secours",
    seuil_reussite_pct: 70,
    questions: [
      {
        id: 3,
        texte: "Que faire en cas d'etouffement chez un nourrisson ?",
        ordre: 1,
        choix: [
          { id: 6, texte: "Tapes dans le dos puis compressions thoraciques", est_correct: true, ordre: 1 },
          { id: 7, texte: "Attendre que ca passe", est_correct: false, ordre: 2 },
        ],
      },
    ],
  },
  {
    id: 4,
    module_id: 6,
    titre: "Quiz techniques de nettoyage",
    seuil_reussite_pct: 70,
    questions: [
      {
        id: 4,
        texte: "Quel produit ne faut-il jamais melanger avec de l'eau de javel ?",
        ordre: 1,
        choix: [
          { id: 8, texte: "Un produit a base d'ammoniaque", est_correct: true, ordre: 1 },
          { id: 9, texte: "De l'eau", est_correct: false, ordre: 2 },
        ],
      },
    ],
  },
  {
    id: 5,
    module_id: 8,
    titre: "Quiz normes HACCP",
    seuil_reussite_pct: 70,
    questions: [
      {
        id: 5,
        texte: "Quelle est la temperature maximale de conservation au froid positif ?",
        ordre: 1,
        choix: [
          { id: 10, texte: "4°C", est_correct: true, ordre: 1 },
          { id: 11, texte: "15°C", est_correct: false, ordre: 2 },
        ],
      },
    ],
  },
  {
    id: 6,
    module_id: 10,
    titre: "Quiz produits de nettoyage",
    seuil_reussite_pct: 70,
    questions: [
      {
        id: 6,
        texte: "Faut-il porter des gants pour manipuler des produits chimiques ?",
        ordre: 1,
        choix: [
          { id: 12, texte: "Oui, toujours", est_correct: true, ordre: 1 },
          { id: 13, texte: "Non, jamais", est_correct: false, ordre: 2 },
        ],
      },
    ],
  },
];

let nextEnrollmentId = 5;
const enrollments: Enrollment[] = [
  { id: 1, module_id: 1, statut: "termine", started_at: "2026-01-12T09:00:00", completed_at: "2026-01-12T10:30:00" },
  { id: 2, module_id: 2, statut: "termine", started_at: "2026-01-13T09:00:00", completed_at: "2026-01-13T10:20:00" },
  { id: 3, module_id: 3, statut: "termine", started_at: "2026-01-14T09:00:00", completed_at: "2026-01-14T11:40:00" },
  { id: 4, module_id: 4, statut: "en_cours", started_at: "2026-01-20T09:00:00", completed_at: null },
];

let nextCertificationId = 2;
const certifications: Certification[] = [
  { id: 1, niveau_id: 1, code: "nounou_niveau_1", taxonomy_version: 1, delivree_at: "2026-01-14T12:00:00" },
];

const apprenant: Apprenant = {
  id: 1,
  firstname: "Awa",
  lastname: "Traore",
  email: "awa@example.com",
  phone: "+225 07 00 00 00",
  created_at: "2026-01-10T08:00:00",
};

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function buildMetierDetail(metier: Metier): MetierDetail {
  const niveauxDuMetier = niveaux
    .filter((n) => n.metier_id === metier.id)
    .map((n) => ({
      ...n,
      competences: competences
        .filter((c) => c.niveau_id === n.id)
        .map((c) => ({ ...c })),
    }));
  return { ...metier, niveaux: niveauxDuMetier };
}

function toPublicQuiz(quiz: MockQuiz): Quiz {
  return {
    id: quiz.id,
    module_id: quiz.module_id,
    titre: quiz.titre,
    seuil_reussite_pct: quiz.seuil_reussite_pct,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      texte: q.texte,
      ordre: q.ordre,
      choix: q.choix.map((c) => ({ id: c.id, texte: c.texte, ordre: c.ordre })),
    })),
  };
}

// --- API mock, memes signatures que les modules src/lib/api/*.ts ---

export function mockListMetiers() {
  return delay(metiers);
}

export function mockGetMetier(code: string) {
  const metier = metiers.find((m) => m.code === code);
  if (!metier) return Promise.reject(new Error("Metier introuvable"));
  return delay(buildMetierDetail(metier));
}

export function mockListModules(competenceId?: number) {
  const list = competenceId ? modules.filter((m) => m.competence_id === competenceId) : modules;
  return delay(list);
}

export function mockGetModule(moduleId: number) {
  const module = modules.find((m) => m.id === moduleId);
  if (!module) return Promise.reject(new Error("Module introuvable"));
  return delay(module);
}

export function mockGetModuleQuiz(moduleId: number) {
  const quiz = quizzes.find((q) => q.module_id === moduleId);
  if (!quiz) return Promise.reject(new Error("Ce module n'a pas de quiz"));
  return delay(toPublicQuiz(quiz));
}

export function mockMyEnrollments() {
  return delay([...enrollments]);
}

export function mockEnroll(moduleId: number) {
  const existing = enrollments.find((e) => e.module_id === moduleId);
  if (existing) return delay(existing);
  const enrollment: Enrollment = {
    id: nextEnrollmentId++,
    module_id: moduleId,
    statut: "en_cours",
    started_at: new Date().toISOString(),
    completed_at: null,
  };
  enrollments.push(enrollment);
  return delay(enrollment);
}

export function mockMyCertifications() {
  return delay([...certifications]);
}

function niveauOfModule(moduleId: number): Niveau | undefined {
  const module = modules.find((m) => m.id === moduleId);
  if (!module) return undefined;
  const competence = competences.find((c) => c.id === module.competence_id);
  if (!competence) return undefined;
  return niveaux.find((n) => n.id === competence.niveau_id);
}

function maybeIssueCertification(niveau: Niveau) {
  const moduleIdsDuNiveau = modules
    .filter((m) => competences.find((c) => c.id === m.competence_id)?.niveau_id === niveau.id)
    .map((m) => m.id);
  const allDone = moduleIdsDuNiveau.every(
    (id) => enrollments.find((e) => e.module_id === id)?.statut === "termine"
  );
  if (!allDone) return;
  if (certifications.some((c) => c.niveau_id === niveau.id)) return;
  const metier = metiers.find((m) => m.id === niveau.metier_id);
  certifications.push({
    id: nextCertificationId++,
    niveau_id: niveau.id,
    code: `${metier?.code}_niveau_${niveau.numero}`,
    taxonomy_version: 1,
    delivree_at: new Date().toISOString(),
  });
}

export function mockSubmitQuiz(quizId: number, answers: { question_id: number; choice_id: number }[]) {
  const quiz = quizzes.find((q) => q.id === quizId);
  if (!quiz) return Promise.reject(new Error("Quiz introuvable"));

  const submitted = new Map(answers.map((a) => [a.question_id, a.choice_id]));
  const total = quiz.questions.length;
  const correctCount = quiz.questions.filter((q) => {
    const correctChoice = q.choix.find((c) => c.est_correct);
    return correctChoice && submitted.get(q.id) === correctChoice.id;
  }).length;
  const score_pct = Math.round((correctCount / total) * 10000) / 100;
  const reussi = score_pct >= quiz.seuil_reussite_pct;

  if (reussi) {
    const enrollment = enrollments.find((e) => e.module_id === quiz.module_id);
    if (enrollment) {
      enrollment.statut = "termine";
      enrollment.completed_at = new Date().toISOString();
    }
    const niveau = niveauOfModule(quiz.module_id);
    if (niveau) maybeIssueCertification(niveau);
  }

  const result: QuizResult = { score_pct, reussi, seuil_reussite_pct: quiz.seuil_reussite_pct };
  return delay(result);
}

export function mockMe() {
  return delay({ ...apprenant });
}

export function mockRegister(payload: { firstname: string; lastname: string; email: string; phone?: string }) {
  apprenant.firstname = payload.firstname;
  apprenant.lastname = payload.lastname;
  apprenant.email = payload.email;
  apprenant.phone = payload.phone ?? null;
  return delay({ ...apprenant });
}

export function mockLogin() {
  return delay({ access_token: "mock-token-apprenant", token_type: "bearer" });
}

export function mockAdminLogin() {
  return delay({ access_token: "mock-token-admin", token_type: "bearer" });
}

// --- Admin CRUD (mute en memoire, pour explorer l'admin sans backend) ---

let nextMetierId = metiers.length + 1;
let nextNiveauId = niveaux.length + 1;
let nextCompetenceId = competences.length + 1;
let nextModuleId = modules.length + 1;
let nextQuizId = quizzes.length + 1;

export function mockCreateMetier(payload: { code: string; nom: string; description?: string }) {
  const metier: Metier = { id: nextMetierId++, code: payload.code, nom: payload.nom, description: payload.description ?? null };
  metiers.push(metier);
  return delay(metier);
}

export function mockCreateNiveau(metierId: number, payload: { numero: number; nom: string; description?: string }) {
  const niveau: Niveau = { id: nextNiveauId++, metier_id: metierId, numero: payload.numero, nom: payload.nom, description: payload.description ?? null, competences: [] };
  niveaux.push(niveau);
  return delay(niveau);
}

export function mockCreateCompetence(niveauId: number, payload: { code: string; titre: string; description?: string; ordre?: number }) {
  const competence: Competence = { id: nextCompetenceId++, niveau_id: niveauId, code: payload.code, titre: payload.titre, description: payload.description ?? null, ordre: payload.ordre ?? 0 };
  competences.push(competence);
  return delay(competence);
}

export function mockDeleteMetier(metierId: number) {
  const index = metiers.findIndex((m) => m.id === metierId);
  if (index !== -1) metiers.splice(index, 1);
  return delay(undefined);
}

export function mockCreateModule(payload: { competence_id: number; code: string; titre: string; contenu?: string; duree_heures?: number; ordre?: number }) {
  const module: ModuleItem = {
    id: nextModuleId++,
    competence_id: payload.competence_id,
    code: payload.code,
    titre: payload.titre,
    contenu: payload.contenu ?? null,
    duree_heures: payload.duree_heures ?? 2,
    ordre: payload.ordre ?? 0,
    has_quiz: false,
  };
  modules.push(module);
  return delay(module);
}

export function mockCreateQuiz(payload: {
  module_id: number;
  titre: string;
  seuil_reussite_pct?: number;
  questions: { texte: string; ordre?: number; choix: { texte: string; est_correct: boolean; ordre?: number }[] }[];
}) {
  const quiz: MockQuiz = {
    id: nextQuizId++,
    module_id: payload.module_id,
    titre: payload.titre,
    seuil_reussite_pct: payload.seuil_reussite_pct ?? 70,
    questions: payload.questions.map((q, qi) => ({
      id: Number(`${nextQuizId}${qi}`),
      texte: q.texte,
      ordre: q.ordre ?? qi,
      choix: q.choix.map((c, ci) => ({ id: Number(`${nextQuizId}${qi}${ci}`), texte: c.texte, est_correct: c.est_correct, ordre: c.ordre ?? ci })),
    })),
  };
  quizzes.push(quiz);
  const module = modules.find((m) => m.id === payload.module_id);
  if (module) module.has_quiz = true;
  return delay(toPublicQuiz(quiz));
}

export function mockDeleteModule(moduleId: number) {
  const index = modules.findIndex((m) => m.id === moduleId);
  if (index !== -1) modules.splice(index, 1);
  return delay(undefined);
}
