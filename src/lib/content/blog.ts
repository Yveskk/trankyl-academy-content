export interface BlogArticle {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  cover: "green" | "gold";
  content: string[];
}

export const articles: BlogArticle[] = [
  {
    slug: "pourquoi-la-micro-certification",
    title: "Pourquoi la micro-certification change la donne pour les metiers de service",
    excerpt:
      "Plutot qu'un diplome global d'un coup, des credits empilables et courts : pourquoi ce format convient mieux a des personnes qui ne peuvent suivre que quelques heures a la fois.",
    category: "Pedagogie",
    date: "2026-02-03",
    readTime: "4 min",
    cover: "green",
    content: [
      "La formation professionnelle classique impose souvent de bloquer plusieurs semaines d'affilee. Pour une personne qui travaille deja, garde des enfants ou n'a pas de revenu de remplacement, c'est un obstacle rarement franchissable.",
      "La micro-certification inverse la logique : chaque module dure 2 a 3 heures, se termine par une evaluation courte, et donne un credit precis, immediatement valorisable. On peut suivre un module un soir, le suivant deux semaines plus tard, sans perdre sa progression.",
      "Chez Trankyl Academy, un niveau complet (par exemple 'nounou niveau 1') est simplement la somme de plusieurs modules reussis. La certification finale a donc autant de valeur, mais le chemin pour y arriver est fragmente en etapes accessibles.",
      "C'est aussi ce qui rend le referentiel plus honnete : chaque competence certifiee correspond a un module reellement suivi et evalue, pas a une simple presence en salle.",
    ],
  },
  {
    slug: "devenir-prestataire-trankyl-apres-la-certification",
    title: "De la certification a prestataire Trankyl : ce qui se passe apres",
    excerpt:
      "Trankyl Academy et la marketplace Trankyl sont deux plateformes distinctes aujourd'hui. Voici comment elles sont amenees a se rejoindre.",
    category: "Academy x Trankyl",
    date: "2026-02-18",
    readTime: "3 min",
    cover: "gold",
    content: [
      "Une question revient souvent : 'si je me certifie sur Trankyl Academy, est-ce que je deviens automatiquement prestataire sur Trankyl ?'. Pas immediatement, et c'est volontaire.",
      "Aujourd'hui, les apprenants de l'Academy ne sont pas encore lies a un compte prestataire (vendor) sur la marketplace Trankyl. La certification est une etape independante : elle valide un niveau de competence, point.",
      "L'activation en tant que prestataire Trankyl, une fois vos certifications obtenues, est une etape a venir, geree separement. L'objectif : que vos badges de competence deviennent, a terme, un vrai critere de confiance dans le moteur de mise en relation avec les foyers.",
      "En clair : formez-vous des maintenant, le pont vers la marketplace arrivera ensuite.",
    ],
  },
  {
    slug: "5-reflexes-hygiene-garde-enfant",
    title: "5 reflexes d'hygiene a avoir en tete pour la garde d'enfants",
    excerpt: "Un rappel court des bases enseignees dans le module 'Hygiene et lavage des mains' du niveau 1 Nounou.",
    category: "Nounou",
    date: "2026-03-01",
    readTime: "3 min",
    cover: "green",
    content: [
      "1. Se laver les mains 20 secondes minimum avant chaque repas, apres chaque change, et au retour de l'exterieur.",
      "2. Desinfecter les surfaces de preparation des repas, surtout pour les nourrissons dont le systeme immunitaire est encore fragile.",
      "3. Verifier la temperature des biberons et des repas avant de les donner : ni trop chaud, ni conserve trop longtemps a temperature ambiante.",
      "4. Aerer les pieces regulierement, meme en hiver, pour limiter la concentration de germes.",
      "5. Avoir toujours une trousse de premiers secours accessible et verifiee, sans produits perimes.",
      "Ces reflexes sont detailles avec mises en situation dans le module 'Hygiene et lavage des mains', 2h, avec quiz de validation.",
    ],
  },
  {
    slug: "haccp-explique-simplement",
    title: "Les normes HACCP expliquees simplement pour un cuisinier a domicile",
    excerpt: "HACCP peut sembler technique. Voici l'essentiel a retenir pour cuisiner en toute securite chez un particulier.",
    category: "Cuisinier",
    date: "2026-03-10",
    readTime: "5 min",
    cover: "gold",
    content: [
      "HACCP (Hazard Analysis Critical Control Point) est une methode d'identification des risques alimentaires, pas une simple liste de regles a apprendre par coeur.",
      "Pour un cuisinier intervenant a domicile, l'essentiel tient en trois points : respecter la chaine du froid (jamais plus de 2h a temperature ambiante pour un produit perissable), cuire a coeur les viandes sensibles (volaille, hache), et eviter toute contamination croisee entre aliments crus et cuits.",
      "La tracabilite compte aussi : savoir d'ou vient un produit et quand il a ete ouvert permet de reagir vite en cas de doute.",
      "Le module 'Normes HACCP de base' (3h, avec quiz) reprend ces points avec des cas concrets de cuisine a domicile.",
    ],
  },
  {
    slug: "pourquoi-deux-bases-de-donnees-separees",
    title: "Pourquoi Trankyl Academy tourne sur son propre systeme, separe de la marketplace",
    excerpt: "Un choix d'architecture qui merite une explication : pourquoi l'Academy n'utilise pas directement la base de Trankyl.",
    category: "Coulisses",
    date: "2026-03-22",
    readTime: "4 min",
    cover: "green",
    content: [
      "Trankyl Academy est une branche a part de Trankyl : son propre backend, son propre site, sa propre base de donnees.",
      "Ce choix n'est pas anodin. La taxonomie de competences et le curriculum de micro-certification sont publies sous licence ouverte (CC-BY-4.0) : n'importe qui peut les reprendre pour former des travailleuses, a condition de citer la source. Un contenu ouvert vit mieux dans un systeme independant, qu'on peut publier et faire evoluer sans toucher a la marketplace.",
      "Le moteur de matching de Trankyl, lui, reste du code proprietaire (licence MIT), utilise en interne. Les deux mondes ont des logiques differentes, d'ou la separation.",
      "A terme, un pont technique reliera les deux : les certifications delivrees par l'Academy devrant alimenter le score de matching cote Trankyl. Ce pont n'existe pas encore, il viendra dans une prochaine etape.",
    ],
  },
];

export function getArticle(slug: string): BlogArticle | undefined {
  return articles.find((a) => a.slug === slug);
}
