import { useContext } from "react";
import { TalkContext, type TalkContextValue } from "../context/talk-context";

export function useTalk(): TalkContextValue {
  const context = useContext(TalkContext);
  if (!context) {
    throw new Error("useTalk must be used within a TalkProvider");
  }
  return context;
}
