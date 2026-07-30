import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Input, ProgressBar } from '@/components/ui';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/** Forhåndsvalg for hvile i sekunder */
const PRESETS = [60, 90, 120, 180] as const;
const DEFAULT_SECONDS = 90;
const MAX_SECONDS = 3600;

/** Modulnivå så en løpende timer overlever at øktskjermen minimeres/remountes */
let persistedTimer: { endsAt: number; duration: number } | null = null;
let lastChosenSeconds: number = DEFAULT_SECONDS;

/** Glem en løpende timer — kalles når økten fullføres eller forkastes, så den
 *  ikke fortsetter inn i neste økt */
export function clearRestTimer(): void {
  persistedTimer = null;
}

/** Løpende timer eller null — utløpte (f.eks. mens skjermen var minimert) ryddes bort */
function activePersistedTimer(): { endsAt: number; duration: number } | null {
  if (persistedTimer && persistedTimer.endsAt <= Date.now()) persistedTimer = null;
  return persistedTimer;
}

export interface RestTimerHandle {
  /** Start nedtelling — kalles f.eks. automatisk når et sett fullføres */
  start: (seconds?: number) => void;
}

interface RestTimerProps {
  /** Om timeren skal starte automatisk ved fullført sett (vises som toggle) */
  autoStart: boolean;
  onToggleAutoStart: () => void;
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Flytende hviletimer nederst på aktiv økt-skjermen */
export const RestTimer = forwardRef<RestTimerHandle, RestTimerProps>(function RestTimer(
  { autoStart, onToggleAutoStart },
  ref,
) {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();

  const [expanded, setExpanded] = useState(false);
  // Gjenoppta en timer som fortsatt løper fra før skjermen ble minimert
  const [running, setRunning] = useState(() => activePersistedTimer() !== null);
  const [duration, setDuration] = useState(
    () => activePersistedTimer()?.duration ?? DEFAULT_SECONDS,
  );
  const [remaining, setRemaining] = useState(() => {
    const timer = activePersistedTimer();
    return timer ? Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000)) : DEFAULT_SECONDS;
  });
  const endsAtRef = useRef(activePersistedTimer()?.endsAt ?? 0);
  const customMinDraft = useRef('');
  const customSecDraft = useRef('');

  // Feltene er ukontrollerte og remountes tomme — nullstill drafts ved åpning
  // så Start ikke bruker gamle, usynlige verdier
  const openPanel = () => {
    customMinDraft.current = '';
    customSecDraft.current = '';
    setExpanded(true);
  };

  const start = useCallback((seconds?: number) => {
    const secs = seconds ?? lastChosenSeconds;
    lastChosenSeconds = secs;
    endsAtRef.current = Date.now() + secs * 1000;
    persistedTimer = { endsAt: endsAtRef.current, duration: secs };
    setDuration(secs);
    setRemaining(secs);
    setRunning(true);
    setExpanded(false);
  }, []);

  useImperativeHandle(ref, () => ({ start }), [start]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        persistedTimer = null;
        setRunning(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [running]);

  const cancel = () => {
    persistedTimer = null;
    setRunning(false);
    Haptics.selectionAsync();
  };

  const startCustom = () => {
    const min = parseInt(customMinDraft.current, 10) || 0;
    const sec = parseInt(customSecDraft.current, 10) || 0;
    const secs = Math.min(MAX_SECONDS, min * 60 + sec);
    if (secs <= 0) return;
    Haptics.selectionAsync();
    start(secs);
  };

  const cardStyle = {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  } as const;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: insets.bottom + spacing.lg,
        alignItems: 'center',
      }}
    >
      {running ? (
        <Animated.View entering={FadeInDown.duration(200)} style={[cardStyle, { minWidth: 240, gap: spacing.sm }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Ionicons
              name="timer-outline"
              size={18}
              color={remaining < 10 ? colors.accentWarm : colors.accent}
            />
            <AppText variant="subheading" style={{ flex: 1, fontVariant: ['tabular-nums'] }}>
              {formatClock(remaining)}
            </AppText>
            <AppText variant="caption" color="muted">
              {t('workout.restDuration', { seconds: duration })}
            </AppText>
            <Pressable hitSlop={8} onPress={cancel}>
              <Ionicons name="close-circle" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <ProgressBar
            progress={duration > 0 ? remaining / duration : 0}
            height={5}
            color={remaining < 10 ? colors.accentWarm : colors.accent}
          />
        </Animated.View>
      ) : expanded ? (
        <Animated.View entering={FadeInDown.duration(200)} style={[cardStyle, { gap: spacing.md }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <AppText variant="label" color="muted" style={{ flex: 1 }}>
              {t('workout.restTimerTitle')}
            </AppText>
            <Pressable hitSlop={8} onPress={() => setExpanded(false)}>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {PRESETS.map((secs) => (
              <Pressable
                key={secs}
                onPress={() => {
                  Haptics.selectionAsync();
                  start(secs);
                }}
                style={({ pressed }) => ({
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.full,
                  borderWidth: 1,
                  borderColor: secs === lastChosenSeconds ? colors.accent : colors.border,
                  backgroundColor:
                    secs === lastChosenSeconds ? colors.accentMuted : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <AppText
                  variant="caption"
                  style={{
                    fontWeight: '600',
                    color: secs === lastChosenSeconds ? colors.accent : colors.textPrimary,
                  }}
                >
                  {t('workout.restSeconds', { seconds: secs })}
                </AppText>
              </Pressable>
            ))}
          </View>
          {/* Egendefinert lengde: minutter og sekunder */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <AppText variant="caption" color="secondary" style={{ flex: 1 }}>
              {t('workout.restCustomLabel')}
            </AppText>
            <Input
              defaultValue=""
              onChangeText={(text) => {
                customMinDraft.current = text;
              }}
              keyboardType="number-pad"
              placeholder={t('workout.restMinPlaceholder')}
              maxLength={2}
              style={{ width: 56, paddingVertical: 6, textAlign: 'center', fontSize: 14 }}
            />
            <AppText variant="caption" color="muted">
              :
            </AppText>
            <Input
              defaultValue=""
              onChangeText={(text) => {
                customSecDraft.current = text;
              }}
              keyboardType="number-pad"
              placeholder={t('workout.restSecPlaceholder')}
              maxLength={2}
              style={{ width: 56, paddingVertical: 6, textAlign: 'center', fontSize: 14 }}
            />
            <Button title={t('workout.restStart')} size="sm" variant="secondary" onPress={startCustom} />
          </View>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onToggleAutoStart();
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          >
            <Ionicons
              name={autoStart ? 'checkbox' : 'square-outline'}
              size={18}
              color={autoStart ? colors.accent : colors.textMuted}
            />
            <AppText variant="caption" color="secondary">
              {t('workout.restAutoStart')}
            </AppText>
          </Pressable>
        </Animated.View>
      ) : (
        <Pressable
          onPress={openPanel}
          style={({ pressed }) => [
            cardStyle,
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Ionicons name="timer-outline" size={16} color={colors.accent} />
          <AppText variant="caption" style={{ fontWeight: '600' }}>
            {t('workout.restLabel')}
          </AppText>
        </Pressable>
      )}
    </View>
  );
});
