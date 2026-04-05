import type { CompetitionResult } from "@workspace/api-client-react";
import { formatMs, shortName } from "@/lib/utils";
import type { CommentaryEvent } from "./types";

export function generateResponseCommentary(
  model: CompetitionResult,
  itemIndex: number,
  totalItems: number,
  allResults: CompetitionResult[],
): CommentaryEvent[] {
  const events: CommentaryEvent[] = [];
  const name = shortName(model.modelName);
  const response = model.responses[itemIndex];
  if (!response) {
    return events;
  }

  const duration = response.durationMs;
  const otherTimes = allResults
    .filter((result) => result.modelId !== model.modelId)
    .map((result) => ({
      name: shortName(result.modelName),
      time: result.responses[itemIndex]?.durationMs,
    }))
    .filter((timeEntry) => timeEntry.time != null && timeEntry.time > 0);

  const fastest = otherTimes.length > 0 ? Math.min(...otherTimes.map((entry) => entry.time!)) : null;
  const slowest = otherTimes.length > 0 ? Math.max(...otherTimes.map((entry) => entry.time!)) : null;

  const commentaryOptions = [
    `${name} antwortet auf Item #${itemIndex + 1} in ${formatMs(duration)}!`,
    `${name} feuert los — ${formatMs(duration)} für Aufgabe #${itemIndex + 1}!`,
    `Antwort #${itemIndex + 1} von ${name}: ${formatMs(duration)} auf der Uhr!`,
    `${name} liefert ab! ${formatMs(duration)} für Item #${itemIndex + 1}!`,
  ];
  let message = commentaryOptions[Math.floor(Math.random() * commentaryOptions.length)];

  let highlight = false;
  if (fastest !== null && duration < fastest) {
    const diff = fastest - duration;
    message += ` >> BLITZSCHNELL — ${formatMs(diff)} schneller als die Konkurrenz!`;
    highlight = true;
  } else if (slowest !== null && duration > slowest * 1.5) {
    message += " .. Braucht etwas länger hier...";
  } else if (fastest !== null && duration < fastest * 1.1) {
    message += " Kopf-an-Kopf-Rennen bei den Zeiten!";
  }

  if (response.judgeScores.length > 0) {
    const avgScore =
      response.judgeScores.reduce((score, judge) => score + judge.score, 0) /
      response.judgeScores.length;
    if (avgScore >= 9) {
      message += ` ** WELTKLASSE-Bewertung: ${avgScore.toFixed(1)}/10!`;
      highlight = true;
    } else if (avgScore >= 7) {
      message += ` Solide ${avgScore.toFixed(1)}/10 von den Judges.`;
    } else if (avgScore < 4) {
      message += ` Nur ${avgScore.toFixed(1)}/10 — das tut weh!`;
    }
  }

  events.push({
    id: Date.now() + Math.random(),
    timestamp: Date.now(),
    type: "response",
    modelName: model.modelName,
    message,
    highlight,
  });

  return events;
}

export function generateLeaderChangeCommentary(
  prevLeader: string | null,
  newLeader: string,
  score: number,
): CommentaryEvent | null {
  if (prevLeader === newLeader) {
    return null;
  }

  const name = shortName(newLeader);
  const messages = prevLeader
    ? [
        `>>> FÜHRUNGSWECHSEL! ${name} übernimmt die Spitze mit ${score.toFixed(1)}/10!`,
        `SENSATION! ${name} verdrängt ${shortName(prevLeader)} von Platz 1!`,
        `${name} setzt sich an die Spitze! Neuer Schnitt: ${score.toFixed(1)}/10!`,
      ]
    : [`${name} geht als Erste:r in Führung mit ${score.toFixed(1)}/10!`];

  return {
    id: Date.now() + Math.random(),
    timestamp: Date.now(),
    type: "leader_change",
    modelName: newLeader,
    message: messages[Math.floor(Math.random() * messages.length)],
    highlight: true,
  };
}