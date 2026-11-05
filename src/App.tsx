import { useState } from "react";
import type { Intake, Profile, Session } from "./types/profile";
import { NO_CONTEXT, type Context } from "./generation/context";
import type { ManualSections } from "./types/manual";
import type { Seed } from "./data/seeds";
import { DEFAULT_ANIMALS, completeAnimalSet, type Animal } from "./data/animals";
import { createAnimalTrials } from "./data/trials";
import { computeProfile } from "./scoring/computeProfile";
import { stopClip } from "./task/audio";
import Start from "./screens/Start";
import Handoff from "./screens/Handoff";
import Tutorial from "./screens/Tutorial";
import Task from "./screens/Task";
import Return from "./screens/Return";
import Manual from "./screens/Manual";

type Screen = "start" | "handoff" | "tutorial" | "task" | "return" | "manual";

export default function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const [childCode, setChildCode] = useState("");
  const [intake, setIntake] = useState<Intake>({ redFlag: false, homeLanguageNotSpanish: false });
  const [situations, setSituations] = useState<Context>(NO_CONTEXT);
  const [observation, setObservation] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [seedManual, setSeedManual] = useState<ManualSections | null>(null);
  const [animals, setAnimals] = useState<Animal[]>(DEFAULT_ANIMALS);
  const trials = createAnimalTrials(animals);

  function begin(code: string, answers: Intake, context: Context, favoriteIds: string[]) {
    const selectedAnimals = completeAnimalSet(favoriteIds);
    setAnimals(selectedAnimals);
    setChildCode(code);
    setIntake(answers);
    setSituations(context);
    setScreen("handoff");
  }

  function finishTask(session: Session) {
    setProfile(computeProfile(session, trials));
    setSeedManual(null);
    setScreen("return");
  }

  function continueToManual(note: string) {
    setObservation(note);
    setScreen("manual");
  }

  function showDemo(seed: Seed) {
    setAnimals(DEFAULT_ANIMALS);
    setProfile(computeProfile(seed.session, createAnimalTrials(DEFAULT_ANIMALS)));
    setSeedManual(seed.manual);
    setScreen("manual");
  }

  function restart() {
    stopClip();
    setProfile(null);
    setSeedManual(null);
    setChildCode("");
    setSituations(NO_CONTEXT);
    setObservation("");
    setIntake({ redFlag: false, homeLanguageNotSpanish: false });
    setAnimals(DEFAULT_ANIMALS);
    setScreen("start");
  }

  if (screen === "handoff") return <Handoff onBegin={() => setScreen("tutorial")} />;
  if (screen === "tutorial") return <Tutorial animals={animals} onFinish={() => setScreen("task")} />;
  if (screen === "task") return <Task childCode={childCode} intake={intake} animals={animals} onFinish={finishTask} />;
  if (screen === "return") return <Return onContinue={continueToManual} />;
  if (screen === "manual" && profile)
    return (
      <Manual
        profile={profile}
        seedManual={seedManual}
        situations={situations}
        observation={observation}
        trials={seedManual ? createAnimalTrials(DEFAULT_ANIMALS) : trials}
        onRestart={restart}
      />
    );
  return <Start onBegin={begin} onDemo={showDemo} />;
}
