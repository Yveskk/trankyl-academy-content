export interface FaqItem {
  question: string;
  answer: string;
}

export const faqItems: FaqItem[] = [
  {
    question: "Qu'est-ce que Trankyl Academy ?",
    answer:
      "Trankyl Academy est la plateforme de formation courte et de micro-certification pour les metiers de service a domicile : nounou, aide a domicile, cuisinier, agent d'entretien. Chaque metier est decoupe en niveaux, chaque niveau en modules de 2 a 3 heures valides par un quiz.",
  },
  {
    question: "Est-ce que je deviens automatiquement prestataire Trankyl une fois certifie ?",
    answer:
      "Pas immediatement. Trankyl Academy et la marketplace Trankyl sont deux systemes distincts aujourd'hui. Vos certifications sont conservees et comptent, mais l'activation en tant que prestataire (avec un compte vendeur lie) est une etape geree separement, a venir.",
  },
  {
    question: "Combien de temps prend un module ?",
    answer:
      "Entre 2 et 3 heures en general, avec une evaluation courte a la fin. C'est volontairement decoupe en petites sessions pour rester accessible meme si vous ne pouvez y consacrer que quelques heures a la fois.",
  },
  {
    question: "Que se passe-t-il si je rate le quiz d'un module ?",
    answer:
      "Vous pouvez repasser le quiz autant de fois que necessaire. Le module n'est marque 'termine' que lorsque votre score atteint le seuil de reussite defini pour ce quiz.",
  },
  {
    question: "Comment sont delivrees les certifications ?",
    answer:
      "Automatiquement : des que tous les modules d'un niveau (toutes les competences comprises) sont valides, la certification correspondante (par exemple nounou_niveau_1) est delivree sur votre profil.",
  },
  {
    question: "La taxonomie et le curriculum sont-ils libres d'acces ?",
    answer:
      "Oui. Le referentiel de competences et le curriculum pedagogique sont publies sous licence CC-BY-4.0 : vous pouvez les reprendre et les adapter, a condition de citer Trankyl Academy comme source.",
  },
  {
    question: "Comment devenir formateur ou proposer un nouveau metier ?",
    answer:
      "Pour l'instant, la gestion du referentiel se fait cote administration Trankyl Academy. Si vous souhaitez proposer un metier ou un module, passez par la page Contact.",
  },
];
