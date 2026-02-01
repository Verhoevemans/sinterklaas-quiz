import { Injectable } from '@angular/core';
import { Question } from '../models';

@Injectable({
  providedIn: 'root',
})
export class MockQuestionsService {
  private questions: Question[] = [
    {
      id: '1',
      text: 'Wanneer viert men Sinterklaas in Nederland?',
      options: ['5 december', '6 december', '25 december', '1 december'],
      correctAnswerIndex: 0,
      explanation:
        'In Nederland wordt Sinterklaas traditioneel gevierd op 5 december, de avond voor Sinterklaasavond.',
      questionType: 'multiple-choice',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      text: 'Hoe heet het paard van Sinterklaas?',
      options: ['Tornado', 'Amerigo', 'Ozosnel', 'Sleipnir'],
      correctAnswerIndex: 1,
      explanation:
        'Het paard van Sinterklaas heet Amerigo. Het is een wit schimmel die over de daken kan lopen.',
      questionType: 'multiple-choice',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '3',
      text: 'Vanuit welk land komt Sinterklaas volgens de traditie?',
      options: ['Italië', 'Turkije', 'Spanje', 'Griekenland'],
      correctAnswerIndex: 2,
      explanation:
        'Volgens de Nederlandse traditie komt Sinterklaas elk jaar vanuit Spanje met de boot naar Nederland.',
      questionType: 'multiple-choice',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '4',
      text: 'Wat is een traditionele lekkernij tijdens Sinterklaas?',
      options: ['Oliebollen', 'Pepernoten', 'Appeltaart', 'Stroopwafels'],
      correctAnswerIndex: 1,
      explanation:
        'Pepernoten zijn kleine, ronde kruidige koekjes die traditioneel worden gegeten tijdens Sinterklaas.',
      questionType: 'multiple-choice',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '5',
      text: 'In welke kleur is Sinterklaas traditioneel gekleed?',
      options: ['Groen', 'Blauw', 'Rood', 'Paars'],
      correctAnswerIndex: 2,
      explanation:
        'Sinterklaas draagt een rode mantel en mijter, versierd met goud en edelstenen.',
      questionType: 'multiple-choice',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '6',
      text: 'Wat doen kinderen in hun schoen zetten voor Sinterklaas?',
      options: ['Een brief', 'Een appel', 'Een wortel', 'Een tekening'],
      correctAnswerIndex: 2,
      explanation:
        'Kinderen zetten traditioneel een wortel of hooi in hun schoen voor het paard van Sinterklaas.',
      questionType: 'multiple-choice',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '7',
      text: 'Welk boek houdt Sinterklaas bij?',
      options: ['Het grote boek', 'Het dikke boek', 'Het gouden boek', 'Het rode boek'],
      correctAnswerIndex: 0,
      explanation:
        'Sinterklaas houdt het grote boek bij waarin staat of kinderen braaf of stout zijn geweest.',
      questionType: 'multiple-choice',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '8',
      text: 'Wat is de staf van Sinterklaas?',
      options: ['Een scepter', 'Een stok', 'Een kromstaf', 'Een toverstaf'],
      correctAnswerIndex: 2,
      explanation:
        'Sinterklaas draagt een kromstaf, een herdersstaf die hoort bij zijn rol als bisschop.',
      questionType: 'multiple-choice',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '9',
      text: 'Waar wordt het pakjesavond gevierd?',
      options: ['Op straat', 'In de kerk', 'Thuis', 'Op school'],
      correctAnswerIndex: 2,
      explanation:
        'Pakjesavond wordt traditioneel thuis gevierd met familie, waarbij cadeaus worden uitgewisseld.',
      questionType: 'multiple-choice',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '10',
      text: 'Welk snoepgoed wordt traditioneel in de schoen gestopt?',
      options: ['Chocolade letters', 'Lollies', 'Kauwgom', 'Marsepein'],
      correctAnswerIndex: 0,
      explanation:
        'Chocolade letters met de beginletter van de naam zijn een klassieke Sinterklaas verrassing.',
      questionType: 'multiple-choice',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '11',
      text: 'Hoe heet de aankomst van Sinterklaas in Nederland?',
      options: ['De landing', 'De intocht', 'Het feest', 'De parade'],
      correctAnswerIndex: 1,
      explanation:
        'De intocht is de officiële aankomst van Sinterklaas, meestal met een boot en optocht.',
      questionType: 'multiple-choice',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '12',
      text: 'Wat is taai-taai?',
      options: ['Een spel', 'Een koek', 'Een lied', 'Een dans'],
      correctAnswerIndex: 1,
      explanation:
        'Taai-taai is een peperkoek gemaakt met honing en kruiden, traditioneel bij Sinterklaas.',
      questionType: 'multiple-choice',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '13',
      text: 'Wanneer begint het schoentje zetten traditioneel?',
      options: [
        'Direct na de intocht',
        'Op 1 december',
        'Een week voor pakjesavond',
        'Op 5 december',
      ],
      correctAnswerIndex: 0,
      explanation:
        'Kinderen beginnen vaak met schoentje zetten zodra Sinterklaas in Nederland is aangekomen.',
      questionType: 'multiple-choice',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '14',
      text: 'Welk kledingstuk draagt Sinterklaas op zijn hoofd?',
      options: ['Een hoed', 'Een kroon', 'Een mijter', 'Een muts'],
      correctAnswerIndex: 2,
      explanation:
        'Sinterklaas draagt een mijter, een hoge puntvormige bisschopsmuts met een kruis erop.',
      questionType: 'multiple-choice',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '15',
      text: 'Wat gebeurt er met stoute kinderen volgens de oude verhalen?',
      options: [
        'Ze krijgen geen cadeaus',
        'Ze gaan mee in de zak naar Spanje',
        'Ze krijgen een roe',
        'Alle opties zijn mogelijk',
      ],
      correctAnswerIndex: 3,
      explanation:
        'In de oude verhalen konden stoute kinderen geen cadeaus krijgen, een roe krijgen, of zelfs mee in de zak naar Spanje gaan.',
      questionType: 'multiple-choice',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '16',
      text: 'Welk gedicht wordt vaak voorgelezen tijdens pakjesavond?',
      options: ['Een rijmpje', 'Een surprise gedicht', 'Een sinterklaasgedicht', 'Een versje'],
      correctAnswerIndex: 2,
      explanation:
        'Bij elk cadeau hoort traditioneel een sinterklaasgedicht dat persoonlijk is geschreven.',
      questionType: 'multiple-choice',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '17',
      text: 'Wat is een "surprise" tijdens Sinterklaas?',
      options: [
        'Een onverwacht bezoek',
        'Een creatief verpakt cadeau',
        'Een verrassing in je schoen',
        'Een spelletje',
      ],
      correctAnswerIndex: 1,
      explanation:
        'Een surprise is een creatief en vaak humoristisch verpakt cadeau, meestal met een gedicht.',
      questionType: 'multiple-choice',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '18',
      text: 'Welk historisch figuur is Sinterklaas gebaseerd op?',
      options: [
        'Sint Nicolaas',
        'Sint Maarten',
        'Sint Franciscus',
        'Sint Benedictus',
      ],
      correctAnswerIndex: 0,
      explanation:
        'Sinterklaas is gebaseerd op Sint Nicolaas, een bisschop uit Myra in de 4e eeuw.',
      questionType: 'multiple-choice',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '19',
      text: 'Wat zingen kinderen vaak voor Sinterklaas?',
      options: [
        'Kerstliedjes',
        'Sinterklaas kapoentje',
        'Verjaardagsliedjes',
        'Schoolliedjes',
      ],
      correctAnswerIndex: 1,
      explanation:
        '"Sinterklaas kapoentje" is het bekendste Sinterklaasliedje dat kinderen zingen.',
      questionType: 'multiple-choice',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '20',
      text: 'Hoeveel Pieten helpen Sinterklaas traditioneel?',
      options: ['Eén', 'Vijf', 'Tien', 'Heel veel'],
      correctAnswerIndex: 3,
      explanation:
        'Sinterklaas heeft heel veel Pieten die hem helpen, elk met hun eigen taak en specialiteit.',
      questionType: 'multiple-choice',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  getRandomQuestions(count: number): Question[] {
    const shuffled = [...this.questions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, this.questions.length));
  }

  getAllQuestions(): Question[] {
    return [...this.questions];
  }
}
