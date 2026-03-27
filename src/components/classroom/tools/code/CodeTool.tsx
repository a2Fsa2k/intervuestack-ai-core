import { useState } from "react";
import { Editor } from "@monaco-editor/react";
import { ChevronUp, Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolComponentProps } from "../core/ToolTypes";

const SUPPORTED_LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" }
] as const;

type Language = (typeof SUPPORTED_LANGUAGES)[number]["value"];

const TERMINAL_EXPANDED_HEIGHT = 200;
const TERMINAL_COLLAPSED_HEIGHT = 40;
const STARTER_CODE: Record<Language, string> = {
  javascript: "// JavaScript\nconsole.log('Hello, world!');\n",
  python: "# Python\nprint('Hello, world!')\n",
  java: "public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Hello, world!\");\n  }\n}\n",
  cpp: "#include <iostream>\n\nint main() {\n  std::cout << \"Hello, world!\" << std::endl;\n  return 0;\n}\n",
  c: "#include <stdio.h>\n\nint main(void) {\n  printf(\"Hello, world!\\n\");\n  return 0;\n}\n"
};
const LANGUAGE_FILE_EXTENSIONS: Record<Language, string> = {
  javascript: "js",
  python: "py",
  java: "java",
  cpp: "cpp",
  c: "c"
};

export function CodeTool({ isActive }: ToolComponentProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("javascript");
  const [code, setCode] = useState(STARTER_CODE.javascript);
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(true);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    if (!isTerminalExpanded) {
      setIsTerminalExpanded(true);
    }

    if (!code.trim()) {
      setTerminalOutput("⚠️  No code to execute. Please write some code first.");
      return;
    }

    setRunning(true);
    setTerminalOutput("🔄 Executing code...\n");
    await new Promise((resolve) => setTimeout(resolve, 450));
    setTerminalOutput(
      `✅ Local run simulation\nLanguage: ${selectedLanguage}\nCharacters: ${code.length}\n\n(Execution endpoint not wired in this classroom)`
    );
    setRunning(false);
  };

  return (
    <div className={isActive ? "h-full w-full flex flex-col bg-[#0a0a0a] text-gray-200" : "hidden"}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a1a1a] bg-[#0f0f0f]">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Language :</span>
          <select
            value={selectedLanguage}
            onChange={(e) => {
              const nextLanguage = e.target.value as Language;
              setSelectedLanguage(nextLanguage);
              setCode(STARTER_CODE[nextLanguage]);
              setTerminalOutput("");
            }}
            className="px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-sm text-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleRun}
          disabled={running}
          className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run
            </>
          )}
        </button>
      </div>

      <div
        className="flex-1 relative overflow-hidden"
        style={{
          height: isTerminalExpanded
            ? `calc(100% - ${TERMINAL_EXPANDED_HEIGHT}px - 40px)`
            : `calc(100% - ${TERMINAL_COLLAPSED_HEIGHT}px - 40px)`
        }}
      >
        <Editor
          key={selectedLanguage}
          path={`file:///main.${LANGUAGE_FILE_EXTENSIONS[selectedLanguage]}`}
          height="100%"
          width="100%"
          theme="vs-dark"
          language={selectedLanguage}
          value={code}
          onChange={(value) => setCode(value ?? "")}
          loading={
            <div className="h-full w-full flex items-center justify-center bg-[#0a0a0a]">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 mx-auto border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Loading editor...</p>
              </div>
            </div>
          }
          options={{
            tabSize: 2,
            fontSize: 14,
            minimap: { enabled: true },
            wordWrap: "on",
            automaticLayout: true,
            scrollBeyondLastLine: false,
            padding: { top: 20 }
          }}
        />
      </div>

      <div
        className="border-t border-[#1a1a1a] bg-[#0f0f0f] transition-all duration-300 ease-in-out"
        style={{
          height: isTerminalExpanded ? `${TERMINAL_EXPANDED_HEIGHT}px` : `${TERMINAL_COLLAPSED_HEIGHT}px`
        }}
      >
        <div className="flex items-center justify-between px-4 h-10 border-b border-[#1a1a1a] bg-[#0f0f0f]">
          <span className="text-xs text-gray-400 font-medium">Terminal</span>
          <button
            onClick={() => setIsTerminalExpanded((prev) => !prev)}
            className="p-1 hover:bg-[#1a1a1a] rounded transition-colors"
            aria-label={isTerminalExpanded ? "Collapse terminal" : "Expand terminal"}
          >
            <ChevronUp
              className={cn(
                "w-4 h-4 text-gray-400 transition-transform",
                isTerminalExpanded ? "rotate-0" : "rotate-180"
              )}
            />
          </button>
        </div>

        {isTerminalExpanded && (
          <div className="h-[calc(100%-40px)] p-4 bg-[#0a0a0a] font-mono text-sm text-gray-300 overflow-auto">
            {terminalOutput ? (
              <pre className="whitespace-pre-wrap break-words">{terminalOutput}</pre>
            ) : (
              <div className="space-y-1">
                <div className="text-gray-500">
                  <span className="text-emerald-400">$</span> Ready to execute code...
                </div>
                <div className="text-gray-600 text-xs mt-2">
                  Click the "Run" button to execute your code
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
