import { Fragment, type ReactNode } from "react";

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>
  );
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
