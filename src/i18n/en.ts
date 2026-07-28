import type { nb } from './nb';
import { authEn } from './domains/auth';
import { badgesEn } from './domains/badges';
import { commonEn } from './domains/common';
import { competeEn } from './domains/compete';
import { exercisesEn } from './domains/exercises';
import { homeEn } from './domains/home';
import { notificationsEn } from './domains/notifications';
import { profileEn } from './domains/profile';
import { statsEn } from './domains/stats';
import { trainingEn } from './domains/training';
import { workoutEn } from './domains/workout';

export const en: Record<keyof typeof nb, string> = {
  ...commonEn,
  ...authEn,
  ...homeEn,
  ...workoutEn,
  ...trainingEn,
  ...statsEn,
  ...competeEn,
  ...profileEn,
  ...exercisesEn,
  ...notificationsEn,
  ...badgesEn,
};
