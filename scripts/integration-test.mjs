#!/usr/bin/env node
// Integrasjonstester for LØFT sin Supabase-backend (supabase/migrations/).
// Kjøres med: node scripts/integration-test.mjs
// Krever env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//
// service_role-nøkkelen omgår ALL row-level security: sett den inline i skallet
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/integration-test.mjs
// eller i en fil UTENFOR repoet. Legg den aldri i en committet .env.

import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Mangler konfigurasjon. Sett env-variablene SUPABASE_URL, SUPABASE_ANON_KEY og SUPABASE_SERVICE_ROLE_KEY.'
  );
  process.exit(1);
}

const CLIENT_OPTS = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLIENT_OPTS);

// ---------------------------------------------------------------- testhjelpere
let passCount = 0;
let failCount = 0;
const failures = [];

async function test(nr, name, fn) {
  const label = `Test ${String(nr).padStart(2, ' ')}: ${name}`;
  try {
    await fn();
    passCount += 1;
    console.log(`  PASS  ${label}`);
  } catch (err) {
    failCount += 1;
    const msg = err instanceof Error ? err.message : String(err);
    failures.push({ label, msg });
    console.error(`  FAIL  ${label}`);
    console.error(`        -> ${msg}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function assertNoError(error, ctx) {
  if (error) throw new Error(`${ctx}: uventet feil: ${error.message ?? JSON.stringify(error)}`);
}

function assertError(error, ctx) {
  if (!error) throw new Error(`${ctx}: forventet feil (RLS), men operasjonen lyktes`);
}

// ---------------------------------------------------------------- testbrukere
const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const password = `Loft-test-${suffix}-1!`;

const userA = { email: `test-a-${suffix}@loft-test.local`, username: `test.a.${suffix}`.slice(0, 24) };
const userB = { email: `test-b-${suffix}@loft-test.local`, username: `test.b.${suffix}`.slice(0, 24) };
const userC = { email: `test-c-${suffix}@loft-test.local`, username: `test.c.${suffix}`.slice(0, 24) };
const allUsers = [userA, userB, userC];

async function createTestUser(user) {
  const { data, error } = await admin.auth.admin.createUser({
    email: user.email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`Kunne ikke opprette testbruker ${user.email}: ${error.message}`);
  user.id = data.user.id;
}

async function signIn(user) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, CLIENT_OPTS);
  const { error } = await client.auth.signInWithPassword({ email: user.email, password });
  if (error) throw new Error(`Kunne ikke logge inn ${user.email}: ${error.message}`);
  user.client = client;
}

// ---------------------------------------------------------------- delt tilstand
let sharedWorkoutId = null;
let privateWorkoutId = null;
let challengeId = null;
let sharedRecordId = null;
let privateRecordId = null;
let sharedRunId = null;
let privateRunId = null;
let strengthSharedWorkoutId = null;
let strengthPrivateWorkoutId = null;
let leaderboardRecordId = null;
let hiddenLeaderboardRecordId = null;

// ---------------------------------------------------------------- hovedløp
async function main() {
  console.log('LØFT integrasjonstester');
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Suffiks:  ${suffix}\n`);

  console.log('Oppsett: oppretter testbrukere A, B og C ...');
  await createTestUser(userA);
  await createTestUser(userB);
  await createTestUser(userC);
  await signIn(userA);
  await signIn(userB);
  await signIn(userC);
  console.log('Oppsett ferdig.\n');

  const a = userA.client;
  const b = userB.client;
  const c = userC.client;

  // ------------------------------------------------------------ 1. profiler
  await test(1, 'Profiler: egne kan opprettes, andres id avvises av RLS', async () => {
    const insA = await a.from('profiles').insert({
      id: userA.id,
      username: userA.username,
      display_name: 'Test A',
    });
    assertNoError(insA.error, 'A oppretter egen profil');

    const insB = await b.from('profiles').insert({
      id: userB.id,
      username: userB.username,
      display_name: 'Test B',
    });
    assertNoError(insB.error, 'B oppretter egen profil');

    const spoof = await a.from('profiles').insert({
      id: userB.id,
      username: `spoof.${suffix}`.slice(0, 24),
    });
    assertError(spoof.error, 'A oppretter profil med B sin id');
  });

  // ------------------------------------------------------------ 2. brukernavnsøk
  await test(2, 'Brukernavnsøk: find_profile_by_username er case-insensitivt', async () => {
    const { data, error } = await a.rpc('find_profile_by_username', {
      q: userB.username.toUpperCase(),
    });
    assertNoError(error, 'A søker etter B');
    assert(Array.isArray(data) && data.length === 1, `forventet 1 treff, fikk ${data?.length ?? 0}`);
    assert(data[0].id === userB.id, 'treffet var ikke B sin profil');
  });

  // ------------------------------------------------------------ 3. økter
  await test(3, 'Økter: A oppretter delt + udelt; B (ikke venn) ser ingen', async () => {
    const shared = await a
      .from('workouts')
      .insert({
        user_id: userA.id,
        name: 'Delt testøkt',
        is_shared: true,
        duration_min: 45,
        // Oppdiktede aggregater: serveren skal regne dem ut på nytt
        total_volume_kg: 99999999,
        total_sets: 400,
        pr_count: 40,
        exercises: [
          {
            id: 'we1',
            exerciseId: 'benkpress',
            sets: [{ id: 's1', reps: 10, weightKg: 100, completed: true }],
          },
        ],
      })
      .select('id, total_volume_kg, total_sets, pr_count')
      .single();
    assertNoError(shared.error, 'A oppretter delt økt');
    sharedWorkoutId = shared.data.id;
    assert(
      Number(shared.data.total_volume_kg) === 1000,
      `total_volume_kg skulle vært serverberegnet 1000, var ${shared.data.total_volume_kg}`
    );
    assert(shared.data.total_sets === 1, `total_sets skulle vært 1, var ${shared.data.total_sets}`);
    assert(shared.data.pr_count === 0, `pr_count skulle vært 0, var ${shared.data.pr_count}`);

    const priv = await a
      .from('workouts')
      .insert({
        user_id: userA.id,
        name: 'Privat testøkt',
        is_shared: false,
        exercises: [
          {
            id: 'we2',
            exerciseId: 'knebøy',
            sets: [{ id: 's2', reps: 5, weightKg: 120, completed: true }],
          },
        ],
      })
      .select('id, total_volume_kg')
      .single();
    assertNoError(priv.error, 'A oppretter udelt økt');
    privateWorkoutId = priv.data.id;
    assert(
      Number(priv.data.total_volume_kg) === 600,
      `udelt økt: total_volume_kg skulle vært 600, var ${priv.data.total_volume_kg}`
    );

    // Også ved UPDATE overstyres aggregatene av serveren
    const tampered = await a
      .from('workouts')
      .update({ total_volume_kg: 88888888, pr_count: 49 })
      .eq('id', sharedWorkoutId)
      .select('total_volume_kg, pr_count')
      .single();
    assertNoError(tampered.error, 'A oppdaterer egen økt');
    assert(
      Number(tampered.data.total_volume_kg) === 1000 && tampered.data.pr_count === 0,
      'aggregatene lot seg overstyre via update'
    );

    const badShape = await a.from('workouts').insert({
      user_id: userA.id,
      name: 'Ugyldig form',
      exercises: { a: 1 },
    });
    assertError(badShape.error, 'A lagrer exercises som objekt i stedet for array');

    const asB = await b.from('workouts').select('id').eq('user_id', userA.id);
    assertNoError(asB.error, 'B leser A sine økter');
    assert(asB.data.length === 0, `B skulle sett 0 økter (ikke venner), så ${asB.data.length}`);
  });

  // ------------------------------------------------------------ 4. vennskap
  await test(4, 'Vennskap: B sender forespørsel, kan ikke selv akseptere; A aksepterer', async () => {
    const req = await b.from('friendships').insert({
      requester_id: userB.id,
      addressee_id: userA.id,
    });
    assertNoError(req.error, 'B sender venneforespørsel');

    const selfAccept = await b
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('requester_id', userB.id)
      .eq('addressee_id', userA.id)
      .select();
    assert(
      selfAccept.error || selfAccept.data.length === 0,
      'B (avsender) kunne selv akseptere forespørselen — RLS-brudd'
    );

    const accept = await a
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('requester_id', userB.id)
      .eq('addressee_id', userA.id)
      .select();
    assertNoError(accept.error, 'A aksepterer forespørselen');
    assert(accept.data.length === 1, `A sin aksept traff ${accept.data.length} rader, forventet 1`);

    const { data: friends, error } = await a.rpc('are_friends', { a: userA.id, b: userB.id });
    assertNoError(error, 'are_friends');
    assert(friends === true, 'are_friends skulle vært true etter aksept');
  });

  // ------------------------------------------------------------ 5. synlighet etter vennskap
  await test(5, 'Synlighet: B ser A sin delte økt, men ikke den udelte', async () => {
    assert(sharedWorkoutId && privateWorkoutId, 'mangler økt-id-er fra test 3');
    const { data, error } = await b.from('workouts').select('id, is_shared').eq('user_id', userA.id);
    assertNoError(error, 'B leser A sine økter');
    assert(data.length === 1, `B skulle sett nøyaktig 1 økt, så ${data.length}`);
    assert(data[0].id === sharedWorkoutId, 'økten B ser er ikke den delte');
  });

  // ------------------------------------------------------------ 6. vennskapsvarsler
  await test(6, 'Varsler: A fikk venneforespørsel-varsel, B fikk venn_akseptert-varsel', async () => {
    const toA = await a
      .from('notifications')
      .select('id, ref_id')
      .eq('user_id', userA.id)
      .eq('type', 'venneforespørsel');
    assertNoError(toA.error, 'A leser varsler');
    assert(toA.data.length >= 1, 'A mangler venneforespørsel-varsel');
    assert(toA.data.some((n) => n.ref_id === userB.id), 'venneforespørsel-varselet peker ikke på B');

    const toB = await b
      .from('notifications')
      .select('id, ref_id')
      .eq('user_id', userB.id)
      .eq('type', 'venn_akseptert');
    assertNoError(toB.error, 'B leser varsler');
    assert(toB.data.length >= 1, 'B mangler venn_akseptert-varsel');
  });

  // ------------------------------------------------------------ 7. likes
  await test(7, 'Likes: B liker delt økt (varsel til A); udelt økt avvises', async () => {
    assert(sharedWorkoutId && privateWorkoutId, 'mangler økt-id-er fra test 3');

    const like = await b.from('workout_likes').insert({
      workout_id: sharedWorkoutId,
      user_id: userB.id,
    });
    assertNoError(like.error, 'B liker den delte økten');

    const rows = await b.from('workout_likes').select('user_id').eq('workout_id', sharedWorkoutId);
    assertNoError(rows.error, 'B leser likes');
    assert(rows.data.some((r) => r.user_id === userB.id), 'like-raden finnes ikke');

    const notif = await a
      .from('notifications')
      .select('id, ref_id')
      .eq('user_id', userA.id)
      .eq('type', 'like');
    assertNoError(notif.error, 'A leser like-varsler');
    assert(
      notif.data.some((n) => n.ref_id === String(sharedWorkoutId)),
      'A mangler like-varsel for den delte økten'
    );

    // Like -> unlike -> like skal IKKE gi et nytt ulest varsel (dedup-indeks)
    const unlike = await b
      .from('workout_likes')
      .delete()
      .eq('workout_id', sharedWorkoutId)
      .eq('user_id', userB.id);
    assertNoError(unlike.error, 'B fjerner sin like');
    const relike = await b.from('workout_likes').insert({
      workout_id: sharedWorkoutId,
      user_id: userB.id,
    });
    assertNoError(relike.error, 'B liker på nytt');
    const after = await a
      .from('notifications')
      .select('id')
      .eq('user_id', userA.id)
      .eq('type', 'like')
      .eq('ref_id', String(sharedWorkoutId));
    assertNoError(after.error, 'A leser like-varsler etter ny like');
    assert(
      after.data.length === 1,
      `like-varsler skulle vært 1 etter like/unlike/like, var ${after.data.length}`
    );

    const illegal = await b.from('workout_likes').insert({
      workout_id: privateWorkoutId,
      user_id: userB.id,
    });
    assertError(illegal.error, 'B liker den udelte økten');
  });

  // ------------------------------------------------------------ 8. kommentarer
  await test(8, 'Kommentarer: B kommenterer delt økt (varsel til A), synlig for begge', async () => {
    assert(sharedWorkoutId, 'mangler økt-id fra test 3');

    const comment = await b.from('workout_comments').insert({
      workout_id: sharedWorkoutId,
      user_id: userB.id,
      text: 'Sterkt levert!',
    });
    assertNoError(comment.error, 'B kommenterer den delte økten');

    const notif = await a
      .from('notifications')
      .select('id, ref_id')
      .eq('user_id', userA.id)
      .eq('type', 'kommentar');
    assertNoError(notif.error, 'A leser kommentar-varsler');
    assert(
      notif.data.some((n) => n.ref_id === String(sharedWorkoutId)),
      'A mangler kommentar-varsel for den delte økten'
    );

    const seenByA = await a.from('workout_comments').select('id').eq('workout_id', sharedWorkoutId);
    assertNoError(seenByA.error, 'A leser kommentarer');
    assert(seenByA.data.length >= 1, 'A ser ikke kommentaren');

    const seenByB = await b.from('workout_comments').select('id').eq('workout_id', sharedWorkoutId);
    assertNoError(seenByB.error, 'B leser kommentarer');
    assert(seenByB.data.length >= 1, 'B ser ikke kommentaren');
  });

  // ------------------------------------------------------------ 9. varsler kan ikke lages av klienter
  await test(9, 'Varsler: klienter kan ikke insert-e i notifications direkte', async () => {
    const asA = await a.from('notifications').insert({
      user_id: userA.id,
      type: 'like',
      title: 'Forfalsket',
      body: 'skal avvises',
    });
    assertError(asA.error, 'A insert-er varsel direkte');

    const asB = await b.from('notifications').insert({
      user_id: userA.id,
      type: 'like',
      title: 'Forfalsket',
      body: 'skal avvises',
    });
    assertError(asB.error, 'B insert-er varsel direkte');
  });

  // ------------------------------------------------------------ 10. friend_leaderboard
  await test(10, 'friend_leaderboard: kun A sin DELTE økt teller for B', async () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const { data, error } = await b.rpc('friend_leaderboard', {
      period_start: new Date(Date.now() - dayMs).toISOString(),
      period_end: new Date(Date.now() + dayMs).toISOString(),
    });
    assertNoError(error, 'B kaller friend_leaderboard');
    assert(data.length === 2, `forventet 2 rader, fikk ${data.length}`);
    const rowA = data.find((r) => r.user_id === userA.id);
    assert(rowA, 'A mangler i leaderboardet');
    assert(Number(rowA.workout_count) === 1, `A sin workout_count var ${rowA.workout_count}, forventet 1`);
    assert(
      Number(rowA.volume_kg) === 1000,
      `A sitt volum var ${rowA.volume_kg} — den udelte økten (600 kg) lekker til B`
    );

    // A ser selv sine egne udelte økter i rangeringen
    const own = await a.rpc('friend_leaderboard', {
      period_start: new Date(Date.now() - dayMs).toISOString(),
      period_end: new Date(Date.now() + dayMs).toISOString(),
    });
    assertNoError(own.error, 'A kaller friend_leaderboard');
    const ownRow = own.data.find((r) => r.user_id === userA.id);
    assert(
      Number(ownRow.volume_kg) === 1600,
      `A sitt eget volum var ${ownRow.volume_kg}, forventet 1600 (begge økter)`
    );
  });

  // ------------------------------------------------------------ 11. utfordringer
  await test(11, 'Utfordringer: A oppretter + inviterer B; C er utestengt', async () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const created = await a
      .from('challenges')
      .insert({
        creator_id: userA.id,
        name: 'Testutfordring',
        type: 'økter',
        target: 10,
        start_date: new Date(Date.now() - dayMs).toISOString(),
        end_date: new Date(Date.now() + 7 * dayMs).toISOString(),
      })
      .select('id')
      .single();
    assertNoError(created.error, 'A oppretter utfordring');
    challengeId = created.data.id;

    const addSelf = await a
      .from('challenge_participants')
      .insert({ challenge_id: challengeId, user_id: userA.id });
    assertNoError(addSelf.error, 'A melder seg selv inn');

    const addB = await a
      .from('challenge_participants')
      .insert({ challenge_id: challengeId, user_id: userB.id });
    assertNoError(addB.error, 'A legger til B som deltaker');

    const notif = await b
      .from('notifications')
      .select('id, ref_id')
      .eq('user_id', userB.id)
      .eq('type', 'utfordring');
    assertNoError(notif.error, 'B leser utfordrings-varsler');
    assert(
      notif.data.some((n) => n.ref_id === String(challengeId)),
      'B mangler utfordring-varsel'
    );

    const standings = await b.rpc('challenge_standings', { c_id: challengeId });
    assertNoError(standings.error, 'B kaller challenge_standings');
    assert(standings.data.length === 2, `forventet 2 rader i stillingen, fikk ${standings.data.length}`);
    const standingA = standings.data.find((r) => r.user_id === userA.id);
    assert(
      Number(standingA.volume_kg) === 1000,
      `A sitt volum i stillingen var ${standingA.volume_kg} — udelte økter lekker til meddeltakere`
    );

    // C er ikke deltaker: opprett profil, forvent avvisning
    const profC = await c.from('profiles').insert({
      id: userC.id,
      username: userC.username,
      display_name: 'Test C',
    });
    assertNoError(profC.error, 'C oppretter egen profil');

    const standingsC = await c.rpc('challenge_standings', { c_id: challengeId });
    assertError(standingsC.error, 'C (ikke deltaker) kaller challenge_standings');

    const seenByC = await c.from('challenges').select('id').eq('id', challengeId);
    assertNoError(seenByC.error, 'C leser challenges');
    assert(seenByC.data.length === 0, 'C skulle ikke sett utfordringen');
  });

  // ------------------------------------------------------------ 12. PR-tabellen
  await test(12, 'PRs: A upsert-er PR; B kan ikke lese den', async () => {
    const upsert = await a.from('prs').upsert({
      user_id: userA.id,
      exercise_id: 'benkpress',
      best_weight_kg: 100,
      best_reps: 10,
      best_set_volume_kg: 1000,
    });
    assertNoError(upsert.error, 'A upsert-er PR');

    const asB = await b.from('prs').select('exercise_id').eq('user_id', userA.id);
    assertNoError(asB.error, 'B leser A sine PR-er');
    assert(asB.data.length === 0, `B skulle sett 0 PR-rader, så ${asB.data.length}`);
  });

  // ------------------------------------------------------------ 13. are_friends er privat
  await test(13, 'are_friends: C kan ikke spørre om A og B sitt vennskap', async () => {
    const asC = await c.rpc('are_friends', { a: userA.id, b: userB.id });
    assertNoError(asC.error, 'C kaller are_friends om A og B');
    assert(
      asC.data === false,
      'are_friends svarte C om et vennskap C ikke er part i — sosial graf lekker'
    );

    // Kontroll: partene selv får fortsatt riktig svar
    const asB = await b.rpc('are_friends', { a: userA.id, b: userB.id });
    assertNoError(asB.error, 'B kaller are_friends om seg selv og A');
    assert(asB.data === true, 'are_friends skulle vært true for partene selv');
  });

  // ------------------------------------------------------------ 14. delte rekorder
  await test(14, 'Rekorder: B (venn) ser A sin delte rekord via shared_records_for', async () => {
    const shared = await a
      .from('manual_records')
      .insert({
        user_id: userA.id,
        exercise_id: 'benkpress',
        weight_kg: 110,
        reps: 1,
        is_shared: true,
        location: 'Testgymmet',
        bodyweight_kg: 82.5,
        notes: 'privat notat',
      })
      .select('id')
      .single();
    assertNoError(shared.error, 'A oppretter delt rekord');
    sharedRecordId = shared.data.id;

    const priv = await a
      .from('manual_records')
      .insert({
        user_id: userA.id,
        exercise_id: 'knebøy',
        weight_kg: 150,
        reps: 1,
        is_shared: false,
      })
      .select('id')
      .single();
    assertNoError(priv.error, 'A oppretter udelt rekord');
    privateRecordId = priv.data.id;

    const { data, error } = await b.rpc('shared_records_for', { owner: userA.id });
    assertNoError(error, 'B kaller shared_records_for');
    assert(data.length === 1, `B skulle sett nøyaktig 1 rekord, så ${data.length}`);
    assert(data[0].id === sharedRecordId, 'rekorden B ser er ikke den delte');
    assert(Number(data[0].weight_kg) === 110, `weight_kg var ${data[0].weight_kg}, forventet 110`);
    // Sted, kroppsvekt og notater er helse-/persondata og skal ikke være med
    assert(
      !('location' in data[0]) && !('bodyweight_kg' in data[0]) && !('notes' in data[0]),
      'shared_records_for returnerer private kolonner'
    );
  });

  // ------------------------------------------------------------ 15. udelte rekorder deles ikke
  await test(15, 'Rekorder: is_shared=false holdes utenfor shared_records_for', async () => {
    assert(privateRecordId, 'mangler rekord-id fra test 14');
    const { data, error } = await b.rpc('shared_records_for', { owner: userA.id });
    assertNoError(error, 'B kaller shared_records_for');
    assert(
      !data.some((r) => r.id === privateRecordId),
      'den udelte rekorden lekker til venner'
    );
  });

  // ------------------------------------------------------------ 16. rekorder er venne-avgrenset
  await test(16, 'Rekorder: C (ikke venn) får 0 rader; direkte select stoppes av RLS', async () => {
    const asC = await c.rpc('shared_records_for', { owner: userA.id });
    assertNoError(asC.error, 'C kaller shared_records_for om A');
    assert(asC.data.length === 0, `C skulle sett 0 rekorder (ikke venn), så ${asC.data.length}`);

    const direct = await b.from('manual_records').select('id').eq('user_id', userA.id);
    assertNoError(direct.error, 'B leser manual_records direkte');
    assert(
      direct.data.length === 0,
      `direkte select skulle gitt 0 rader (RLS), så ${direct.data.length}`
    );

    // Rydd opp: A sletter testrekordene sine
    const del = await a.from('manual_records').delete().eq('user_id', userA.id).select('id');
    assertNoError(del.error, 'A sletter testrekordene');
    assert(del.data.length === 2, `oppryddingen traff ${del.data.length} rader, forventet 2`);
  });

  // ------------------------------------------------------------ 17. løperekorder
  await test(17, 'Løp: B (venn) ser kun A sitt delte løp; direkte select stoppes av RLS', async () => {
    const shared = await a
      .from('run_records')
      .insert({
        user_id: userA.id,
        distance_m: 5000,
        duration_sec: 1351,
        is_shared: true,
        location: 'Testparken',
        notes: 'privat notat',
      })
      .select('id')
      .single();
    assertNoError(shared.error, 'A registrerer delt løp');
    sharedRunId = shared.data.id;

    const hidden = await a
      .from('run_records')
      .insert({
        user_id: userA.id,
        distance_m: 5000,
        duration_sec: 1290,
        is_shared: false,
      })
      .select('id')
      .single();
    assertNoError(hidden.error, 'A registrerer skjult løp');
    privateRunId = hidden.data.id;

    const direct = await b.from('run_records').select('id').eq('user_id', userA.id);
    assertNoError(direct.error, 'B leser run_records direkte');
    assert(
      direct.data.length === 0,
      `direkte select skulle gitt 0 rader (RLS), så ${direct.data.length}`
    );

    const { data, error } = await b.rpc('shared_runs_for', { owner: userA.id });
    assertNoError(error, 'B kaller shared_runs_for');
    assert(data.length === 1, `B skulle sett nøyaktig 1 løp, så ${data.length}`);
    assert(data[0].id === sharedRunId, 'løpet B ser er ikke det delte');
    assert(
      !data.some((r) => r.id === privateRunId),
      'det skjulte løpet lekker til venner'
    );
    // Sted og notater er persondata og skal ikke være med
    assert(
      !('location' in data[0]) && !('notes' in data[0]),
      'shared_runs_for returnerer private kolonner'
    );
  });

  // ------------------------------------------------------------ 18. styrke-ledertavle
  await test(18, 'strength_leaderboard: manuell rekord vinner; udelt løft lekker ikke', async () => {
    const fiveByFive = Array.from({ length: 5 }, (_, i) => ({
      id: `s5x5-${i}`,
      reps: 5,
      weightKg: 100,
      completed: true,
    }));
    const shared = await a
      .from('workouts')
      .insert({
        user_id: userA.id,
        name: 'Ledertavle delt',
        is_shared: true,
        exercises: [
          {
            id: 'we-lt1',
            exerciseId: 'benkpress',
            sets: [{ id: 's-lt1', reps: 1, weightKg: 140, completed: true }, ...fiveByFive],
          },
        ],
      })
      .select('id')
      .single();
    assertNoError(shared.error, 'A oppretter delt ledertavle-økt');
    strengthSharedWorkoutId = shared.data.id;

    const hidden = await a
      .from('workouts')
      .insert({
        user_id: userA.id,
        name: 'Ledertavle udelt',
        is_shared: false,
        exercises: [
          {
            id: 'we-lt2',
            exerciseId: 'benkpress',
            sets: [{ id: 's-lt2', reps: 1, weightKg: 180, completed: true }],
          },
        ],
      })
      .select('id')
      .single();
    assertNoError(hidden.error, 'A oppretter udelt ledertavle-økt');
    strengthPrivateWorkoutId = hidden.data.id;

    // Rekordene fra test 14–16 er ryddet bort: legg inn en ny delt rekord
    const record = await a
      .from('manual_records')
      .insert({
        user_id: userA.id,
        exercise_id: 'benkpress',
        weight_kg: 150,
        reps: 1,
        is_shared: true,
      })
      .select('id')
      .single();
    assertNoError(record.error, 'A oppretter delt ledertavle-rekord');
    leaderboardRecordId = record.data.id;

    // ... og en SKJULT rekord som er tyngre — den skal aldri nå B
    const hiddenRecord = await a
      .from('manual_records')
      .insert({
        user_id: userA.id,
        exercise_id: 'benkpress',
        weight_kg: 200,
        reps: 1,
        is_shared: false,
      })
      .select('id')
      .single();
    assertNoError(hiddenRecord.error, 'A oppretter skjult ledertavle-rekord');
    hiddenLeaderboardRecordId = hiddenRecord.data.id;

    // 1x1: den delte rekorden (150) vinner over økt-settet (140); udelt økt (180)
    // og skjult rekord (200) er usynlige for B
    const single = await b.rpc('strength_leaderboard', {
      ex_id: 'benkpress',
      min_reps: 1,
      min_sets: 1,
    });
    assertNoError(single.error, 'B kaller strength_leaderboard (1x1)');
    const singleA = single.data.find((r) => r.user_id === userA.id);
    assert(singleA, 'A mangler i styrke-ledertavlen');
    assert(
      Number(singleA.best_weight_kg) === 150,
      `A sin beste vekt (1x1) var ${singleA.best_weight_kg}, forventet 150 — lekker den udelte økten (180) eller den skjulte rekorden (200)?`
    );

    // A ser sin egen skjulte rekord i egen tavle
    const ownSingle = await a.rpc('strength_leaderboard', {
      ex_id: 'benkpress',
      min_reps: 1,
      min_sets: 1,
    });
    assertNoError(ownSingle.error, 'A kaller strength_leaderboard (1x1)');
    const ownSingleA = ownSingle.data.find((r) => r.user_id === userA.id);
    assert(
      ownSingleA && Number(ownSingleA.best_weight_kg) === 200,
      `A sin egen beste vekt var ${ownSingleA?.best_weight_kg}, forventet 200 (egen skjult rekord)`
    );

    // 5x5: fem sett på 100 i samme økt kvalifiserer; rekorden (enkeltsett) teller ikke
    const fives = await b.rpc('strength_leaderboard', {
      ex_id: 'benkpress',
      min_reps: 5,
      min_sets: 5,
    });
    assertNoError(fives.error, 'B kaller strength_leaderboard (5x5)');
    const fivesA = fives.data.find((r) => r.user_id === userA.id);
    assert(fivesA, 'A mangler i 5x5-tavlen');
    assert(
      Number(fivesA.best_weight_kg) === 100,
      `A sin beste 5x5-vekt var ${fivesA.best_weight_kg}, forventet 100`
    );
  });

  // ------------------------------------------------------------ 19. manuell 5x5 og udatert rekord
  await test(19, 'strength_leaderboard: manuell 5x5-rekord teller; udatert rekord deles', async () => {
    // Udatert 5x5-rekord — dato er valgfri (0006), sett-antallet må dekke tavlekravet
    const rec = await a
      .from('manual_records')
      .insert({
        user_id: userA.id,
        exercise_id: 'benkpress',
        weight_kg: 110,
        reps: 5,
        sets: 5,
        date: null,
        is_shared: true,
      })
      .select('id, sets, date')
      .single();
    assertNoError(rec.error, 'A oppretter udatert 5x5-rekord');
    assert(rec.data.sets === 5, `sets ble ${rec.data.sets}, forventet 5`);
    assert(rec.data.date === null, `date ble ${rec.data.date}, forventet null`);

    // 5x5-tavlen: den manuelle 5x5-rekorden (110) slår øktens fem sett på 100
    const fives = await b.rpc('strength_leaderboard', {
      ex_id: 'benkpress',
      min_reps: 5,
      min_sets: 5,
    });
    assertNoError(fives.error, 'B kaller strength_leaderboard (5x5)');
    const fivesA = fives.data.find((r) => r.user_id === userA.id);
    assert(
      fivesA && Number(fivesA.best_weight_kg) === 110,
      `A sin beste 5x5-vekt var ${fivesA?.best_weight_kg}, forventet 110 (manuell 5x5-rekord)`
    );

    // Venner ser rekorden med sett-antall og uten dato via shared_records_for
    const sharedView = await b.rpc('shared_records_for', { owner: userA.id });
    assertNoError(sharedView.error, 'B kaller shared_records_for');
    const sharedRec = sharedView.data.find((r) => r.id === rec.data.id);
    assert(sharedRec, 'B ser ikke den delte 5x5-rekorden');
    assert(sharedRec.sets === 5, `delt rekord hadde sets ${sharedRec.sets}, forventet 5`);
    assert(sharedRec.date === null, `delt rekord hadde date ${sharedRec.date}, forventet null`);

    // Rydd: ikke la 5x5-rekorden påvirke senere tavletester
    const del = await a.from('manual_records').delete().eq('id', rec.data.id);
    assertNoError(del.error, 'A sletter 5x5-rekorden');
  });

  // ------------------------------------------------------------ 20. løpe-ledertavle
  await test(20, 'running_leaderboard: delt løp teller; C (ikke venn) ser ingenting', async () => {
    const asB = await b.rpc('running_leaderboard', { dist_m: 5000 });
    assertNoError(asB.error, 'B kaller running_leaderboard');
    const rowA = asB.data.find((r) => r.user_id === userA.id);
    assert(rowA, 'A mangler i løpe-tavlen');
    assert(
      Number(rowA.best_sec) === 1351,
      `A sin beste tid var ${rowA.best_sec} — det skjulte løpet (1290) lekker til B`
    );
    assert(!asB.data.some((r) => r.user_id === userB.id), 'B (uten løp) skulle ikke hatt rad');

    // A ser sitt eget skjulte løp i egen tavle
    const asA = await a.rpc('running_leaderboard', { dist_m: 5000 });
    assertNoError(asA.error, 'A kaller running_leaderboard');
    const ownA = asA.data.find((r) => r.user_id === userA.id);
    assert(
      ownA && Number(ownA.best_sec) === 1290,
      `A sin egen beste tid var ${ownA?.best_sec}, forventet 1290`
    );

    // C er ikke venn med A og har ingen egne data: tavlene er tomme
    const asC = await c.rpc('strength_leaderboard', {
      ex_id: 'benkpress',
      min_reps: 1,
      min_sets: 1,
    });
    assertNoError(asC.error, 'C kaller strength_leaderboard');
    assert(asC.data.length === 0, `C skulle sett 0 rader (ikke venn), så ${asC.data.length}`);

    const asCRun = await c.rpc('running_leaderboard', { dist_m: 5000 });
    assertNoError(asCRun.error, 'C kaller running_leaderboard');
    assert(asCRun.data.length === 0, `C skulle sett 0 løpe-rader (ikke venn), så ${asCRun.data.length}`);

    const asCShared = await c.rpc('shared_runs_for', { owner: userA.id });
    assertNoError(asCShared.error, 'C kaller shared_runs_for om A');
    assert(
      asCShared.data.length === 0,
      `C (ikke venn) skulle sett 0 delte løp, så ${asCShared.data.length}`
    );

    // Rydd opp: løpene, ledertavle-øktene og ledertavle-rekordene
    const delRuns = await a.from('run_records').delete().eq('user_id', userA.id).select('id');
    assertNoError(delRuns.error, 'A sletter testløpene');
    assert(delRuns.data.length === 2, `oppryddingen traff ${delRuns.data.length} løp, forventet 2`);
    const delWorkouts = await a
      .from('workouts')
      .delete()
      .in('id', [strengthSharedWorkoutId, strengthPrivateWorkoutId])
      .select('id');
    assertNoError(delWorkouts.error, 'A sletter ledertavle-øktene');
    assert(
      delWorkouts.data.length === 2,
      `oppryddingen traff ${delWorkouts.data.length} økter, forventet 2`
    );
    const delRecords = await a
      .from('manual_records')
      .delete()
      .in('id', [leaderboardRecordId, hiddenLeaderboardRecordId])
      .select('id');
    assertNoError(delRecords.error, 'A sletter ledertavle-rekordene');
    assert(
      delRecords.data.length === 2,
      `oppryddingen traff ${delRecords.data.length} rekorder, forventet 2`
    );
  });

  // ------------------------------------------------------------ 21. vennskap fjernes
  await test(21, 'Vennskap fjernes: B sletter; B ser ikke lenger A sin delte økt', async () => {
    const del = await b
      .from('friendships')
      .delete()
      .eq('requester_id', userB.id)
      .eq('addressee_id', userA.id)
      .select();
    assertNoError(del.error, 'B sletter vennskapet');
    assert(del.data.length === 1, `slettingen traff ${del.data.length} rader, forventet 1`);

    const asB = await b.from('workouts').select('id').eq('user_id', userA.id);
    assertNoError(asB.error, 'B leser A sine økter');
    assert(asB.data.length === 0, `B skulle sett 0 økter etter brudd, så ${asB.data.length}`);
  });

  // ------------------------------------------------------------ 22. partene i et vennskap er låst
  // Kjøres ETTER at A–B-vennskapet er slettet, ellers ville pair-indeksen
  // blokkert kapringen og testen ha bestått av feil grunn.
  await test(22, 'Vennskap: mottaker kan ikke bytte parter og «akseptere» for andre', async () => {
    const req = await c.from('friendships').insert({
      requester_id: userC.id,
      addressee_id: userB.id,
    });
    assertNoError(req.error, 'C sender venneforespørsel til B');

    // B forsøker å gjøre C sin forespørsel om til et vennskap med A
    const hijack = await b
      .from('friendships')
      .update({ requester_id: userA.id, status: 'accepted' })
      .eq('requester_id', userC.id)
      .eq('addressee_id', userB.id)
      .select();
    assert(
      hijack.error || hijack.data.length === 0,
      'B klarte å bytte requester_id — vennskap kan kapres'
    );

    const rows = await b
      .from('friendships')
      .select('requester_id, status')
      .eq('addressee_id', userB.id);
    assertNoError(rows.error, 'B leser sine relasjoner');
    assert(
      rows.data.every((row) => row.requester_id === userC.id && row.status === 'pending'),
      'raden ble endret av kapringsforsøket'
    );

    const friends = await b.rpc('are_friends', { a: userA.id, b: userB.id });
    assertNoError(friends.error, 'B kaller are_friends om A');
    assert(friends.data === false, 'B ble venn med A uten A sitt samtykke');

    const seesA = await b.from('workouts').select('id').eq('user_id', userA.id);
    assertNoError(seesA.error, 'B leser A sine økter');
    assert(seesA.data.length === 0, `B ser ${seesA.data.length} av A sine økter etter kapringsforsøk`);

    // Rydd opp: B avslår forespørselen fra C
    const del = await b
      .from('friendships')
      .delete()
      .eq('requester_id', userC.id)
      .eq('addressee_id', userB.id);
    assertNoError(del.error, 'B avslår forespørselen fra C');
  });

  // ------------------------------------------------------------ 23. privat kroppsdata
  await test(23, 'profile_private: B kan ikke lese A sin høyde/vekt', async () => {
    const mine = await a
      .from('profile_private')
      .upsert({ id: userA.id, height_cm: 182, weight_kg: 82.5 })
      .select('height_cm, weight_kg')
      .single();
    assertNoError(mine.error, 'A lagrer egen kroppsdata');
    assert(Number(mine.data.height_cm) === 182, 'A sin egen høyde ble ikke lagret');

    const asB = await b.from('profile_private').select('id, height_cm').eq('id', userA.id);
    assertNoError(asB.error, 'B leser A sin kroppsdata');
    assert(asB.data.length === 0, `B skulle sett 0 rader, så ${asB.data.length}`);

    const viaSearch = await b.rpc('find_profile_by_username', { q: userA.username });
    assertNoError(viaSearch.error, 'B søker opp A');
    assert(viaSearch.data.length === 1, 'brukernavnsøket fant ikke A');
    assert(
      !('height_cm' in viaSearch.data[0]) && !('weight_kg' in viaSearch.data[0]),
      'brukernavnsøket returnerer fortsatt kroppsdata'
    );
  });
}

// ---------------------------------------------------------------- kjøring + rydding
try {
  await main();
} catch (err) {
  failCount += 1;
  console.error(`\nUventet feil utenfor testene: ${err instanceof Error ? err.message : err}`);
} finally {
  console.log('\nRydding: sletter testbrukere ...');
  for (const user of allUsers) {
    if (!user.id) continue;
    try {
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) throw error;
      console.log(`  Slettet ${user.email}`);
    } catch (err) {
      console.error(`  Klarte ikke slette ${user.email}: ${err.message ?? err}`);
    }
  }
}

const total = passCount + failCount;
console.log(`\nOppsummering: ${passCount} av ${total} PASS`);
if (failures.length > 0) {
  console.log('Feilede tester:');
  for (const f of failures) console.log(`  - ${f.label}: ${f.msg}`);
}
process.exit(failCount > 0 ? 1 : 0);
