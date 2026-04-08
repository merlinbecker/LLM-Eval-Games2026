export interface CommentaryEvent {
  id: number;
  timestamp: number;
  type: "start" | "response" | "leader_change" | "speed_record" | "finish" | "progress";
  modelName?: string;
  message: string;
  highlight?: boolean;
}