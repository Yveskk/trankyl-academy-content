/**
 * Textes des pages d'inscription et de connexion selon le profil : un apprenant se forme, un prestataire
 * exerce deja (certificat non requis). Les deux utilisent le meme espace de connexion, mais pas les memes mots.
 */
import { fr } from "$lib/i18n/fr";
import { en } from "$lib/i18n/en";

export type Profile = "apprenant" | "prestataire";
export type Lang = "fr" | "en";

export interface PageCopy {
  brandTitle: string;
  brandText: string;
  values: string[];
  title: string;
  subtitle: string;
}
export interface ProfileCopy {
  register: PageCopy & { cta: string; haveAccount: string; signIn: string };
  login: PageCopy & { noAccount: string; signUp: string };
}

const PROVIDER: Record<Lang, ProfileCopy> = {
  fr: {
    register: {
      brandTitle: "Faites connaître votre savoir-faire.",
      brandText: "Créez votre profil de prestataire : après une vérification par notre équipe, vous apparaissez dans l'annuaire Trankyl.",
      values: ["Soyez trouvé par de nouveaux clients", "Un profil vérifié inspire confiance", "Aucun certificat requis pour être référencé"],
      title: "Inscription prestataire",
      subtitle: "Vous exercez déjà votre métier : quelques informations suffisent.",
      cta: "Créer mon profil prestataire",
      haveAccount: "Déjà prestataire ?",
      signIn: "Se connecter",
    },
    login: {
      brandTitle: "Retrouvez votre espace prestataire.",
      brandText: "Connectez-vous pour gérer votre profil, suivre vos demandes et rester visible auprès des clients.",
      values: ["Votre profil toujours à jour", "Les demandes de vos clients au même endroit", "Faites valoir vos compétences, certifiées ou non"],
      title: "Connexion prestataire",
      subtitle: "Accédez à votre espace professionnel.",
      noAccount: "Pas encore référencé ?",
      signUp: "Créer mon profil prestataire",
    },
  },
  en: {
    register: {
      brandTitle: "Show what you can do.",
      brandText: "Create your provider profile: once our team has checked it, you appear in the Trankyl directory.",
      values: ["Get found by new customers", "A verified profile builds trust", "No certificate required to be listed"],
      title: "Provider sign-up",
      subtitle: "You already practise your trade: a few details are enough.",
      cta: "Create my provider profile",
      haveAccount: "Already a provider?",
      signIn: "Sign in",
    },
    login: {
      brandTitle: "Welcome back to your provider space.",
      brandText: "Sign in to manage your profile, follow your requests and stay visible to customers.",
      values: ["Your profile always up to date", "Customer requests in one place", "Showcase your skills, certified or not"],
      title: "Provider sign-in",
      subtitle: "Access your professional space.",
      noAccount: "Not listed yet?",
      signUp: "Create my provider profile",
    },
  },
};

export function profileFromSearch(search: URLSearchParams): Profile {
  return search.get("profil") === "prestataire" ? "prestataire" : "apprenant";
}

/** Textes de la page pour ce profil (l'apprenant garde les textes historiques du site). */
export function copyFor(profile: Profile, lang: Lang): ProfileCopy {
  if (profile === "prestataire") return PROVIDER[lang];
  const d = lang === "en" ? en : fr;
  return {
    register: {
      brandTitle: d.register.brandTitle,
      brandText: d.register.brandText,
      values: [d.register.value1, d.register.value2, d.register.value3],
      title: d.register.title,
      subtitle: d.register.subtitle,
      cta: d.register.submit,
      haveAccount: lang === "en" ? "Already have an account?" : "Déjà un compte ?",
      signIn: lang === "en" ? "Sign in" : "Se connecter",
    },
    login: {
      brandTitle: d.login.brandTitle,
      brandText: d.login.brandText,
      values: [d.login.value1, d.login.value2, d.login.value3],
      title: d.login.title,
      subtitle: d.login.subtitle,
      noAccount: d.login.noAccount,
      signUp: d.login.signUp,
    },
  };
}
