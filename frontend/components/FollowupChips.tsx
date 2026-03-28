"use client";

const questions = ["Why is it important?", "When was it built?", "Tell me more"];

type FollowupChipsProps = {
  onPick: (value: string) => void;
};

export function FollowupChips({ onPick }: FollowupChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
      {questions.map((question) => (
        <button
          key={question}
          type="button"
          onClick={() => onPick(question)}
          className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-mist/80 transition hover:border-cyan/30 hover:text-white"
        >
          {question}
        </button>
      ))}
    </div>
  );
}
