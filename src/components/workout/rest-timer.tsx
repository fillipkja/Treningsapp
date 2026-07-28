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
import { AppText, ProgressBar } from '@/components/ui';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/** Forhåndsvalg for hvile i sekunder */
const PRESETS = [60, 90, 120, 180] as const;
const DEFAULT_SECONDS = 90;

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
  const [running, setRunning] = useState(false);
  const [duration, setDuration] = useState(DEFAULT_SECONDS);
  const [remaining, setRemaining] = useState(DEFAULT_SECONDS);
  const endsAtRef = useRef(0);
  const lastDurationRef = useRef(DEFAULT_SECONDS);

  const start = useCallback((seconds?: number) => {
    const secs = seconds ?? lastDurationRef.current;
    lastDurationRef.current = secs;
    endsAtRef.current = Date.now() + secs * 1000;
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
        setRunning(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [running]);

  const cancel = () => {
    setRunning(false);
    Haptics.selectionAsync();
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
                  borderColor: secs === lastDurationRef.current ? colors.accent : colors.border,
                  backgroundColor:
                    secs === lastDurationRef.current ? colors.accentMuted : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <AppText
                  variant="caption"
                  style={{
                    fontWeight: '600',
                    color:
                      secs === lastDurationRef.current ? colors.accent : colors.textPrimary,
                  }}
                >
                  {t('workout.restSeconds', { seconds: secs })}
                </AppText>
              </Pressable>
            ))}
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
          onPress={() => setExpanded(true)}
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
