import { useState } from "react";
import type { Intake, Profile, Session } from "./types/profile";
import type { ManualSections } from "./types/manual";
import type { Seed } from "./data/seeds";
import { TRIALS } from "./data/trials";
import { computeProfile } from "./scoring/computeProfile";
import { playClip, stopClip } from "./task/audio";
import Start from "./screens/Start";
import Handoff from "./screens/Handoff";
import Task from "./screens/Task";
import Return from "./screens/Return";
import Manual from "./screens/Manual";

type Screen = "start" | "handoff" | "task" | "return" | "manual";

export default function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const [childCode, setChildCode] = useState("");
  const [intake, setIntake] = useState<Intake>({ redFlag: false, homeLanguageNotSpanish: false });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [seedManual, setSeedManual] = useState<ManualSections | null>(null);

  function begin(code: string, answers: Intake) {
    // started inside the tap, so the phone allows sound for the rest of the session
    playClip("audio/ui/handoff.mp3");
    setChildCode(code);
    setIntake(answers);
    setScreen("handoff");
  }

  function finishTask(session: Session) {
    setProfile(computeProfile(session, TRIALS));
    setSeedManual(null);
    setScreen("return");
  }

  function showDemo(seed: Seed) {
    setProfile(computeProfile(seed.session, TRIALS));
    setSeedManual(seed.manual);
    setScreen("manual");
  }

  function restart() {
    stopClip();
    setProfile(null);
    setSeedManual(null);
    setChildCode("");
    setIntake({ redFlag: false, homeLanguageNotSpanish: false });
    setScreen("start");
  }

  if (screen === "handoff") return <Handoff onBegin={() => setScreen("task")} />;
  if (screen === "task") return <Task childCode={childCode} intake={intake} onFinish={finishTask} />;
  if (screen === "return") return <Return onContinue={() => setScreen("manual")} />;
  if (screen === "manual" && profile) return <Manual profile={profile} seedManual={seedManual} onRestart={restart} />;
  return <Start onBegin={begin} onDemo={showDemo} />;
}
