import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText, Button, Card, Chip, EmptyState, Screen, ScreenHeader } from '@/components/ui';
import { confirmDialog, infoDialog } from '@/lib/dialogs';
import { formatRelativeDate, formatTimeAgo, formatVolume } from '@/lib/format';
import { useProgramStore } from '@/lib/store/programs';
import { useWorkoutStore } from '@/lib/store/workouts';
import { useTheme } from '@/theme';
import type { Program, WorkoutTemplate } from '@/types';

/** Favoritter først, deretter opprinnelig rekkefølge */
function favoritesFirst<T extends { isFavorite: boolean }>(items: T[]): T[] {
  return [...items].sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));
}

function feilmelding(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Noe gikk galt. Prøv igjen.';
}

function SectionHeader({ title, actionTitle, onAction }: { title: string; actionTitle?: string; onAction?: () => void }) {
  const { spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.xl,
        marginBottom: spacing.md,
      }}
    >
      <AppText variant="heading">{title}</AppText>
      {actionTitle && onAction ? (
        <Pressable hitSlop={8} onPress={onAction} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <AppText variant="bodyBold" color="accent">
            {actionTitle}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

function FavoriteStar({ isFavorite, onToggle }: { isFavorite: boolean; onToggle: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      hitSlop={10}
      onPress={() => {
        Haptics.selectionAsync();
        onToggle();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <Ionicons
        name={isFavorite ? 'star' : 'star-outline'}
        size={20}
        color={isFavorite ? colors.gold : colors.textMuted}
      />
    </Pressable>
  );
}

export default function TreningScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();

  const active = useWorkoutStore((s) => s.active);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const startFromExercises = useWorkoutStore((s) => s.startFromExercises);
  const workouts = useWorkoutStore((s) => s.workouts);

  const templates = useProgramStore((s) => s.templates);
  const programs = useProgramStore((s) => s.programs);
  const programsLoaded = useProgramStore((s) => s.loaded);
  const programsLoading = useProgramStore((s) => s.loading);
  const loadPrograms = useProgramStore((s) => s.load);
  const toggleTemplateFavorite = useProgramStore((s) => s.toggleTemplateFavorite);
  const toggleProgramFavorite = useProgramStore((s) => s.toggleProgramFavorite);

  const [loadError, setLoadError] = useState<string | null>(null);
  /** Bootstrap-lastingen svelger feil: prøv én gang selv, deretter kun manuelt */
  const attemptedLoad = useRef(false);

  const loadOnce = () => {
    setLoadError(null);
    loadPrograms().catch((error: unknown) => setLoadError(feilmelding(error)));
  };

  useEffect(() => {
    if (programsLoaded || programsLoading || attemptedLoad.current) return;
    attemptedLoad.current = true;
    loadOnce();
    // loadOnce leser kun stabile referanser
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programsLoaded, programsLoading]);

  const history = [...workouts]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  /** Ikke overskriv en pågående økt uten bekreftelse */
  const guardActive = (begin: () => void) => {
    if (useWorkoutStore.getState().active) {
      confirmDialog({
        title: 'Pågående økt',
        message: 'Du har allerede en økt i gang. Vil du forkaste den og starte en ny?',
        confirmLabel: 'Forkast og start ny',
        destructive: true,
        onConfirm: begin,
      });
      return;
    }
    begin();
  };

  const startEmpty = () =>
    guardActive(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      startWorkout('Treningsøkt');
      router.push('/workout/active');
    });

  const startTemplate = (template: WorkoutTemplate) =>
    guardActive(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      startFromExercises(template.name, template.exercises, { templateId: template.id });
      router.push('/workout/active');
    });

  // Programmer og maler hentes fra serveren i bootstrap — vent på første lasting
  if (!programsLoaded) {
    return (
      <Screen>
        <ScreenHeader title="Trening" hideBack />
        {loadError ? (
          <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl }}>
            <AppText variant="body" color="danger" style={{ textAlign: 'center' }}>
              {loadError}
            </AppText>
            <Button title="Prøv igjen" variant="secondary" size="sm" onPress={loadOnce} />
            {/* En tom økt trenger ingen serverdata — skal alltid være mulig */}
            <Button title="Start tom økt" icon="add" onPress={startEmpty} />
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        )}
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader title="Trening" hideBack />

      {/* Kom i gang / fortsett */}
      <Animated.View entering={FadeInDown.duration(300)}>
        {active ? (
          <Pressable
            onPress={() => router.push('/workout/active')}
            style={({ pressed }) => ({
              backgroundColor: colors.accent,
              borderRadius: radius.lg,
              padding: spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: radius.full,
                backgroundColor: colors.onAccentMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="play" size={22} color={colors.onAccent} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="subheading" color="onAccent" numberOfLines={1}>
                Fortsett økten
              </AppText>
              <AppText variant="caption" color="onAccent" numberOfLines={1} style={{ opacity: 0.85 }}>
                {active.name} · startet {formatTimeAgo(active.startedAt)}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.onAccent} />
          </Pressable>
        ) : (
          <Card style={{ gap: spacing.md }}>
            <AppText variant="subheading">Kom i gang</AppText>
            <AppText variant="caption" color="muted">
              Start en tom økt og legg til øvelser underveis.
            </AppText>
            <Button title="Start tom økt" icon="add" size="lg" fullWidth onPress={startEmpty} />
          </Card>
        )}
      </Animated.View>

      {/* Favorittøkter */}
      <Animated.View entering={FadeInDown.delay(60).duration(300)}>
        <SectionHeader
          title="Favorittøkter"
          actionTitle="+ Ny favorittøkt"
          onAction={() => router.push('/templates/new')}
        />
        {templates.length === 0 ? (
          <EmptyState
            icon="star-outline"
            title="Ingen favorittøkter"
            message="Lag en mal du kan starte med ett trykk."
            actionTitle="Ny favorittøkt"
            onAction={() => router.push('/templates/new')}
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {favoritesFirst(templates).map((template) => (
              <Card key={template.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="bodyBold" numberOfLines={1}>
                      {template.name}
                    </AppText>
                    <AppText variant="caption" color="muted">
                      {template.exercises.length}{' '}
                      {template.exercises.length === 1 ? 'øvelse' : 'øvelser'}
                    </AppText>
                  </View>
                  <FavoriteStar
                    isFavorite={template.isFavorite}
                    onToggle={() =>
                      toggleTemplateFavorite(template.id).catch((error: unknown) =>
                        infoDialog('Kunne ikke oppdatere favoritt', feilmelding(error)),
                      )
                    }
                  />
                  <Button title="Start" size="sm" icon="play" onPress={() => startTemplate(template)} />
                </View>
              </Card>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Programmer */}
      <Animated.View entering={FadeInDown.delay(120).duration(300)}>
        <SectionHeader
          title="Programmer"
          actionTitle="+ Nytt program"
          onAction={() => router.push('/programs/new')}
        />
        {programs.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="Ingen programmer"
            message="Bygg et treningsprogram med faste dager."
            actionTitle="Nytt program"
            onAction={() => router.push('/programs/new')}
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {favoritesFirst(programs).map((program: Program) => (
              <Card key={program.id} onPress={() => router.push(`/programs/${program.id}`)}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <AppText variant="bodyBold" numberOfLines={1}>
                      {program.name}
                    </AppText>
                    {program.description ? (
                      <AppText variant="caption" color="muted" numberOfLines={2}>
                        {program.description}
                      </AppText>
                    ) : null}
                    <AppText variant="caption" color="secondary">
                      {program.days.length} {program.days.length === 1 ? 'dag' : 'dager'}
                    </AppText>
                  </View>
                  <FavoriteStar
                    isFavorite={program.isFavorite}
                    onToggle={() =>
                      toggleProgramFavorite(program.id).catch((error: unknown) =>
                        infoDialog('Kunne ikke oppdatere favoritt', feilmelding(error)),
                      )
                    }
                  />
                </View>
              </Card>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Historikk */}
      <Animated.View entering={FadeInDown.delay(180).duration(300)}>
        <SectionHeader title="Historikk" />
        {history.length === 0 ? (
          <EmptyState
            icon="barbell-outline"
            title="Ingen økter ennå"
            message="Fullførte økter dukker opp her."
            actionTitle="Start tom økt"
            onAction={startEmpty}
          />
        ) : (
          <Card padded={false}>
            {history.map((workout, index) => (
              <View key={workout.id}>
                {index > 0 ? (
                  <View style={{ height: 1, backgroundColor: colors.border, marginLeft: spacing.lg }} />
                ) : null}
                <Pressable
                  onPress={() => router.push(`/workout/${workout.id}`)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.lg,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="bodyBold" numberOfLines={1}>
                      {workout.name}
                    </AppText>
                    <AppText variant="caption" color="muted">
                      {formatRelativeDate(workout.date)} · {formatVolume(workout.totalVolumeKg)}
                    </AppText>
                  </View>
                  {workout.prCount > 0 ? (
                    <Chip label={`${workout.prCount} PR`} icon="trophy" selected />
                  ) : null}
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </Card>
        )}
      </Animated.View>
    </Screen>
  );
}
