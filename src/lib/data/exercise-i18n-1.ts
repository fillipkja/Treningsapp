// Engelske instruksjoner/tips for øvelser (id a–k). Fylles per øvelses-id.
export const exerciseTextEn1: Record<string, { instructions: string[]; tips?: string[] }> = {
  'abduksjon-maskin': {
    instructions: [
      'Sit in the machine with your knees against the pads.',
      'Push your knees apart against the resistance.',
      'Bring them back together under control.',
    ],
    tips: ['Lean slightly forward to shift more of the work to the upper glutes.'],
  },
  airbike: {
    instructions: [
      'Adjust the seat and grab the handles.',
      'Pedal while pushing and pulling with your arms at the same time.',
      'Ride intervals or hold a steady pace.',
    ],
    tips: ['Brutally effective for short, hard intervals.'],
  },
  ankelmobilisering: {
    instructions: [
      'Set up in a lunge with your front foot about a hand-width from the wall.',
      'Drive your knee toward the wall without letting the heel lift.',
      'Repeat slowly, then switch sides.',
    ],
    tips: ['Good ankle mobility is the key to a deep squat.'],
  },
  'arnold-press': {
    instructions: [
      'Start with the dumbbells in front of your shoulders, palms facing you.',
      'Rotate your palms outward as you press up.',
      'Finish with arms locked out and palms facing forward.',
      'Reverse the movement on the way down.',
    ],
    tips: ['The rotation hits both the front and side delts.'],
  },
  'barnets-stilling': {
    instructions: [
      'Kneel and sit your hips back onto your heels.',
      'Reach your arms forward and lower your forehead toward the floor.',
      'Breathe slowly and let your back relax.',
    ],
    tips: ['A great rest position between heavy sets.'],
  },
  beinpress: {
    instructions: [
      'Place your feet shoulder-width apart in the middle of the platform.',
      'Lower the weight under control until your knees reach about 90 degrees.',
      'Press back up without fully locking out your knees.',
    ],
    tips: ['Do not let your lower back curl off the pad at the bottom.'],
  },
  beinspark: {
    instructions: [
      'Sit with the ankle pad against your lower shins.',
      'Extend your legs all the way out.',
      'Lower back under control.',
    ],
    tips: ['Squeeze your quads hard at the top for a brief moment.'],
  },
  benkpress: {
    instructions: [
      'Lie on the bench with your feet planted firmly on the floor and a slight arch in your lower back.',
      'Grip the bar slightly wider than shoulder width and unrack it.',
      'Lower the bar under control to your chest.',
      'Press the bar straight up until your arms are locked out.',
    ],
    tips: ['Keep your shoulder blades pinched together and pulled down throughout the lift.'],
  },
  'benkpress-manualer': {
    instructions: [
      'Lie on the bench with a dumbbell in each hand held over your chest.',
      'Lower the dumbbells under control to the sides of your chest.',
      'Press them back up until your arms are nearly locked out.',
    ],
    tips: ['Let the dumbbells touch lightly at the top for a full contraction.'],
  },
  'benkpress-smith': {
    instructions: [
      'Position the bench so the bar lines up with the middle of your chest.',
      'Rotate the bar out of the hooks and lower it under control to your chest.',
      'Press straight up, and re-hook the bar when the set is done.',
    ],
    tips: ['A great option for pushing close to failure without a spotter.'],
  },
  'bicepscurl-kabel': {
    instructions: [
      'Set the pulley low and grip the bar with an underhand grip.',
      'Curl the bar up toward your shoulders.',
      'Lower back under control.',
    ],
    tips: ['The cable keeps tension on the biceps even at the bottom of the rep.'],
  },
  'bicepscurl-manualer': {
    instructions: [
      'Stand with a dumbbell in each hand, palms facing forward.',
      'Curl the dumbbells up toward your shoulders.',
      'Lower under control back to straight arms.',
    ],
    tips: ['Alternating arms often gives you better control.'],
  },
  'bicepscurl-maskin': {
    instructions: [
      'Adjust the seat so your elbows line up with the machine pivot.',
      'Curl the handles up toward your shoulders.',
      'Lower back under control.',
    ],
    tips: ['A great finisher when your arms are already fatigued.'],
  },
  'bicepscurl-stang': {
    instructions: [
      'Stand holding the bar with an underhand, shoulder-width grip.',
      'Curl the bar up toward your shoulders without letting your elbows drift.',
      'Lower under control back to straight arms.',
    ],
    tips: ['Keep your elbows pinned to your sides — no swinging from the hips.'],
  },
  'bicepscurl-strikk': {
    instructions: [
      'Stand on the middle of the band with a handle in each hand.',
      'Curl your hands up toward your shoulders.',
      'Lower back under control.',
    ],
    tips: ['The resistance builds toward the top — squeeze extra hard there.'],
  },
  bondegang: {
    instructions: [
      'Pick up a heavy dumbbell in each hand.',
      'Walk tall with your posture upright and shoulders braced.',
      'Continue for a set distance or time, then set the weights down carefully.',
    ],
    tips: ['Take short, quick steps and keep your eyes forward.'],
  },
  'brede-pushups': {
    instructions: [
      'Place your hands well wider than shoulder width.',
      'Lower your chest to the floor under control.',
      'Press back up without slamming your elbows into lockout.',
    ],
    tips: ['A wider hand position shifts the work toward the chest and away from the triceps.'],
  },
  'brystpress-maskin': {
    instructions: [
      'Adjust the seat so the handles line up with mid-chest.',
      'Press the handles forward until your arms are nearly locked out.',
      'Return under control without letting the stack touch down.',
    ],
    tips: ['Keep your shoulders down and your back against the pad.'],
  },
  'brystpress-strikk': {
    instructions: [
      'Anchor the band behind you at chest height and take a handle in each hand.',
      'Stagger your stance and press your hands forward to full extension.',
      'Return under control.',
    ],
    tips: ['Step further forward for more resistance.'],
  },
  'bryststottet-roing-manualer': {
    instructions: [
      'Lie chest-down on an incline bench with a dumbbell in each hand.',
      'Row the dumbbells up toward your hips.',
      'Squeeze your shoulder blades together at the top, then lower under control.',
    ],
    tips: ['The bench support removes cheating — perfect for strict technique.'],
  },
  'brysttoyning-dorkarm': {
    instructions: [
      'Place your forearm against a doorframe with your elbow at shoulder height.',
      'Lean gently forward until you feel a stretch across your chest.',
      'Hold, then switch sides.',
    ],
    tips: ['Vary the elbow height to target different parts of the chest.'],
  },
  'bulgarske-utfall': {
    instructions: [
      'Place your rear foot on a bench behind you.',
      'Lower straight down until your front thigh is parallel to the floor.',
      'Drive back up through your front foot.',
    ],
    tips: ['Notorious and brutally effective — start with bodyweight only.'],
  },
  burpees: {
    instructions: [
      'Put your hands on the floor and jump your feet back into a push-up position.',
      'Do a push-up, then jump your feet back in.',
      'Finish with a jump, reaching your hands overhead.',
    ],
    tips: ['Find a pace you can sustain — do not sprint the first ten.'],
  },
  chins: {
    instructions: [
      'Hang from the bar with an underhand, shoulder-width grip.',
      'Pull yourself up until your chin clears the bar.',
      'Lower under control back to a full hang.',
    ],
    tips: ['The underhand grip brings in more biceps than pull-ups do.'],
  },
  'crunch-maskin': {
    instructions: [
      'Sit in the machine and grip the handles.',
      'Crunch your torso forward toward your knees.',
      'Return under control.',
    ],
    tips: ['The machine lets you progressively load your abs over time.'],
  },
  crunches: {
    instructions: [
      'Lie on your back with your knees bent.',
      'Lift your shoulder blades off the floor by curling through your abs.',
      'Lower back under control.',
    ],
    tips: ['It is a short movement — think about pressing your lower back into the floor.'],
  },
  'dead-bug': {
    instructions: [
      'Lie on your back with your arms pointing straight up and knees stacked over your hips.',
      'Slowly lower your opposite arm and leg toward the floor.',
      'Return to the start and switch sides.',
    ],
    tips: ['Press your lower back into the floor for the entire exercise.'],
  },
  'dead-hang': {
    instructions: [
      'Grab the pull-up bar with an overhand grip.',
      'Hang with straight arms and relaxed shoulders.',
      'Hold for as long as you can maintain a solid grip.',
    ],
    tips: ['Builds grip strength and stretches out the shoulders at the same time.'],
  },
  'diamant-pushups': {
    instructions: [
      'Form a diamond with your thumbs and index fingers under your chest.',
      'Lower your chest to your hands with your elbows tucked in.',
      'Press back up.',
    ],
    tips: ['One of the toughest push-up variations for the triceps.'],
  },
  dips: {
    instructions: [
      'Support yourself on the dip bars with straight arms.',
      'Lean slightly forward and lower until your elbows reach about 90 degrees.',
      'Press back up to full lockout.',
    ],
    tips: ['More forward lean targets the chest; staying upright targets the triceps.'],
  },
  'dips-benk': {
    instructions: [
      'Place your hands on the edge of a bench with your legs straight out in front of you.',
      'Lower your hips until your elbows reach about 90 degrees.',
      'Press back up to straight arms.',
    ],
    tips: ['Add weight to your lap for more resistance.'],
  },
  duestilling: {
    instructions: [
      'Bring one leg forward with the knee bent and extend the other leg behind you.',
      'Lower your hips toward the floor, keeping your torso upright.',
      'Lean forward for a deeper stretch if you like, then switch sides.',
    ],
    tips: ['One of the best stretches for tight glutes.'],
  },
  ellipsemaskin: {
    instructions: [
      'Stand with your whole foot on the pedals and grab the handles.',
      'Move your arms and legs in a smooth, gliding rhythm.',
      'Adjust the resistance to match your target intensity.',
    ],
    tips: ['Easy on the joints — a good choice for lighter days.'],
  },
  'enarms-kabelroing': {
    instructions: [
      'Set the pulley low and grip the handle with one hand.',
      'Row the handle to the side of your waist.',
      'Return under control, letting your lat stretch fully.',
    ],
    tips: ['Stay planted and avoid rotating your torso.'],
  },
  'enarms-roing-manualer': {
    instructions: [
      'Support one knee and hand on a bench, keeping your back flat.',
      'Let the dumbbell hang at arm’s length.',
      'Row the dumbbell up toward your hip.',
      'Lower under control.',
    ],
    tips: ['Drive your elbow close to your body, not out to the side.'],
  },
  'enbeins-rumensk-markloft': {
    instructions: [
      'Stand on one leg with a dumbbell in the opposite hand.',
      'Hinge your torso forward as your rear leg extends behind you.',
      'Pull yourself back up to standing.',
    ],
    tips: ['It challenges your balance — fix your eyes on a spot on the floor.'],
  },
  'enbeins-setebro': {
    instructions: [
      'Lie on your back with one knee bent and the other leg pointing straight up.',
      'Drive your hips up using one leg.',
      'Lower under control, and switch sides after the set.',
    ],
    tips: ['Keep your hips level — no tilting to the side.'],
  },
  'enbeins-taahev': {
    instructions: [
      'Stand on one leg with the ball of your foot on an edge.',
      'Lower your heel for a full stretch.',
      'Rise up onto your toes, and finish your reps before switching legs.',
    ],
    tips: ['Slow tempo and a full range of motion beat heavy, short reps.'],
  },
  ergometersykkel: {
    instructions: [
      'Adjust the seat height so your knee stays slightly bent at the bottom of the pedal stroke.',
      'Ride at a steady pace or do intervals.',
      'Keep your upper body relaxed.',
    ],
    tips: ['Easy on the knees — great for a recovery session.'],
  },
  eselspark: {
    instructions: [
      'Start on all fours with a flat back.',
      'Kick one bent leg up toward the ceiling, leading with the heel.',
      'Lower under control and repeat before switching sides.',
    ],
    tips: ['Keep your back still — the movement comes from the hip.'],
  },
  'ez-curl': {
    instructions: [
      'Grip the EZ bar on the angled sections.',
      'Curl the bar up toward your shoulders.',
      'Lower back under control.',
    ],
    tips: ['The angled grip is easier on the wrists than a straight bar.'],
  },
  'face-pull': {
    instructions: [
      'Set the pulley at face height with a rope attachment.',
      'Pull the rope toward your face while spreading the ends apart.',
      'Return under control.',
    ],
    tips: ['Gold for shoulder health — aim your elbows high and back.'],
  },
  fjellklatrere: {
    instructions: [
      'Start in a push-up position.',
      'Drive one knee quickly toward your chest.',
      'Switch legs in a steady, running rhythm.',
    ],
    tips: ['Keep your hips low and your shoulders stacked over your hands.'],
  },
  'flyes-manualer': {
    instructions: [
      'Lie on the bench with the dumbbells directly over your chest and a slight bend in your elbows.',
      'Lower your arms out to the sides in an arc until you feel a stretch across your chest.',
      'Bring the dumbbells back up along the same arc.',
    ],
    tips: ['Keep the same elbow angle throughout — do not turn it into a press.'],
  },
  'fransk-press': {
    instructions: [
      'Lie on a bench holding an EZ bar at arm’s length over your chest.',
      'Bend your elbows and lower the bar toward your forehead.',
      'Extend your arms back to the start.',
    ],
    tips: ['Keep your upper arms vertical and completely still for the whole set.'],
  },
  frivending: {
    instructions: [
      'Start with the bar on the floor, set up as for a deadlift.',
      'Pull the bar explosively up along your body.',
      'Snap your hips forward, drop under the bar, and catch it on your front shoulders.',
      'Stand up, then lower the bar under control.',
    ],
    tips: ['Technically demanding — learn the movement with an empty bar first.'],
  },
  frontboy: {
    instructions: [
      'Rest the bar on your front shoulders with your elbows high.',
      'Squat down while keeping your torso upright.',
      'Drive back up without letting your elbows drop.',
    ],
    tips: ['Requires wrist mobility — a cross-arm grip is a solid alternative.'],
  },
  'fronthev-manualer': {
    instructions: [
      'Stand with the dumbbells in front of your thighs.',
      'Raise one or both arms straight out in front to shoulder height.',
      'Lower back under control.',
    ],
    tips: ['Avoid swinging with your torso.'],
  },
  'fronthev-skive': {
    instructions: [
      'Hold a weight plate with both hands in front of your thighs.',
      'Raise the plate with straight arms to shoulder height or slightly above.',
      'Lower back under control.',
    ],
    tips: ['Brace your core and stand completely still.'],
  },
  fuglehund: {
    instructions: [
      'Start on all fours with a flat back.',
      'Slowly extend your opposite arm and leg.',
      'Hold for a couple of seconds, then switch sides.',
    ],
    tips: ['Think long neck and quiet hips — no rocking.'],
  },
  'gaaende-utfall': {
    instructions: [
      'Hold a dumbbell in each hand.',
      'Take a long step forward and lower your back knee toward the floor.',
      'Drive up and step straight into the next lunge.',
    ],
    tips: ['Keep a steady rhythm — do not pause between steps.'],
  },
  'glute-ham-raise': {
    instructions: [
      'Lock your feet into the GHD with your thighs on the pad.',
      'Lower your torso under control toward the floor.',
      'Curl yourself back up using your hamstrings.',
    ],
    tips: ['Push off with your hands if you cannot complete a full rep yet.'],
  },
  'goblet-squat': {
    instructions: [
      'Hold the kettlebell with both hands in front of your chest.',
      'Squat down deep, keeping your torso upright.',
      'Drive back up through your whole foot.',
    ],
    tips: ['Perfect for learning solid squat technique.'],
  },
  'god-morgen': {
    instructions: [
      'Rest the bar across your upper back as in a squat.',
      'Push your hips back and hinge your torso forward with a flat back.',
      'Stand back up by driving your hips through.',
    ],
    tips: ['Start light — the technique has to be dialed in before the weight goes up.'],
  },
  'gulvpress-stang': {
    instructions: [
      'Lie on the floor under a rack and grip the bar as you would for a bench press.',
      'Lower the bar until your upper arms rest lightly on the floor.',
      'Press the bar back up to lockout.',
    ],
    tips: ['A brief pause when your upper arms touch the floor adds extra triceps work.'],
  },
  haandgriper: {
    instructions: [
      'Hold the gripper in your palm with your fingers wrapped around the handle.',
      'Squeeze it fully closed.',
      'Release back under control.',
    ],
    tips: ['Train both hands equally.'],
  },
  'haandleddscurl-manualer': {
    instructions: [
      'Sit with your forearm on your thigh, holding the dumbbell with an underhand grip.',
      'Curl your wrist up as high as you can.',
      'Lower back under control.',
    ],
    tips: ['One arm at a time gives you a better mind-muscle connection.'],
  },
  'haandleddscurl-stang': {
    instructions: [
      'Sit with your forearms on your thighs, holding the bar with an underhand grip.',
      'Let the bar roll down toward your fingers.',
      'Curl your wrists up as high as you can.',
    ],
    tips: ['Use light weight and high reps.'],
  },
  'hack-squat': {
    instructions: [
      'Position yourself in the machine with your shoulders under the pads.',
      'Lower under control into a deep squat.',
      'Drive back up through your whole foot.',
    ],
    tips: ['A lower foot placement shifts more work to the quads.'],
  },
  hammercurl: {
    instructions: [
      'Hold the dumbbells with your palms facing each other.',
      'Curl up toward your shoulders without rotating your wrists.',
      'Lower back under control.',
    ],
    tips: ['The neutral grip gives your forearms extra work.'],
  },
  'hamstrings-toyning': {
    instructions: [
      'Rest one straight leg on a low bench, or sit with it extended in front of you.',
      'Lean forward from the hips with a flat back.',
      'Hold the stretch in the back of your thigh, then switch sides.',
    ],
    tips: ['Hinge from the hips — do not round your back.'],
  },
  'handstand-pushups': {
    instructions: [
      'Kick up into a handstand against a wall.',
      'Lower your head toward the floor under control.',
      'Press back up to straight arms.',
    ],
    tips: ['Master pike push-ups before attempting this one.'],
  },
  'hengende-beinhev': {
    instructions: [
      'Hang from the pull-up bar with straight arms.',
      'Raise your straight legs to horizontal or higher.',
      'Lower under control without swinging.',
    ],
    tips: ['Tilt your pelvis back at the top for full ab engagement.'],
  },
  'hengende-knehev': {
    instructions: [
      'Hang from the pull-up bar with straight arms.',
      'Pull your knees up toward your chest.',
      'Lower back under control.',
    ],
    tips: ['An easier version of the hanging leg raise — the same control applies.'],
  },
  'hip-thrust': {
    instructions: [
      'Sit with your upper back against a bench and the bar across your hips.',
      'Drive your hips up until your body is straight from knees to shoulders.',
      'Squeeze your glutes hard at the top, then lower under control.',
    ],
    tips: ['Chin tucked and eyes forward — do not hyperextend your lower back.', 'Use a pad on the bar.'],
  },
  'hip-thrust-maskin': {
    instructions: [
      'Set up in the machine with the belt or pad across your hips.',
      'Drive your hips up to full extension.',
      'Lower back under control.',
    ],
    tips: ['Quicker to load up than the free-weight version.'],
  },
  'hofteboyer-toyning': {
    instructions: [
      'Set up in a lunge position with your back knee on the floor.',
      'Squeeze your glutes and push your hips forward.',
      'Hold the stretch in the front of your hip, then switch sides.',
    ],
    tips: ['Grab your back ankle to bring the quads into the stretch.'],
  },
  'hollow-hold': {
    instructions: [
      'Lie on your back and lift your shoulders and straight legs slightly off the floor.',
      'Reach your arms back behind your head.',
      'Hold the position with your lower back pressed into the floor.',
    ],
    tips: ['Bend your knees or keep your arms at your sides for an easier version.'],
  },
  hopptau: {
    instructions: [
      'Hold the handles low by your hips.',
      'Jump low on the balls of your feet, keeping your wrists relaxed.',
      'Find a steady rhythm and build up the duration gradually.',
    ],
    tips: ['Small jumps — the rope only needs a few centimeters of clearance.'],
  },
  'jumping-jacks': {
    instructions: [
      'Stand with your feet together and arms at your sides.',
      'Jump your feet out while raising your arms overhead.',
      'Jump back to the start in a steady rhythm.',
    ],
    tips: ['A great heart-rate raiser during the warm-up.'],
  },
  kabelcrunch: {
    instructions: [
      'Kneel in front of a high pulley with the rope held behind your head.',
      'Crunch your torso down toward the floor using your abs.',
      'Return under control.',
    ],
    tips: ['Your hips should stay still — the movement comes from flexing your spine.'],
  },
  kabelkryss: {
    instructions: [
      'Set the pulleys high and take a handle in each hand.',
      'Stagger your stance and lean your torso slightly forward.',
      'Bring your hands down and together in front of your body in an arc.',
      'Return under control until you feel a stretch across your chest.',
    ],
    tips: ['Let your hands cross slightly for an extra contraction.'],
  },
  'kabelkryss-lav': {
    instructions: [
      'Set the pulleys low and grip a handle in each hand.',
      'Sweep your hands up and together in front of your chest.',
      'Lower back to the start under control.',
    ],
    tips: ['Targets the upper chest — keep a slight bend in your elbows throughout.'],
  },
  'katt-ku': {
    instructions: [
      'Start on all fours with your hands under your shoulders.',
      'Round your back up like a cat as you exhale.',
      'Arch your back down and lift your gaze as you inhale.',
    ],
    tips: ['Let your breath set the tempo.'],
  },
  'kettlebell-clean-press': {
    instructions: [
      'Swing the kettlebell up into the rack position at your shoulder.',
      'Press it overhead to a locked-out arm.',
      'Lower to the rack, then back down to the start.',
    ],
    tips: ['Let the kettlebell roll around your wrist — do not let it slam.'],
  },
  'kettlebell-press': {
    instructions: [
      'Hold the kettlebell in the rack position at your shoulder.',
      'Press it straight up to a locked-out arm.',
      'Lower under control back to the rack.',
    ],
    tips: ['Brace your core to avoid leaning to the side.'],
  },
  'kettlebell-roing': {
    instructions: [
      'Hinge at the hips with a flat back and let the kettlebell hang from one hand.',
      'Row the kettlebell up toward your hip.',
      'Lower under control.',
    ],
    tips: ['Keep your hips still — no rotation.'],
  },
  'kettlebell-swing': {
    instructions: [
      'Stand shoulder-width apart with the kettlebell between your legs.',
      'Hike it back between your thighs with a hip hinge.',
      'Drive your hips forward explosively so the kettlebell swings up to chest height.',
    ],
    tips: ['It is a hip snap, not a shoulder lift.'],
  },
  'kickbacks-manualer': {
    instructions: [
      'Hinge at the hips with a flat back and your upper arm parallel to the floor.',
      'Extend your arm straight back until it is fully locked out.',
      'Lower under control back to 90 degrees.',
    ],
    tips: ['Squeeze hard at the top — a light weight goes a long way.'],
  },
  kneboy: {
    instructions: [
      'Set the bar across your upper back and lift it out of the rack.',
      'Stand shoulder-width apart with your toes turned slightly out.',
      'Squat down until your hips drop below knee height, keeping your chest up.',
      'Drive back up through your whole foot.',
    ],
    tips: ['Track your knees in line with your toes.', 'Take a breath and brace your core before every rep.'],
  },
  'kneboy-strikk': {
    instructions: [
      'Stand on the band and loop it over your shoulders, or hold it in your hands.',
      'Squat down.',
      'Drive up against the band’s resistance.',
    ],
    tips: ['A mini band above the knees adds extra glute activation.'],
  },
  kobra: {
    instructions: [
      'Lie face down with your hands under your shoulders.',
      'Press your upper body up while keeping your hips on the floor.',
      'Hold with an open chest and slow, steady breathing.',
    ],
    tips: ['Only go as high as your lower back is comfortable with.'],
  },
  konsentrasjonscurl: {
    instructions: [
      'Sit on a bench with your elbow braced against the inside of your thigh.',
      'Curl the dumbbell slowly up toward your shoulder.',
      'Lower back under control.',
    ],
    tips: ['Zero swing — pure biceps isolation.'],
  },
};
