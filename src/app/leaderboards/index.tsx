import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ExercisePickerSheet } from '@/components/exercises/exercise-picker-sheet';
import {
  AppText,
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  Screen,
  ScreenHeader,
  SegmentedControl,
} from '@/components/ui';
import { t as translate, useLanguage, useT, type TranslationKey } from '@/i18n';
import { distanceLabel } from '@/i18n/labels';
import { fetchRunningLeaderboard, fetchStrengthLeaderboard } from '@/lib/api/leaderboard';
import { fetchProfilesByIds } from '@/lib/api/profiles';
import { exerciseDisplayName } from '@/lib/data/exercise-i18n';
import { formatDuration, formatKg, formatRelativeDate } from '@/lib/format';
import {
  assignSharedRanks,
  STANDARD_RUN_DISTANCES,
  STRENGTH_SCHEMES,
  type StrengthSchemeKey,
} from '@/lib/logic/leaderboard';
import { useAuthStore } from '@/lib/store/auth';
import { getExerciseById } from '@/lib/store/exercises';
import { useRecordStore } from '@/lib/store/records';
import { tierColors, useTheme } from '@/theme';
import type { Exercise, UserProfile } from '@/types';

type BoardMode = 'styrke' | 'løping';

/** Faste storløft i chip-raden — id-ene finnes i øvelsesdatabasen (ikke endre) */
const DEFAULT_LIFTS = ['benkpress', 'kneboy', 'markloft', 'skulderpress-stang'] as const;

/** Etikettnøkkel per styrkeskjema */
const SCHEME_LABEL_KEY: Record<StrengthSchemeKey, TranslationKey> = {
  single: 'compete.schemeSingle',
  five: 'compete.schemeFive',
  fivebyfive: 'compete.schemeFiveByFive',
};

interface RankedEntry {
  userId: string;
  value: number;
  /** Utelatt når rekorden bak er udatert */
  achievedAt?: string;
  rank: number;
}

/** Sorter og gi delt plassering ved likhet — løping rangeres stigende */
function rankEntries(
  rows: { userId: string; value: number; achievedAt?: string }[],
  lowerIsBetter: boolean,
): RankedEntry[] {
  return assignSharedRanks(
    rows.map((row) => ({ ...row, rank: 0 })),
    (entry) => entry.value,
    lowerIsBetter,
  );
}

export default function LeaderboardsScreen() {
  const { colors, spacing, radius, isDark } = useTheme();
  const themeMode = isDark ? 'dark' : 'light';
  const t = useT();
  const lang = useLanguage();
  const router = useRouter();

  const me = useAuthStore((s) => s.user);
  const myRuns = useRecordStore((s) => s.runs);

  const [boardMode, setBoardMode] = useState<BoardMode>('styrke');
  const [exerciseId, setExerciseId] = useState<string>(DEFAULT_LIFTS[0]);
  const [schemeKey, setSchemeKey] = useState<StrengthSchemeKey>('single');
  const [distanceM, setDistanceM] = useState<number>(5000);
  /** Egendefinert valg fra øvelsesvelgeren vises som egen chip */
  const [customExercise, setCustomExercise] = useState<Exercise | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const [board, setBoard] = useState<{
    key: string;
    entries: RankedEntry[];
    profiles: Map<string, UserProfile>;
  } | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);

  /** Gull/sølv/bronse til topp tre */
  const medalColor = (rank: number): string | undefined => {
    if (rank === 1) return tierColors[themeMode].gull;
    if (rank === 2) return tierColors[themeMode].sølv;
    if (rank === 3) return tierColors[themeMode].bronse;
    return undefined;
  };

  // Standarddistansene pluss distanser brukeren selv har loggført, stigende —
  // slik får også egendefinerte distanser en tavle.
  const runDistanceChips = useMemo(
    () =>
      [...new Set<number>([...STANDARD_RUN_DISTANCES, ...myRuns.map((r) => r.distanceM)])].sort(
        (a, b) => a - b,
      ),
    [myRuns],
  );

  /** Utvalget en henting gjelder — hindrer at et tregt svar overskriver et nyere */
  const selectorKey =
    boardMode === 'styrke' ? `styrke:${exerciseId}:${schemeKey}` : `løping:${distanceM}`;
  const requestedKey = useRef(selectorKey);

  const loadBoard = useCallback(async () => {
    requestedKey.current = selectorKey;
    try {
      setBoardError(null);
      let rows: { userId: string; value: number; achievedAt?: string }[];
      if (boardMode === 'styrke') {
        const scheme = STRENGTH_SCHEMES.find((s) => s.key === schemeKey) ?? STRENGTH_SCHEMES[0];
        const result = await fetchStrengthLeaderboard(exerciseId, scheme.minReps, scheme.minSets);
        rows = result.map((r) => ({
          userId: r.userId,
          value: r.bestWeightKg,
          achievedAt: r.achievedAt,
        }));
      } else {
        const result = await fetchRunningLeaderboard(distanceM);
        rows = result.map((r) => ({ userId: r.userId, value: r.bestSec, achievedAt: r.achievedAt }));
      }
      const entries = rankEntries(rows, boardMode === 'løping');
      const profiles = await fetchProfilesByIds(entries.map((e) => e.userId));
      if (requestedKey.current !== selectorKey) return; // utdatert svar
      setBoard({ key: selectorKey, entries, profiles });
      // Rydd bort feil fra et parallelt, feilet kall med samme utvalg
      setBoardError(null);
    } catch (error) {
      if (requestedKey.current !== selectorKey) return;
      setBoardError(error instanceof Error ? error.message : translate('error.generic'));
    }
  }, [selectorKey, boardMode, exerciseId, schemeKey, distanceM]);

  // Refetch ved fokus og ved endring av modus, øvelse, skjema eller distanse
  useFocusEffect(
    useCallback(() => {
      void loadBoard();
    }, [loadBoard]),
  );

  const boardLoading = !boardError && (!board || board.key !== selectorKey);
  const profiles = board?.profiles ?? new Map<string, UserProfile>();

  const nameOf = (userId: string): string =>
    userId === me?.id
      ? t('common.you')
      : (profiles.get(userId)?.displayName ?? t('compete.unknownUser'));

  /** Chip-raden: storløftene + eventuelt egendefinert valg */
  const liftChips: { id: string; label: string }[] = DEFAULT_LIFTS.map((id) => {
    const def = getExerciseById(id);
    return { id, label: def ? exerciseDisplayName(def, lang) : id };
  });
  if (customExercise && !(DEFAULT_LIFTS as readonly string[]).includes(customExercise.id)) {
    liftChips.push({ id: customExercise.id, label: exerciseDisplayName(customExercise, lang) });
  }

  const handlePickExercise = (exercise: Exercise) => {
    if (!(DEFAULT_LIFTS as readonly string[]).includes(exercise.id)) setCustomExercise(exercise);
    setExerciseId(exercise.id);
  };

  const renderRow = (entry: RankedEntry) => {
    const profile = profiles.get(entry.userId);
    const isMe = entry.userId === me?.id;
    const medal = medalColor(entry.rank);
    return (
      <Pressable
        key={entry.userId}
        disabled={isMe}
        onPress={() => router.push(`/friends/${entry.userId}`)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: radius.md,
          backgroundColor: isMe ? colors.accentMuted : 'transparent',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: radius.full,
            borderWidth: medal ? 1.5 : 0,
            borderColor: medal ?? 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText
            variant="caption"
            style={{ fontWeight: '700', color: medal ?? colors.textMuted }}
          >
            {entry.rank}
          </AppText>
        </View>
        <Avatar
          name={profile?.displayName ?? '?'}
          color={profile?.avatarColor ?? colors.accent}
          uri={profile?.avatarUri}
          icon={profile?.avatarIcon}
          size={36}
        />
        <View style={{ flex: 1, gap: 1 }}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {nameOf(entry.userId)}
          </AppText>
          {entry.achievedAt ? (
            <AppText variant="caption" color="muted">
              {formatRelativeDate(entry.achievedAt)}
            </AppText>
          ) : null}
        </View>
        <AppText variant="bodyBold" color="accent">
          {boardMode === 'styrke' ? formatKg(entry.value) : formatDuration(entry.value)}
        </AppText>
      </Pressable>
    );
  };

  const renderAddFriendsCard = () => (
    <Card onPress={() => router.push('/friends/add')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            backgroundColor: colors.accentMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="person-add" size={22} color={colors.accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyBold">{t('compete.addFriendsTitle')}</AppText>
          <AppText variant="caption" color="muted">
            {t('compete.addFriendsBody')}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </Card>
  );

  const renderBoard = () => {
    if (boardError) {
      return (
        <Card>
          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <AppText variant="caption" color="danger" style={{ textAlign: 'center' }}>
              {boardError}
            </AppText>
            <Button
              title={t('common.retry')}
              size="sm"
              variant="secondary"
              onPress={() => void loadBoard()}
            />
          </View>
        </Card>
      );
    }
    if (boardLoading || !board) {
      return (
        <Card>
          <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg }}>
            <ActivityIndicator color={colors.accent} />
            <AppText variant="caption" color="muted">
              {t('compete.loadingBoard')}
            </AppText>
          </View>
        </Card>
      );
    }

    const entries = board.entries;
    // Tomt: kun delte økter/rekorder telles — oppfordre til å dele og invitere
    if (entries.length === 0) {
      return (
        <View style={{ gap: spacing.md }}>
          <Card padded={false}>
            <EmptyState
              icon="podium-outline"
              title={t('compete.boardEmptyTitle')}
              message={t('compete.boardEmptyBody')}
            />
          </Card>
          {renderAddFriendsCard()}
        </View>
      );
    }

    return (
      <View style={{ gap: spacing.md }}>
        <Card padded={false} style={{ paddingVertical: spacing.xs }}>
          {entries.map(renderRow)}
        </Card>
        {/* Kun meg selv på lista: oppfordring til å legge til venner */}
        {entries.length <= 1 ? renderAddFriendsCard() : null}
      </View>
    );
  };

  return (
    <Screen scroll>
      <ScreenHeader title={t('compete.leaderboardsTitle')} />

      <Animated.View entering={FadeInDown.duration(300)} style={{ gap: spacing.md }}>
        <SegmentedControl
          options={[
            { label: t('compete.modeStrength'), value: 'styrke' },
            { label: t('compete.modeRunning'), value: 'løping' },
          ]}
          value={boardMode}
          onChange={(v) => setBoardMode(v as BoardMode)}
        />

        {boardMode === 'styrke' ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
            >
              {liftChips.map((chip) => (
                <Chip
                  key={chip.id}
                  label={chip.label}
                  selected={chip.id === exerciseId}
                  onPress={() => setExerciseId(chip.id)}
                />
              ))}
              <Chip
                label={t('compete.moreExercises')}
                icon="search"
                onPress={() => setPickerVisible(true)}
              />
            </ScrollView>
            <SegmentedControl
              options={STRENGTH_SCHEMES.map((s) => ({
                label: t(SCHEME_LABEL_KEY[s.key]),
                value: s.key,
              }))}
              value={schemeKey}
              onChange={(v) => setSchemeKey(v as StrengthSchemeKey)}
            />
          </>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
          >
            {runDistanceChips.map((d) => (
              <Chip
                key={d}
                label={distanceLabel(d, lang)}
                selected={d === distanceM}
                onPress={() => setDistanceM(d)}
              />
            ))}
          </ScrollView>
        )}

        {renderBoard()}
      </Animated.View>

      {/* Øvelsesvelgeren viser alle øvelser — den støtter ikke kategorifilter */}
      <ExercisePickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handlePickExercise}
      />
    </Screen>
  );
}
