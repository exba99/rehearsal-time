import { Fragment, type ReactNode } from "react";
import { SpeakButton } from "./SpeakButton";

function bold(text: string, key: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong> : <Fragment key={`${key}-${i}`}>{part}</Fragment>
  );
}

/** `{{English text}}` becomes a playable chip with the correct pronunciation. */
function inline(text: string): ReactNode[] {
  return text.split(/(\{\{[^}]+\}\})/g).flatMap((part, i): ReactNode[] => {
    const m = part.match(/^\{\{([^}]+)\}\}$/);
    if (!m) return bold(part, String(i));
    const say = m[1].trim();
    const long = say.split(/\s+/).length > 12;
    return [
      <span key={`s-${i}`} className={`say ${long ? "say-long" : ""}`}>
        <span className="say-text">{say}</span>
        <SpeakButton text={say} rate={say.split(/\s+/).length <= 3 ? 0.75 : 0.9} />
      </span>,
    ];
  });
}

export function Feedback({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`}>
          {list.map((li, i) => (
            <li key={i}>{inline(li)}</li>
          ))}
        </ul>
      );
      list = [];
    }
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      flush();
      blocks.push(<h4 key={`h-${blocks.length}`}>{line.replace(/^#+\s*/, "")}</h4>);
    } else if (/^[-*•]\s/.test(line)) {
      list.push(line.replace(/^[-*•]\s*/, ""));
    } else {
      flush();
      blocks.push(<p key={`p-${blocks.length}`}>{inline(line)}</p>);
    }
  }
  flush();
  return <div className="feedback">{blocks}</div>;
}
