import ReactMarkdown from "react-markdown";

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: (props) => <h1 className="mt-8 text-4xl font-bold tracking-tight text-slate-950" {...props} />,
        h2: (props) => <h2 className="mt-10 text-2xl font-bold tracking-tight text-slate-950" {...props} />,
        h3: (props) => <h3 className="mt-7 text-xl font-semibold text-slate-950" {...props} />,
        p: (props) => <p className="mt-4 max-w-3xl leading-7 text-slate-600" {...props} />,
        ul: (props) => <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-600" {...props} />,
        ol: (props) => <ol className="mt-4 list-decimal space-y-2 pl-6 text-slate-600" {...props} />,
        code: (props) => <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm text-slate-900" {...props} />,
        blockquote: (props) => <blockquote className="mt-6 border-l-4 border-indigo-500 pl-4 italic text-slate-600" {...props} />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
