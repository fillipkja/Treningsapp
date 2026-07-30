import { getLanguage, t } from '@/i18n';
import { muscleLabel } from '@/i18n/labels';
import type { Program, ProgramDay } from '@/types';

/**
 * Ferdiglagd program i biblioteket. Bygges ved kalltidspunkt slik at navn og
 * beskrivelser følger brukerens aktive språk (samme prinsipp som starterne —
 * innholdet seedes/lagres til serveren på språket brukeren har valgt).
 */
export interface LibraryProgram {
  /** Stabil nøkkel for biblioteket (vises aldri, lagres ikke på serveren) */
  key: string;
  name: string;
  description: string;
  days: ProgramDay[];
}

/** LibraryProgram → utkast som kan sendes rett til addProgram/insertProgram */
export function toProgramDraft(
  program: LibraryProgram,
  isFavorite = false,
): Omit<Program, 'id' | 'createdAt'> {
  return {
    name: program.name,
    description: program.description,
    days: program.days,
    isFavorite,
  };
}

/**
 * Hele biblioteket. Dagnavn som «Push»/«Anterior» er internasjonal
 * treningssjargong og brukes uoversatt; norske dagnavn går via i18n/labels.
 * Øvelses-id-ene refererer lib/data/exercises.ts og er API — aldri endre.
 */
export function libraryPrograms(): LibraryProgram[] {
  const lang = getLanguage();
  return [
    {
      key: 'ppl',
      name: t('training.starterPplName'),
      description: t('training.starterPplDesc'),
      days: [
        {
          id: 'ppl-push',
          name: 'Push',
          exercises: [
            { exerciseId: 'benkpress', sets: 4, repsMin: 5, repsMax: 8 },
            { exerciseId: 'skulderpress-stang', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'skrabenk-manualer', sets: 3, repsMin: 8, repsMax: 12 },
            { exerciseId: 'sidehev', sets: 3, repsMin: 12, repsMax: 15 },
            { exerciseId: 'triceps-pushdown', sets: 3, repsMin: 10, repsMax: 15 },
          ],
        },
        {
          id: 'ppl-pull',
          name: 'Pull',
          exercises: [
            { exerciseId: 'markloft', sets: 3, repsMin: 3, repsMax: 5 },
            { exerciseId: 'pullups', sets: 3, repsMin: 6, repsMax: 10 },
            { exerciseId: 'roing-stang', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'nedtrekk', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'bicepscurl-stang', sets: 3, repsMin: 10, repsMax: 12 },
          ],
        },
        {
          id: 'ppl-legs',
          name: 'Legs',
          exercises: [
            { exerciseId: 'kneboy', sets: 4, repsMin: 5, repsMax: 8 },
            { exerciseId: 'rumensk-markloft', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'beinpress', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'utfall', sets: 3, repsMin: 10, repsMax: 12 },
          ],
        },
      ],
    },
    {
      key: 'fullkropp',
      name: t('training.starterFullBodyName'),
      description: t('training.starterFullBodyDesc'),
      days: [
        {
          id: 'fk-a',
          name: t('training.starterDayA'),
          exercises: [
            { exerciseId: 'kneboy', sets: 3, repsMin: 5, repsMax: 8 },
            { exerciseId: 'benkpress', sets: 3, repsMin: 5, repsMax: 8 },
            { exerciseId: 'roing-stang', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'planke', sets: 3, repsMin: 1 },
          ],
        },
        {
          id: 'fk-b',
          name: t('training.starterDayB'),
          exercises: [
            { exerciseId: 'markloft', sets: 3, repsMin: 3, repsMax: 5 },
            { exerciseId: 'skulderpress-stang', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'nedtrekk', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'utfall', sets: 3, repsMin: 10, repsMax: 12 },
          ],
        },
        {
          id: 'fk-c',
          name: t('training.starterDayC'),
          exercises: [
            { exerciseId: 'frontboy', sets: 3, repsMin: 6, repsMax: 8 },
            { exerciseId: 'dips', sets: 3, repsMin: 8, repsMax: 12 },
            { exerciseId: 'chins', sets: 3, repsMin: 6, repsMax: 10 },
            { exerciseId: 'hip-thrust', sets: 3, repsMin: 8, repsMax: 12 },
          ],
        },
      ],
    },
    {
      key: 'ppl-ul',
      name: t('training.libPplUlName'),
      description: t('training.libPplUlDesc'),
      days: [
        {
          id: 'pplul-push',
          name: 'Push',
          exercises: [
            { exerciseId: 'benkpress', sets: 4, repsMin: 5, repsMax: 8 },
            { exerciseId: 'skulderpress-stang', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'skrabenk-manualer', sets: 3, repsMin: 8, repsMax: 12 },
            { exerciseId: 'sidehev', sets: 3, repsMin: 12, repsMax: 15 },
            { exerciseId: 'triceps-pushdown-tau', sets: 3, repsMin: 10, repsMax: 15 },
          ],
        },
        {
          id: 'pplul-pull',
          name: 'Pull',
          exercises: [
            { exerciseId: 'markloft', sets: 3, repsMin: 3, repsMax: 5 },
            { exerciseId: 'pullups', sets: 3, repsMin: 6, repsMax: 10 },
            { exerciseId: 'roing-stang', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'face-pull', sets: 3, repsMin: 12, repsMax: 15 },
            { exerciseId: 'bicepscurl-manualer', sets: 3, repsMin: 10, repsMax: 12 },
          ],
        },
        {
          id: 'pplul-legs',
          name: 'Legs',
          exercises: [
            { exerciseId: 'kneboy', sets: 4, repsMin: 5, repsMax: 8 },
            { exerciseId: 'rumensk-markloft', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'beinpress', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'laarcurl-sittende', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'taahev-staaende', sets: 4, repsMin: 10, repsMax: 15 },
          ],
        },
        {
          id: 'pplul-upper',
          name: t('training.libDayUpper'),
          exercises: [
            { exerciseId: 'benkpress-manualer', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'sittende-kabelroing', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'skulderpress-manualer', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'nedtrekk', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'ez-curl', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'triceps-extension-kabel', sets: 3, repsMin: 10, repsMax: 12 },
          ],
        },
        {
          id: 'pplul-lower',
          name: t('training.libDayLower'),
          exercises: [
            { exerciseId: 'frontboy', sets: 3, repsMin: 6, repsMax: 8 },
            { exerciseId: 'hip-thrust', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'bulgarske-utfall', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'laarcurl-liggende', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'planke', sets: 3, repsMin: 1 },
          ],
        },
      ],
    },
    {
      key: 'anterior-posterior',
      name: t('training.libAntPostName'),
      description: t('training.libAntPostDesc'),
      days: [
        {
          id: 'antpost-ant-a',
          name: 'Anterior A',
          exercises: [
            { exerciseId: 'kneboy', sets: 4, repsMin: 5, repsMax: 8 },
            { exerciseId: 'benkpress', sets: 4, repsMin: 5, repsMax: 8 },
            { exerciseId: 'skulderpress-manualer', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'utfall-manualer', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'triceps-pushdown', sets: 3, repsMin: 10, repsMax: 15 },
            { exerciseId: 'planke', sets: 3, repsMin: 1 },
          ],
        },
        {
          id: 'antpost-post-a',
          name: 'Posterior A',
          exercises: [
            { exerciseId: 'markloft', sets: 3, repsMin: 3, repsMax: 5 },
            { exerciseId: 'roing-stang', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'laarcurl-liggende', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'face-pull', sets: 3, repsMin: 12, repsMax: 15 },
            { exerciseId: 'bicepscurl-stang', sets: 3, repsMin: 10, repsMax: 12 },
          ],
        },
        {
          id: 'antpost-ant-b',
          name: 'Anterior B',
          exercises: [
            { exerciseId: 'frontboy', sets: 3, repsMin: 6, repsMax: 8 },
            { exerciseId: 'skrabenk-manualer', sets: 3, repsMin: 8, repsMax: 12 },
            { exerciseId: 'beinpress', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'sidehev', sets: 3, repsMin: 12, repsMax: 15 },
            { exerciseId: 'smal-benkpress', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'hengende-beinhev', sets: 3, repsMin: 8, repsMax: 12 },
          ],
        },
        {
          id: 'antpost-post-b',
          name: 'Posterior B',
          exercises: [
            { exerciseId: 'rumensk-markloft', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'pullups', sets: 3, repsMin: 6, repsMax: 10 },
            { exerciseId: 'hip-thrust', sets: 3, repsMin: 8, repsMax: 12 },
            { exerciseId: 'omvendt-flyes-manualer', sets: 3, repsMin: 12, repsMax: 15 },
            { exerciseId: 'hammercurl', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'rygghev', sets: 3, repsMin: 10, repsMax: 15 },
          ],
        },
      ],
    },
    {
      key: 'upper-lower',
      name: t('training.libUpperLowerName'),
      description: t('training.libUpperLowerDesc'),
      days: [
        {
          id: 'ul-upper-a',
          name: `${t('training.libDayUpper')} A`,
          exercises: [
            { exerciseId: 'benkpress', sets: 4, repsMin: 5, repsMax: 8 },
            { exerciseId: 'roing-stang', sets: 4, repsMin: 5, repsMax: 8 },
            { exerciseId: 'skulderpress-stang', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'nedtrekk', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'bicepscurl-stang', sets: 3, repsMin: 10, repsMax: 12 },
          ],
        },
        {
          id: 'ul-lower-a',
          name: `${t('training.libDayLower')} A`,
          exercises: [
            { exerciseId: 'kneboy', sets: 4, repsMin: 5, repsMax: 8 },
            { exerciseId: 'rumensk-markloft', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'beinpress', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'taahev-staaende', sets: 4, repsMin: 10, repsMax: 15 },
            { exerciseId: 'planke', sets: 3, repsMin: 1 },
          ],
        },
        {
          id: 'ul-upper-b',
          name: `${t('training.libDayUpper')} B`,
          exercises: [
            { exerciseId: 'skulderpress-manualer', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'pullups', sets: 3, repsMin: 6, repsMax: 10 },
            { exerciseId: 'skrabenk-manualer', sets: 3, repsMin: 8, repsMax: 12 },
            { exerciseId: 'sittende-kabelroing', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'sidehev', sets: 3, repsMin: 12, repsMax: 15 },
            { exerciseId: 'triceps-pushdown', sets: 3, repsMin: 10, repsMax: 15 },
          ],
        },
        {
          id: 'ul-lower-b',
          name: `${t('training.libDayLower')} B`,
          exercises: [
            { exerciseId: 'markloft', sets: 3, repsMin: 3, repsMax: 5 },
            { exerciseId: 'bulgarske-utfall', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'laarcurl-liggende', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'hip-thrust', sets: 3, repsMin: 8, repsMax: 12 },
            { exerciseId: 'hengende-knehev', sets: 3, repsMin: 8, repsMax: 12 },
          ],
        },
      ],
    },
    {
      key: 'femsplitt',
      name: t('training.libBroName'),
      description: t('training.libBroDesc'),
      days: [
        {
          id: 'fem-bryst',
          name: muscleLabel('bryst', lang),
          exercises: [
            { exerciseId: 'benkpress', sets: 4, repsMin: 6, repsMax: 10 },
            { exerciseId: 'skrabenk-manualer', sets: 3, repsMin: 8, repsMax: 12 },
            { exerciseId: 'flyes-manualer', sets: 3, repsMin: 12, repsMax: 15 },
            { exerciseId: 'kabelkryss', sets: 3, repsMin: 12, repsMax: 15 },
            { exerciseId: 'pushups', sets: 2, repsMin: 10, repsMax: 20 },
          ],
        },
        {
          id: 'fem-rygg',
          name: muscleLabel('rygg', lang),
          exercises: [
            { exerciseId: 'markloft', sets: 3, repsMin: 3, repsMax: 5 },
            { exerciseId: 'pullups', sets: 3, repsMin: 6, repsMax: 10 },
            { exerciseId: 'roing-stang', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'nedtrekk', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'shrugs-stang', sets: 3, repsMin: 10, repsMax: 15 },
          ],
        },
        {
          id: 'fem-skuldre',
          name: muscleLabel('skuldre', lang),
          exercises: [
            { exerciseId: 'skulderpress-stang', sets: 4, repsMin: 6, repsMax: 10 },
            { exerciseId: 'sidehev', sets: 4, repsMin: 12, repsMax: 15 },
            { exerciseId: 'fronthev-manualer', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'omvendt-flyes-manualer', sets: 3, repsMin: 12, repsMax: 15 },
            { exerciseId: 'face-pull', sets: 3, repsMin: 12, repsMax: 20 },
          ],
        },
        {
          id: 'fem-armer',
          name: t('training.libDayArms'),
          exercises: [
            { exerciseId: 'bicepscurl-stang', sets: 3, repsMin: 8, repsMax: 12 },
            { exerciseId: 'smal-benkpress', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'hammercurl', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'triceps-pushdown-tau', sets: 3, repsMin: 10, repsMax: 15 },
            { exerciseId: 'preachercurl', sets: 2, repsMin: 10, repsMax: 12 },
            { exerciseId: 'kickbacks-manualer', sets: 2, repsMin: 12, repsMax: 15 },
          ],
        },
        {
          id: 'fem-bein',
          name: t('training.libDayLegs'),
          exercises: [
            { exerciseId: 'kneboy', sets: 4, repsMin: 6, repsMax: 10 },
            { exerciseId: 'beinpress', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'rumensk-markloft', sets: 3, repsMin: 8, repsMax: 10 },
            { exerciseId: 'utfall', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'laarcurl-liggende', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'taahev-staaende', sets: 4, repsMin: 12, repsMax: 15 },
          ],
        },
      ],
    },
    {
      key: 'styrke5x5',
      name: t('training.lib5x5Name'),
      description: t('training.lib5x5Desc'),
      days: [
        {
          id: '5x5-a',
          name: t('training.starterDayA'),
          exercises: [
            { exerciseId: 'kneboy', sets: 5, repsMin: 5 },
            { exerciseId: 'benkpress', sets: 5, repsMin: 5 },
            { exerciseId: 'roing-stang', sets: 5, repsMin: 5 },
          ],
        },
        {
          id: '5x5-b',
          name: t('training.starterDayB'),
          exercises: [
            { exerciseId: 'kneboy', sets: 5, repsMin: 5 },
            { exerciseId: 'skulderpress-stang', sets: 5, repsMin: 5 },
            { exerciseId: 'markloft', sets: 1, repsMin: 5 },
          ],
        },
      ],
    },
    {
      key: 'kroppsvekt',
      name: t('training.libBodyweightName'),
      description: t('training.libBodyweightDesc'),
      days: [
        {
          id: 'kv-a',
          name: t('training.starterDayA'),
          exercises: [
            { exerciseId: 'pushups', sets: 4, repsMin: 8, repsMax: 15 },
            { exerciseId: 'omvendt-roing', sets: 3, repsMin: 6, repsMax: 12 },
            { exerciseId: 'utfall', sets: 3, repsMin: 10, repsMax: 15 },
            { exerciseId: 'setebro', sets: 3, repsMin: 12, repsMax: 15 },
            { exerciseId: 'planke', sets: 3, repsMin: 1 },
          ],
        },
        {
          id: 'kv-b',
          name: t('training.starterDayB'),
          exercises: [
            { exerciseId: 'pike-pushups', sets: 3, repsMin: 6, repsMax: 12 },
            { exerciseId: 'dips-benk', sets: 3, repsMin: 8, repsMax: 15 },
            { exerciseId: 'bulgarske-utfall', sets: 3, repsMin: 8, repsMax: 12 },
            { exerciseId: 'enbeins-setebro', sets: 3, repsMin: 10, repsMax: 12 },
            { exerciseId: 'sideplanke', sets: 3, repsMin: 1 },
          ],
        },
        {
          id: 'kv-c',
          name: t('training.starterDayC'),
          exercises: [
            { exerciseId: 'brede-pushups', sets: 3, repsMin: 8, repsMax: 15 },
            { exerciseId: 'superman', sets: 3, repsMin: 12, repsMax: 15 },
            { exerciseId: 'gaaende-utfall', sets: 3, repsMin: 10, repsMax: 14 },
            { exerciseId: 'crunches', sets: 3, repsMin: 15, repsMax: 20 },
            { exerciseId: 'fjellklatrere', sets: 3, repsMin: 20, repsMax: 30 },
          ],
        },
      ],
    },
  ];
}
