import { authNb } from './domains/auth';
import { badgesNb } from './domains/badges';
import { commonNb } from './domains/common';
import { competeNb } from './domains/compete';
import { exercisesNb } from './domains/exercises';
import { homeNb } from './domains/home';
import { notificationsNb } from './domains/notifications';
import { profileNb } from './domains/profile';
import { statsNb } from './domains/stats';
import { trainingNb } from './domains/training';
import { workoutNb } from './domains/workout';

export const nb = {
  ...commonNb,
  ...authNb,
  ...homeNb,
  ...workoutNb,
  ...trainingNb,
  ...statsNb,
  ...competeNb,
  ...profileNb,
  ...exercisesNb,
  ...notificationsNb,
  ...badgesNb,
} as const;
